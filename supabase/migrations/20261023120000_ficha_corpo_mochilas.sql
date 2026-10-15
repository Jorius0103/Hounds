-- ============================================================
-- 15 · FICHA › EQUIPAMENTOS, CORPO E MOCHILAS
-- A aba Equip. da ficha (js/tabs/ficha-equipamentos.js) passa a ter
-- três partes:
--   equip:  a lista de tudo o que o personagem tem. Cada linha ganha
--           um id fixo (os vínculos abaixo apontam para ele), o tipo
--           (item, armor, weapon) e a entrada do catálogo de onde
--           veio (refId). A lista sozinha não entra na carga.
--   bodies: configurações de corpo (com nome); cada uma liga linhas da
--           lista às partes do corpo do GURPS. No máximo uma em uso.
--   packs:  mochilas (com nome), cada uma com o que leva da lista e,
--           opcionalmente, a linha da lista que é a própria mochila
--           (o peso próprio dela). Várias podem estar em uso.
-- Só a configuração de corpo em uso e as mochilas em uso entram na
-- carga (a conta fica em gearLoad, no site).
-- O que estava marcado como Carregado vai para uma mochila em uso,
-- "Itens carregados", sem peso próprio e com a quantidade toda: a
-- carga de cada ficha continua a mesma. A coluna carregado sai.
-- A view fichas_doc e a função salvar_ficha são as da migration 11
-- com as listas novas; o resto delas não muda.
-- ============================================================

-- ---------- lista de equipamentos: id fixo, tipo e entrada do catálogo ----------
ALTER TABLE public.ficha_equipamento
  ADD COLUMN id          TEXT,
  ADD COLUMN tipo        TEXT NOT NULL DEFAULT 'item' CHECK (tipo IN ('item', 'armor', 'weapon')),
  -- O id da entrada de Mundo › Itens, Armaduras ou Armas (o livro fica em dados/*.json, então não é chave estrangeira).
  ADD COLUMN catalogo_id TEXT;
-- O mesmo id que o site dá a uma linha antiga sem id (sheetGear, em ficha-equipamentos.js).
UPDATE public.ficha_equipamento SET id = 'e' || (ordem + 1);
ALTER TABLE public.ficha_equipamento
  ALTER COLUMN id SET NOT NULL,
  ADD CONSTRAINT ficha_equipamento_id_check CHECK (btrim(id) <> ''),
  -- Alvo dos vínculos do Corpo e das Mochilas: (ficha, id) garante que o equipamento é desta ficha.
  ADD CONSTRAINT ficha_equipamento_ficha_id_id_key UNIQUE (ficha_id, id);

-- ---------- configurações de corpo ----------
CREATE TABLE public.ficha_corpo (
  ficha_id TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  id       TEXT NOT NULL CHECK (btrim(id) <> ''),
  ordem    SMALLINT NOT NULL,
  nome     TEXT NOT NULL CHECK (btrim(nome) <> ''),
  em_uso   BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (ficha_id, id),
  UNIQUE (ficha_id, ordem)
);
-- No máximo uma configuração em uso por ficha.
CREATE UNIQUE INDEX ficha_corpo_em_uso_key ON public.ficha_corpo (ficha_id) WHERE em_uso;

-- O que cada configuração tem em cada parte do corpo (as do GURPS, Basic Set p. B398; o
-- tronco protege também os órgãos vitais). Uma armadura que cobre várias partes aparece em
-- cada uma e é uma peça só.
CREATE TABLE public.ficha_corpo_item (
  ficha_id       TEXT NOT NULL,
  corpo_id       TEXT NOT NULL,
  ordem          SMALLINT NOT NULL,
  parte          TEXT NOT NULL CHECK (parte IN ('eyes', 'skull', 'face', 'neck', 'torso', 'groin', 'right_arm', 'left_arm',
                                                'hands', 'right_leg', 'left_leg', 'feet')),
  equipamento_id TEXT NOT NULL,
  quantidade     INTEGER NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 9999),
  PRIMARY KEY (ficha_id, corpo_id, ordem),
  -- O mesmo equipamento uma vez em cada parte; a quantidade diz quantos.
  UNIQUE (ficha_id, corpo_id, parte, equipamento_id),
  FOREIGN KEY (ficha_id, corpo_id) REFERENCES public.ficha_corpo (ficha_id, id) ON DELETE CASCADE,
  -- Só equipamentos da lista desta mesma ficha. Conferido no fim da transação: salvar_ficha
  -- regrava a lista e os vínculos juntos.
  FOREIGN KEY (ficha_id, equipamento_id) REFERENCES public.ficha_equipamento (ficha_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX ficha_corpo_item_equipamento_idx ON public.ficha_corpo_item (ficha_id, equipamento_id);

-- ---------- mochilas ----------
CREATE TABLE public.ficha_mochila (
  ficha_id       TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  id             TEXT NOT NULL CHECK (btrim(id) <> ''),
  ordem          SMALLINT NOT NULL,
  nome           TEXT NOT NULL CHECK (btrim(nome) <> ''),
  em_uso         BOOLEAN NOT NULL DEFAULT false,
  -- A própria mochila, uma linha da lista de equipamentos (o peso dela entra quando está em uso).
  -- Nula: sem peso próprio.
  equipamento_id TEXT,
  PRIMARY KEY (ficha_id, id),
  UNIQUE (ficha_id, ordem),
  FOREIGN KEY (ficha_id, equipamento_id) REFERENCES public.ficha_equipamento (ficha_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX ficha_mochila_equipamento_idx ON public.ficha_mochila (ficha_id, equipamento_id);

CREATE TABLE public.ficha_mochila_item (
  ficha_id       TEXT NOT NULL,
  mochila_id     TEXT NOT NULL,
  ordem          SMALLINT NOT NULL,
  equipamento_id TEXT NOT NULL,
  quantidade     INTEGER NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 9999),
  PRIMARY KEY (ficha_id, mochila_id, ordem),
  -- O mesmo equipamento uma vez em cada mochila; a quantidade diz quantos.
  UNIQUE (ficha_id, mochila_id, equipamento_id),
  FOREIGN KEY (ficha_id, mochila_id) REFERENCES public.ficha_mochila (ficha_id, id) ON DELETE CASCADE,
  FOREIGN KEY (ficha_id, equipamento_id) REFERENCES public.ficha_equipamento (ficha_id, id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX ficha_mochila_item_equipamento_idx ON public.ficha_mochila_item (ficha_id, equipamento_id);

-- ---------- permissões (as mesmas de ficha_equipamento, migration 10) ----------
-- Leitura só para contas ligadas a um usuário; escrita só pelas funções.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ficha_corpo', 'ficha_corpo_item', 'ficha_mochila', 'ficha_mochila_item'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- ---------- o que era Carregado vai para a mochila "Itens carregados" ----------
INSERT INTO public.ficha_mochila (ficha_id, id, ordem, nome, em_uso)
SELECT DISTINCT e.ficha_id, 'm1', 0::smallint, 'Itens carregados', true
FROM public.ficha_equipamento e
WHERE e.carregado AND e.quantidade > 0;

INSERT INTO public.ficha_mochila_item (ficha_id, mochila_id, ordem, equipamento_id, quantidade)
SELECT e.ficha_id, 'm1', (row_number() OVER (PARTITION BY e.ficha_id ORDER BY e.ordem) - 1)::smallint, e.id, least(e.quantidade, 9999)
FROM public.ficha_equipamento e
WHERE e.carregado AND e.quantidade > 0;

-- Os vínculos convertidos são conferidos já (as chaves estrangeiras deles esperariam o fim da
-- transação, e uma tabela com conferência pendente não pode ser alterada). A coluna carregado
-- sai no fim, depois da view nova, que já não a lê.
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------- view de leitura ----------
CREATE OR REPLACE VIEW public.fichas_doc WITH (security_invoker = true) AS
SELECT f.id, f.gravado_em AS updated_at,
  jsonb_build_object(
    'name', f.nome,
    'description', f.descricao,
    'attrs', jsonb_build_object('st', f.st, 'dx', f.dx, 'iq', f.iq, 'ht', f.ht, 'per', f.per, 'will', f.vontade,
      'perBase', f.per_base, 'willBase', f.vontade_base, 'hp', f.pv, 'fp', f.pf, 'speed', f.velocidade, 'move', f.deslocamento,
      'enc', f.carga, 'metal', f.metal, 'spellPenalty', f.penalidade_magia),
    'skills', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', k.nome, 'attr', k.atributo, 'diff', k.dificuldade,
                          'pts', k.pontos, 'bonus', k.bonus, 'skillId', k.pericia_id, 'bonusNote', NULLIF(k.nota_bonus, ''))) ORDER BY k.ordem)
                        FROM public.ficha_pericia k WHERE k.ficha_id = f.id), '[]'::jsonb),
    'cultures', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', c.nome, 'pts', c.pontos) ORDER BY c.ordem)
                          FROM public.ficha_cultura c WHERE c.ficha_id = f.id), '[]'::jsonb),
    'advs', COALESCE((SELECT jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object('name', a.nome, 'advId', a.vantagem_id, 'cost', a.custo, 'levels', a.niveis,
                 'mod', a.modificador, 'notes', a.notas, 'size', a.tamanho))
               || CASE WHEN a.tamanho IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('skills',
                    COALESCE((SELECT jsonb_agg(t.nome ORDER BY t.ordem) FROM public.ficha_vantagem_pericia t
                              WHERE t.ficha_id = a.ficha_id AND t.vantagem_ordem = a.ordem), '[]'::jsonb)) END
               ORDER BY a.ordem)
             FROM public.ficha_vantagem a WHERE a.ficha_id = f.id), '[]'::jsonb),
    'combat', jsonb_build_object(
      'generalPos', f.posicao_gerais,
      'styles', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', s.nome, 'styleId', s.estilo_id))
                            || jsonb_build_object('items', hounds_interno.itens_combate(f.id, s.ordem)) ORDER BY s.ordem)
                          FROM public.ficha_estilo s WHERE s.ficha_id = f.id), '[]'::jsonb),
      'general', hounds_interno.itens_combate(f.id, NULL),
      'weapons', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', w.nome, 'mode', w.modo, 'mod', w.modificador, 'type', w.tipo_dano) ORDER BY w.ordem)
                           FROM public.ficha_arma w WHERE w.ficha_id = f.id), '[]'::jsonb),
      'def', jsonb_build_object('parry', f.aparar, 'parryBonus', f.aparar_bonus, 'parryNote', f.aparar_nota, 'block', f.bloqueio,
        'blockBonus', f.bloqueio_bonus, 'blockNote', f.bloqueio_nota, 'dodgeBonus', f.esquiva_bonus, 'dodgeNote', f.esquiva_nota, 'db', f.bonus_defesa)),
    'equip', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', e.id, 'kind', e.tipo, 'refId', e.catalogo_id, 'name', e.nome,
                         'qty', e.quantidade, 'weight', e.peso, 'cost', e.custo, 'notes', e.notas)) ORDER BY e.ordem)
                       FROM public.ficha_equipamento e WHERE e.ficha_id = f.id), '[]'::jsonb),
    'bodies', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.nome, 'active', c.em_uso,
                          'slots', COALESCE((SELECT jsonb_agg(jsonb_build_object('part', i.parte, 'equipId', i.equipamento_id, 'qty', i.quantidade) ORDER BY i.ordem)
                                             FROM public.ficha_corpo_item i WHERE i.ficha_id = c.ficha_id AND i.corpo_id = c.id), '[]'::jsonb)) ORDER BY c.ordem)
                        FROM public.ficha_corpo c WHERE c.ficha_id = f.id), '[]'::jsonb),
    'packs', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.nome, 'inUse', m.em_uso, 'equipId', m.equipamento_id,
                         'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('equipId', i.equipamento_id, 'qty', i.quantidade) ORDER BY i.ordem)
                                            FROM public.ficha_mochila_item i WHERE i.ficha_id = m.ficha_id AND i.mochila_id = m.id), '[]'::jsonb)) ORDER BY m.ordem)
                       FROM public.ficha_mochila m WHERE m.ficha_id = f.id), '[]'::jsonb),
    'visible', f.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.ficha_compartilhamento c WHERE c.item_id = f.id), '[]'::jsonb),
    'createdBy', f.criado_por,
    'createdAt', hounds_interno.ms(f.criado_em),
    'updatedAt', hounds_interno.ms(f.atualizado_em)) AS data
FROM public.fichas f;

-- ---------- gravação ----------
CREATE OR REPLACE FUNCTION hounds_interno.salvar_ficha(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_attrs JSONB := CASE WHEN jsonb_typeof(d -> 'attrs') = 'object' THEN d -> 'attrs' ELSE '{}'::jsonb END;
  v_combat JSONB := CASE WHEN jsonb_typeof(d -> 'combat') = 'object' THEN d -> 'combat' ELSE '{}'::jsonb END;
  v_def JSONB;
  v_iq INTEGER;
  v_per INTEGER;
  v_vontade INTEGER;
  n_estilos INTEGER;
  estilo RECORD;
  v_excesso RECORD;
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome da ficha.');
  v_def := CASE WHEN jsonb_typeof(v_combat -> 'def') = 'object' THEN v_combat -> 'def' ELSE '{}'::jsonb END;
  v_iq := hounds_interno.inteiro(v_attrs -> 'iq', 10);
  v_per := hounds_interno.inteiro(v_attrs -> 'per', 0);
  v_vontade := hounds_interno.inteiro(v_attrs -> 'will', 0);
  -- Fichas de antes das bases de Percepção e Vontade contavam a partir de IQ: guardam o valor
  -- que mostravam, agora sobre a base 10 (a mesma regra de sheetAttrs, em tab-fichas.js).
  IF v_attrs ? 'per' AND NOT v_attrs ? 'perBase' THEN v_per := least(greatest(v_iq + v_per - 10, -50), 50); END IF;
  IF v_attrs ? 'will' AND NOT v_attrs ? 'willBase' THEN v_vontade := least(greatest(v_iq + v_vontade - 10, -50), 50); END IF;
  SELECT count(*) INTO n_estilos FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'styles')) AS s (v) WHERE jsonb_typeof(s.v) = 'object';

  INSERT INTO public.fichas AS t (id, nome, descricao, st, dx, iq, ht, per, vontade, per_base, vontade_base, pv, pf, velocidade, deslocamento,
                                  carga, metal, penalidade_magia, posicao_gerais, aparar, aparar_bonus, bloqueio, bloqueio_bonus, esquiva_bonus,
                                  bonus_defesa, aparar_nota, bloqueio_nota, esquiva_nota, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          hounds_interno.inteiro(v_attrs -> 'st', 10), hounds_interno.inteiro(v_attrs -> 'dx', 10), v_iq, hounds_interno.inteiro(v_attrs -> 'ht', 10),
          v_per, v_vontade, hounds_interno.inteiro(v_attrs -> 'perBase', 10), hounds_interno.inteiro(v_attrs -> 'willBase', 10),
          hounds_interno.inteiro(v_attrs -> 'hp', 0), hounds_interno.inteiro(v_attrs -> 'fp', 0),
          round(COALESCE(hounds_interno.numero(v_attrs -> 'speed'), 0) * 4) / 4, hounds_interno.inteiro(v_attrs -> 'move', 0),
          least(greatest(hounds_interno.inteiro(v_attrs -> 'enc', 0), 0), 4), greatest(round(COALESCE(hounds_interno.numero(v_attrs -> 'metal'), 0), 2), 0),
          hounds_interno.inteiro(v_attrs -> 'spellPenalty', 0),
          least(greatest(hounds_interno.inteiro(v_combat -> 'generalPos', n_estilos), 0), n_estilos),
          COALESCE(hounds_interno.texto(v_def -> 'parry'), ''), hounds_interno.inteiro(v_def -> 'parryBonus', 0),
          COALESCE(hounds_interno.texto(v_def -> 'block'), ''), hounds_interno.inteiro(v_def -> 'blockBonus', 0),
          hounds_interno.inteiro(v_def -> 'dodgeBonus', 0), hounds_interno.inteiro(v_def -> 'db', 0),
          hounds_interno.nota_bonus(hounds_interno.inteiro(v_def -> 'parryBonus', 0), v_def -> 'parryNote'),
          hounds_interno.nota_bonus(hounds_interno.inteiro(v_def -> 'blockBonus', 0), v_def -> 'blockNote'),
          hounds_interno.nota_bonus(hounds_interno.inteiro(v_def -> 'dodgeBonus', 0), v_def -> 'dodgeNote'),
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, st, dx, iq, ht, per, vontade, per_base, vontade_base, pv, pf, velocidade, deslocamento,
                                  carga, metal, penalidade_magia, posicao_gerais, aparar, aparar_bonus, bloqueio, bloqueio_bonus, esquiva_bonus,
                                  bonus_defesa, aparar_nota, bloqueio_nota, esquiva_nota, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.st, EXCLUDED.dx, EXCLUDED.iq, EXCLUDED.ht, EXCLUDED.per, EXCLUDED.vontade,
         EXCLUDED.per_base, EXCLUDED.vontade_base, EXCLUDED.pv, EXCLUDED.pf, EXCLUDED.velocidade, EXCLUDED.deslocamento, EXCLUDED.carga,
         EXCLUDED.metal, EXCLUDED.penalidade_magia, EXCLUDED.posicao_gerais, EXCLUDED.aparar, EXCLUDED.aparar_bonus, EXCLUDED.bloqueio,
         EXCLUDED.bloqueio_bonus, EXCLUDED.esquiva_bonus, EXCLUDED.bonus_defesa, EXCLUDED.aparar_nota, EXCLUDED.bloqueio_nota, EXCLUDED.esquiva_nota, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- As listas da ficha são regravadas inteiras, na ordem recebida. Corpo e mochilas antes da
  -- lista de equipamentos, que eles referenciam.
  DELETE FROM public.ficha_pericia WHERE ficha_id = p_id;
  DELETE FROM public.ficha_cultura WHERE ficha_id = p_id;
  DELETE FROM public.ficha_vantagem WHERE ficha_id = p_id;
  DELETE FROM public.ficha_item_combate WHERE ficha_id = p_id;
  DELETE FROM public.ficha_estilo WHERE ficha_id = p_id;
  DELETE FROM public.ficha_arma WHERE ficha_id = p_id;
  DELETE FROM public.ficha_corpo WHERE ficha_id = p_id;
  DELETE FROM public.ficha_mochila WHERE ficha_id = p_id;
  DELETE FROM public.ficha_equipamento WHERE ficha_id = p_id;

  -- Perícias (cleanSkill): sem nome não entra; o motivo do bônus só com bônus.
  INSERT INTO public.ficha_pericia (ficha_id, ordem, nome, atributo, dificuldade, pontos, bonus, pericia_id, nota_bonus)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name',
         CASE WHEN e.v ->> 'attr' IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN e.v ->> 'attr' ELSE 'IQ' END,
         CASE WHEN e.v ->> 'diff' IN ('E', 'A', 'H', 'VH') THEN e.v ->> 'diff' ELSE 'A' END,
         greatest(hounds_interno.inteiro(e.v -> 'pts', 1), 0), hounds_interno.inteiro(e.v -> 'bonus', 0), NULLIF(e.v ->> 'skillId', ''),
         hounds_interno.nota_bonus(hounds_interno.inteiro(e.v -> 'bonus', 0), e.v -> 'bonusNote')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'skills')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  -- Familiaridades culturais (cleanCulture).
  INSERT INTO public.ficha_cultura (ficha_id, ordem, nome, pontos)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name', greatest(hounds_interno.inteiro(e.v -> 'pts', 1), 0)
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'cultures')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  -- Vantagens (cleanAdv): num talento, o tamanho define o custo e há pelo menos um nível.
  INSERT INTO public.ficha_vantagem (ficha_id, ordem, nome, vantagem_id, custo, niveis, modificador, notas, tamanho)
  SELECT p_id, e.ordem, e.v ->> 'name', NULLIF(e.v ->> 'advId', ''),
         CASE e.tam WHEN 'S' THEN 5 WHEN 'M' THEN 10 WHEN 'L' THEN 15 ELSE greatest(hounds_interno.inteiro(e.v -> 'cost', 0), 0) END,
         greatest(hounds_interno.inteiro(e.v -> 'levels', 0), CASE WHEN e.tam IS NULL THEN 0 ELSE 1 END),
         hounds_interno.inteiro(e.v -> 'mod', 0), COALESCE(e.v ->> 'notes', ''), e.tam
  FROM (SELECT v, (row_number() OVER (ORDER BY n) - 1)::smallint AS ordem,
               CASE WHEN v ->> 'size' IN ('S', 'M', 'L') THEN v ->> 'size' END AS tam
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'advs')) WITH ORDINALITY AS x (v, n)
        WHERE jsonb_typeof(v) = 'object' AND COALESCE(btrim(v ->> 'name'), '') <> '') e;

  INSERT INTO public.ficha_vantagem_pericia (ficha_id, vantagem_ordem, ordem, nome)
  SELECT p_id, va.ordem, (k.n - 1)::smallint, k.v #>> '{}'
  FROM public.ficha_vantagem va
  JOIN (SELECT v, (row_number() OVER (ORDER BY n) - 1)::smallint AS ordem
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'advs')) WITH ORDINALITY AS x (v, n)
        WHERE jsonb_typeof(v) = 'object' AND COALESCE(btrim(v ->> 'name'), '') <> '') e ON e.ordem = va.ordem
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(e.v -> 'skills')) WITH ORDINALITY AS k (v, n)
  WHERE va.ficha_id = p_id AND va.tamanho IS NOT NULL AND jsonb_typeof(k.v) = 'string' AND btrim(k.v #>> '{}') <> '';

  -- Seção Combate (cleanCombat): estilos com seus itens, itens gerais, armas.
  FOR estilo IN
    SELECT s.v, (s.n - 1)::smallint AS ordem
    FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'styles')) WITH ORDINALITY AS s (v, n)
    WHERE jsonb_typeof(s.v) = 'object'
  LOOP
    INSERT INTO public.ficha_estilo (ficha_id, ordem, nome, estilo_id)
    VALUES (p_id, estilo.ordem, COALESCE(estilo.v ->> 'name', ''), NULLIF(estilo.v ->> 'styleId', ''));
    PERFORM hounds_interno.inserir_itens_combate(p_id, estilo.ordem, estilo.v -> 'items');
  END LOOP;
  PERFORM hounds_interno.inserir_itens_combate(p_id, NULL, v_combat -> 'general');

  INSERT INTO public.ficha_arma (ficha_id, ordem, nome, modo, modificador, tipo_dano)
  SELECT p_id, (w.n - 1)::smallint, COALESCE(w.v ->> 'name', ''),
         CASE WHEN w.v ->> 'mode' IN ('sw', 'thr', 'fixed') THEN w.v ->> 'mode' ELSE 'sw' END,
         COALESCE(w.v ->> 'mod', ''),
         CASE WHEN w.v ->> 'type' IN ('cut', 'imp', 'cr', 'pi-', 'pi', 'pi+', 'pi++', 'burn', 'cor', 'tox', 'fat', 'spec') THEN w.v ->> 'type' ELSE 'cr' END
  FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'weapons')) WITH ORDINALITY AS w (v, n)
  WHERE jsonb_typeof(w.v) = 'object';

  -- Equipamentos (cleanEquip): sem nome não entra; peso e custo de uma unidade, com centavos.
  -- Uma linha sem id (de antes desta migration) recebe 'e' + a posição, como no site.
  INSERT INTO public.ficha_equipamento (ficha_id, ordem, id, tipo, catalogo_id, nome, quantidade, peso, custo, notas)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint,
         COALESCE(NULLIF(btrim(e.v ->> 'id'), ''), 'e' || e.n),
         CASE WHEN e.v ->> 'kind' IN ('armor', 'weapon') THEN e.v ->> 'kind' ELSE 'item' END,
         NULLIF(btrim(COALESCE(e.v ->> 'refId', '')), ''), e.v ->> 'name',
         least(greatest(hounds_interno.inteiro(e.v -> 'qty', 1), 0), 9999),
         least(greatest(round(COALESCE(hounds_interno.numero(e.v -> 'weight'), 0), 2), 0), 99999),
         least(greatest(round(COALESCE(hounds_interno.numero(e.v -> 'cost'), 0), 2), 0), 9999999),
         COALESCE(e.v ->> 'notes', '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'equip')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  -- Configurações de corpo (cleanBody): sem id ou nome não entra; só uma em uso.
  IF (SELECT count(*) FROM jsonb_array_elements(hounds_interno.lista(d -> 'bodies')) AS b (v)
      WHERE jsonb_typeof(b.v) = 'object' AND hounds_interno.logico(b.v -> 'active', false)) > 1 THEN
    RAISE EXCEPTION 'Só uma configuração de corpo pode estar em uso.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.ficha_corpo (ficha_id, id, ordem, nome, em_uso)
  SELECT p_id, btrim(b.v ->> 'id'), (row_number() OVER (ORDER BY b.n) - 1)::smallint, btrim(b.v ->> 'name'),
         hounds_interno.logico(b.v -> 'active', false)
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'bodies')) WITH ORDINALITY AS b (v, n)
  WHERE jsonb_typeof(b.v) = 'object' AND COALESCE(btrim(b.v ->> 'id'), '') <> '' AND COALESCE(btrim(b.v ->> 'name'), '') <> '';

  -- O que está em cada parte: o mesmo equipamento repetido na mesma parte vira uma linha só, com
  -- as quantidades somadas (como cleanBody).
  INSERT INTO public.ficha_corpo_item (ficha_id, corpo_id, ordem, parte, equipamento_id, quantidade)
  SELECT p_id, x.corpo_id, (row_number() OVER (PARTITION BY x.corpo_id ORDER BY min(x.n)) - 1)::smallint, x.parte, x.eq,
         least(sum(x.qtd), 9999)
  FROM (SELECT c.id AS corpo_id, s.n, s.v ->> 'part' AS parte, btrim(s.v ->> 'equipId') AS eq,
               greatest(hounds_interno.inteiro(s.v -> 'qty', 1), 1) AS qtd
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'bodies')) AS b (v)
        JOIN public.ficha_corpo c ON c.ficha_id = p_id AND c.id = btrim(b.v ->> 'id')
        CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(b.v -> 'slots')) WITH ORDINALITY AS s (v, n)
        WHERE jsonb_typeof(b.v) = 'object' AND jsonb_typeof(s.v) = 'object' AND COALESCE(btrim(s.v ->> 'equipId'), '') <> ''
          AND s.v ->> 'part' IN ('eyes', 'skull', 'face', 'neck', 'torso', 'groin', 'right_arm', 'left_arm', 'hands', 'right_leg', 'left_leg', 'feet')) x
  GROUP BY x.corpo_id, x.parte, x.eq;

  -- Mochilas (cleanPack): sem id ou nome não entra; várias podem estar em uso.
  INSERT INTO public.ficha_mochila (ficha_id, id, ordem, nome, em_uso, equipamento_id)
  SELECT p_id, btrim(m.v ->> 'id'), (row_number() OVER (ORDER BY m.n) - 1)::smallint, btrim(m.v ->> 'name'),
         hounds_interno.logico(m.v -> 'inUse', false), NULLIF(btrim(COALESCE(m.v ->> 'equipId', '')), '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'packs')) WITH ORDINALITY AS m (v, n)
  WHERE jsonb_typeof(m.v) = 'object' AND COALESCE(btrim(m.v ->> 'id'), '') <> '' AND COALESCE(btrim(m.v ->> 'name'), '') <> '';

  INSERT INTO public.ficha_mochila_item (ficha_id, mochila_id, ordem, equipamento_id, quantidade)
  SELECT p_id, x.mochila_id, (row_number() OVER (PARTITION BY x.mochila_id ORDER BY min(x.n)) - 1)::smallint, x.eq, least(sum(x.qtd), 9999)
  FROM (SELECT mo.id AS mochila_id, i.n, btrim(i.v ->> 'equipId') AS eq, greatest(hounds_interno.inteiro(i.v -> 'qty', 1), 1) AS qtd
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'packs')) AS m (v)
        JOIN public.ficha_mochila mo ON mo.ficha_id = p_id AND mo.id = btrim(m.v ->> 'id')
        CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(m.v -> 'items')) WITH ORDINALITY AS i (v, n)
        WHERE jsonb_typeof(m.v) = 'object' AND jsonb_typeof(i.v) = 'object' AND COALESCE(btrim(i.v ->> 'equipId'), '') <> '') x
  GROUP BY x.mochila_id, x.eq;

  -- Corpo e mochilas só com equipamentos da lista desta ficha (as chaves estrangeiras garantem
  -- o mesmo no fim da transação; aqui, com uma mensagem clara).
  IF EXISTS (SELECT 1 FROM (SELECT i.equipamento_id AS eq FROM public.ficha_corpo_item i WHERE i.ficha_id = p_id
                            UNION ALL SELECT m.equipamento_id FROM public.ficha_mochila m WHERE m.ficha_id = p_id AND m.equipamento_id IS NOT NULL
                            UNION ALL SELECT i.equipamento_id FROM public.ficha_mochila_item i WHERE i.ficha_id = p_id) r
             WHERE NOT EXISTS (SELECT 1 FROM public.ficha_equipamento e WHERE e.ficha_id = p_id AND e.id = r.eq)) THEN
    RAISE EXCEPTION 'Um equipamento do Corpo ou das Mochilas não está mais na lista de equipamentos da ficha. Recarregue a página e confira.'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Ninguém aloca mais do que tem (como gearIssues). Numa configuração de corpo, uma armadura em
  -- várias partes é uma peça só (vale a maior quantidade); armas e itens somam as partes. Nas
  -- mochilas, em uso ou não, contam as próprias mochilas e o que está dentro delas.
  SELECT e.nome, u.onde, u.n, e.quantidade INTO v_excesso
  FROM (SELECT i.equipamento_id AS eq, 'na configuração de corpo “' || c.nome || '”' AS onde,
               CASE WHEN max(q.tipo) = 'armor' THEN max(i.quantidade) ELSE sum(i.quantidade) END AS n, min(c.ordem) AS o
        FROM public.ficha_corpo_item i
        JOIN public.ficha_corpo c ON c.ficha_id = i.ficha_id AND c.id = i.corpo_id
        JOIN public.ficha_equipamento q ON q.ficha_id = i.ficha_id AND q.id = i.equipamento_id
        WHERE i.ficha_id = p_id
        GROUP BY i.corpo_id, c.nome, i.equipamento_id
        UNION ALL
        SELECT a.eq, 'nas mochilas', sum(a.n), 32767
        FROM (SELECT m.equipamento_id AS eq, 1 AS n FROM public.ficha_mochila m WHERE m.ficha_id = p_id AND m.equipamento_id IS NOT NULL
              UNION ALL SELECT i.equipamento_id, i.quantidade FROM public.ficha_mochila_item i WHERE i.ficha_id = p_id) a
        GROUP BY a.eq) u
  JOIN public.ficha_equipamento e ON e.ficha_id = p_id AND e.id = u.eq
  WHERE u.n > e.quantidade
  ORDER BY u.o, e.ordem
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION '%: % %, mas a lista de equipamentos tem %.', v_excesso.nome, v_excesso.n, v_excesso.onde, v_excesso.quantidade
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM hounds_interno.gravar_vinculos('ficha_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- ---------- fim: a coluna Carregado (já convertida na mochila acima) ----------
ALTER TABLE public.ficha_equipamento DROP COLUMN carregado;

-- As fichas com equipamentos mudaram (ids novos, a mochila): os navegadores abertos baixam de novo.
UPDATE public.fichas f SET atualizado_em = f.atualizado_em
WHERE EXISTS (SELECT 1 FROM public.ficha_equipamento e WHERE e.ficha_id = f.id);
