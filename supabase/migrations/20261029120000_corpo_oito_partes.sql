-- ============================================================
-- 21 · CORPO: 8 PARTES SÓ COM ARMADURAS; ARMAS E ITENS FORA
-- As partes do corpo passam a ser as localizações de Criar Armadura:
-- Cabeça, Pescoço, Tronco, Virilha, Braços, Mãos, Pernas e Pés. Nelas
-- vão só armaduras (várias numa parte: camadas); armas, escudos e
-- itens vão fora das partes (parte 'carry').
--   - as partes de antes viram as de agora: olhos, crânio e rosto →
--     cabeça; braço direito e esquerdo → braços; perna direita e
--     esquerda → pernas. Uma armadura que estava em duas partes que
--     viraram uma fica uma vez só (é uma peça); armas e itens vão
--     para 'carry', com as quantidades somadas;
--   - as localizações de Criar Armadura apontam para as partes novas;
--   - salvar_ficha é a da migration 20 com as partes novas; a view
--     fichas_doc não muda.
-- Pode rodar de novo: as conversões só mudam o que ainda está no
-- formato de antes.
-- ============================================================

-- As partes de agora, e as de antes convertidas (null: nenhuma).
CREATE OR REPLACE FUNCTION hounds_interno.parte_corpo(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IN ('head', 'eyes', 'skull', 'face') THEN 'head'
    WHEN p IN ('arms', 'right_arm', 'left_arm') THEN 'arms'
    WHEN p IN ('legs', 'right_leg', 'left_leg') THEN 'legs'
    WHEN p IN ('neck', 'torso', 'groin', 'hands', 'feet', 'carry') THEN p
  END
$$;
REVOKE ALL ON FUNCTION hounds_interno.parte_corpo(TEXT) FROM PUBLIC, anon, authenticated;

-- ---------- localizações de Criar Armadura ----------
CREATE OR REPLACE FUNCTION hounds_interno.partes_validas(p TEXT[]) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(p <@ ARRAY['head', 'neck', 'torso', 'groin', 'arms', 'hands', 'legs', 'feet'], false) AND cardinality(p) > 0
$$;
UPDATE public.armadura_localizacoes l SET partes = x.novas
FROM (SELECT l2.id, ARRAY(SELECT DISTINCT hounds_interno.parte_corpo(u) FROM unnest(l2.partes) AS u WHERE hounds_interno.parte_corpo(u) IS NOT NULL) AS novas
      FROM public.armadura_localizacoes l2) x
WHERE l.id = x.id AND l.partes IS DISTINCT FROM x.novas AND cardinality(x.novas) > 0;

-- ---------- o que está no corpo ----------
ALTER TABLE public.ficha_corpo_item DROP CONSTRAINT IF EXISTS ficha_corpo_item_parte_check;
WITH antes AS (
  DELETE FROM public.ficha_corpo_item i
  WHERE i.parte NOT IN ('head', 'neck', 'torso', 'groin', 'arms', 'hands', 'legs', 'feet', 'carry')
     OR EXISTS (SELECT 1 FROM public.ficha_equipamento e WHERE e.ficha_id = i.ficha_id AND e.id = i.equipamento_id AND e.tipo <> 'armor' AND i.parte <> 'carry')
  RETURNING i.*
), novo AS (
  SELECT a.ficha_id, a.corpo_id, a.equipamento_id, a.ordem, a.quantidade, e.tipo,
         CASE WHEN e.tipo = 'armor' THEN hounds_interno.parte_corpo(a.parte) ELSE 'carry' END AS parte
  FROM antes a JOIN public.ficha_equipamento e ON e.ficha_id = a.ficha_id AND e.id = a.equipamento_id
), junto AS (
  -- Com o que já estava na parte nova: uma linha por equipamento (armadura: a maior quantidade).
  SELECT n.ficha_id, n.corpo_id, n.parte, n.equipamento_id, min(n.ordem) AS ordem,
         CASE WHEN max(n.tipo) = 'armor' THEN max(n.quantidade) ELSE least(sum(n.quantidade), 9999) END AS quantidade
  FROM novo n WHERE n.parte IS NOT NULL
  GROUP BY n.ficha_id, n.corpo_id, n.parte, n.equipamento_id
)
INSERT INTO public.ficha_corpo_item (ficha_id, corpo_id, ordem, parte, equipamento_id, quantidade)
SELECT j.ficha_id, j.corpo_id,
       (COALESCE((SELECT max(i.ordem) FROM public.ficha_corpo_item i WHERE i.ficha_id = j.ficha_id AND i.corpo_id = j.corpo_id), -1)
        + row_number() OVER (PARTITION BY j.ficha_id, j.corpo_id ORDER BY j.ordem))::smallint,
       j.parte, j.equipamento_id, j.quantidade
FROM junto j
ON CONFLICT (ficha_id, corpo_id, parte, equipamento_id) DO UPDATE SET quantidade =
  CASE WHEN (SELECT e.tipo FROM public.ficha_equipamento e WHERE e.ficha_id = EXCLUDED.ficha_id AND e.id = EXCLUDED.equipamento_id) = 'armor'
       THEN greatest(public.ficha_corpo_item.quantidade, EXCLUDED.quantidade)
       ELSE least(public.ficha_corpo_item.quantidade + EXCLUDED.quantidade, 9999) END;
-- Os vínculos regravados são conferidos já (uma tabela com conferência pendente não pode ser alterada).
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.ficha_corpo_item ADD CONSTRAINT ficha_corpo_item_parte_check
  CHECK (parte IN ('head', 'neck', 'torso', 'groin', 'arms', 'hands', 'legs', 'feet', 'carry'));

-- As fichas com corpo mudaram: os navegadores abertos baixam de novo.
UPDATE public.fichas f SET atualizado_em = f.atualizado_em
WHERE EXISTS (SELECT 1 FROM public.ficha_corpo c WHERE c.ficha_id = f.id);

-- ---------- gravação da ficha (as partes novas) ----------
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
  v_peca RECORD;
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

  -- As listas da ficha são regravadas inteiras, na ordem recebida. Conjuntos de armadura, corpo e
  -- mochilas antes da lista de equipamentos, que eles referenciam.
  DELETE FROM public.ficha_pericia WHERE ficha_id = p_id;
  DELETE FROM public.ficha_cultura WHERE ficha_id = p_id;
  DELETE FROM public.ficha_vantagem WHERE ficha_id = p_id;
  DELETE FROM public.ficha_item_combate WHERE ficha_id = p_id;
  DELETE FROM public.ficha_estilo WHERE ficha_id = p_id;
  DELETE FROM public.ficha_arma WHERE ficha_id = p_id;
  DELETE FROM public.ficha_armadura WHERE ficha_id = p_id;
  DELETE FROM public.ficha_arma_criada WHERE ficha_id = p_id;
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

  -- O que está em cada parte: o mesmo equipamento repetido na mesma parte vira uma linha só (uma
  -- armadura é uma peça: vale a maior quantidade; o resto soma), como cleanBody.
  INSERT INTO public.ficha_corpo_item (ficha_id, corpo_id, ordem, parte, equipamento_id, quantidade)
  SELECT p_id, x.corpo_id, (row_number() OVER (PARTITION BY x.corpo_id ORDER BY min(x.n)) - 1)::smallint, x.parte, x.eq,
         CASE WHEN max(x.tipo) = 'armor' THEN max(x.qtd) ELSE least(sum(x.qtd), 9999) END
  FROM (SELECT c.id AS corpo_id, s.n, e.tipo, btrim(s.v ->> 'equipId') AS eq, greatest(hounds_interno.inteiro(s.v -> 'qty', 1), 1) AS qtd,
               -- Armas e itens vão fora das partes; armaduras, na parte (as partes de antes viram as de agora).
               CASE WHEN e.tipo = 'armor' THEN hounds_interno.parte_corpo(s.v ->> 'part') ELSE 'carry' END AS parte
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'bodies')) AS b (v)
        JOIN public.ficha_corpo c ON c.ficha_id = p_id AND c.id = btrim(b.v ->> 'id')
        CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(b.v -> 'slots')) WITH ORDINALITY AS s (v, n)
        -- LEFT: um equipamento que não está na lista entra e é recusado logo abaixo, com a mensagem.
        LEFT JOIN public.ficha_equipamento e ON e.ficha_id = p_id AND e.id = btrim(s.v ->> 'equipId')
        WHERE jsonb_typeof(b.v) = 'object' AND jsonb_typeof(s.v) = 'object' AND COALESCE(btrim(s.v ->> 'equipId'), '') <> '') x
  WHERE x.parte IS NOT NULL
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

  -- Conjuntos de armadura (cleanArmorSet): sem id, nome ou modelo base não entra. O modelo base fica
  -- como estava ao criar; os ajustes, na ordem; as peças, com os valores calculados.
  INSERT INTO public.ficha_armadura (ficha_id, id, ordem, nome, descricao, modelo_id, modelo_nome, rd_base, custo_base, peso_base, vestir_base, tl, versao, origem_id)
  SELECT p_id, btrim(a.v ->> 'id'), (row_number() OVER (ORDER BY a.n) - 1)::smallint, btrim(a.v ->> 'name'), COALESCE(a.v ->> 'description', ''),
         NULLIF(btrim(COALESCE(a.v ->> 'baseId', '')), ''), btrim(a.v #>> '{base,name}'), COALESCE(a.v #>> '{base,dr}', ''),
         greatest(round(COALESCE(hounds_interno.numero(a.v #> '{base,cost}'), 0), 2), 0), greatest(round(COALESCE(hounds_interno.numero(a.v #> '{base,weight}'), 0), 2), 0),
         round(hounds_interno.numero(a.v #> '{base,don}'), 1), COALESCE(a.v #>> '{base,tl}', ''),
         greatest(hounds_interno.inteiro(a.v -> 'version', 1), 1), NULLIF(btrim(COALESCE(a.v ->> 'originId', '')), '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'armorSets')) WITH ORDINALITY AS a (v, n)
  WHERE jsonb_typeof(a.v) = 'object' AND COALESCE(btrim(a.v ->> 'id'), '') <> '' AND COALESCE(btrim(a.v ->> 'name'), '') <> ''
    AND COALESCE(btrim(a.v #>> '{base,name}'), '') <> '';

  INSERT INTO public.ficha_armadura_mod (ficha_id, armadura_id, ordem, nome, magia_id, rd, custo, peso_pct)
  SELECT p_id, c.id, (row_number() OVER (PARTITION BY c.id ORDER BY m.n) - 1)::smallint, btrim(m.v ->> 'name'),
         NULLIF(btrim(COALESCE(m.v ->> 'spellId', '')), ''), least(greatest(hounds_interno.inteiro(m.v -> 'dr', 0), -50), 50),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'cost'), 0), 2), -9999999), 9999999),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'weightPct'), 0), 2), -100), 1000)
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'armorSets')) AS a (v)
  JOIN public.ficha_armadura c ON c.ficha_id = p_id AND c.id = btrim(a.v ->> 'id')
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(a.v -> 'mods')) WITH ORDINALITY AS m (v, n)
  WHERE jsonb_typeof(a.v) = 'object' AND jsonb_typeof(m.v) = 'object' AND COALESCE(btrim(m.v ->> 'name'), '') <> '';

  INSERT INTO public.ficha_armadura_peca (ficha_id, armadura_id, id, ordem, localizacao_id, cobertura, percentual, rd, custo, peso, vestir, equipamento_id)
  SELECT p_id, c.id, btrim(pc.v ->> 'id'), (row_number() OVER (PARTITION BY c.id ORDER BY pc.n) - 1)::smallint, pc.v ->> 'loc',
         CASE WHEN pc.v ->> 'cover' = 'front' THEN 'front' ELSE 'full' END, round(hounds_interno.numero(pc.v -> 'pct'), 3), COALESCE(pc.v ->> 'dr', ''),
         greatest(round(COALESCE(hounds_interno.numero(pc.v -> 'cost'), 0), 2), 0), greatest(round(COALESCE(hounds_interno.numero(pc.v -> 'weight'), 0), 2), 0),
         round(hounds_interno.numero(pc.v -> 'don'), 1), NULLIF(btrim(COALESCE(pc.v ->> 'equipId', '')), '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'armorSets')) AS a (v)
  JOIN public.ficha_armadura c ON c.ficha_id = p_id AND c.id = btrim(a.v ->> 'id')
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(a.v -> 'pieces')) WITH ORDINALITY AS pc (v, n)
  WHERE jsonb_typeof(a.v) = 'object' AND jsonb_typeof(pc.v) = 'object' AND COALESCE(btrim(pc.v ->> 'id'), '') <> '';

  -- Peças do mesmo conjunto não se sobrepõem: uma localização e outra dentro dela (Cabeça e Crânio)
  -- ou que cobre parte da mesma área (Uma perna e Coxas).
  SELECT c.nome AS conjunto, l1.nome AS a, l2.nome AS b INTO v_peca
  FROM public.ficha_armadura_peca p1
  JOIN public.ficha_armadura_peca p2 ON p2.ficha_id = p1.ficha_id AND p2.armadura_id = p1.armadura_id AND p2.id <> p1.id
  JOIN public.ficha_armadura c ON c.ficha_id = p1.ficha_id AND c.id = p1.armadura_id
  JOIN public.armadura_localizacoes l1 ON l1.id = p1.localizacao_id
  JOIN public.armadura_localizacoes l2 ON l2.id = p2.localizacao_id
  WHERE p1.ficha_id = p_id
    AND (hounds_interno.localizacao_dentro(p2.localizacao_id, p1.localizacao_id) OR p2.localizacao_id = ANY (l1.conflita))
  ORDER BY c.ordem, p1.ordem
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Conjunto “%”: % e % cobrem a mesma área. Escolha uma das duas.', v_peca.conjunto, v_peca.a, v_peca.b USING ERRCODE = 'check_violation';
  END IF;
  -- Cobertura só frontal onde a localização permite (e não numa que já é só a frente).
  SELECT c.nome AS conjunto, l.nome AS a, NULL::text AS b INTO v_peca
  FROM public.ficha_armadura_peca p
  JOIN public.ficha_armadura c ON c.ficha_id = p.ficha_id AND c.id = p.armadura_id
  JOIN public.armadura_localizacoes l ON l.id = p.localizacao_id
  WHERE p.ficha_id = p_id AND p.cobertura = 'front' AND (l.frontal OR NOT l.permite_frontal)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Conjunto “%”: % não tem a cobertura só frontal.', v_peca.conjunto, v_peca.a USING ERRCODE = 'check_violation';
  END IF;
  -- A linha da lista que é uma peça: uma armadura com o peso e o custo calculados para a peça.
  SELECT c.nome AS conjunto, e.nome AS a, NULL::text AS b INTO v_peca
  FROM public.ficha_armadura_peca p
  JOIN public.ficha_armadura c ON c.ficha_id = p.ficha_id AND c.id = p.armadura_id
  JOIN public.ficha_equipamento e ON e.ficha_id = p.ficha_id AND e.id = p.equipamento_id
  WHERE p.ficha_id = p_id AND (e.tipo <> 'armor' OR e.peso <> p.peso OR e.custo <> p.custo)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION '“%” é uma peça do conjunto “%”: na lista, precisa ser uma armadura com o peso e o custo calculados para a peça.', v_peca.a, v_peca.conjunto
      USING ERRCODE = 'check_violation';
  END IF;

  -- Armas de Criar Arma (cleanCustomWeapon): sem id ou nome não entra. A arma do livro como estava ao
  -- criar, os ataques (com o dano do livro e o ajustado), os ajustes e o resultado.
  INSERT INTO public.ficha_arma_criada (ficha_id, id, ordem, arma_id, nome, tl, tipo, custo_base, peso_base, descricao, custo, peso, equipamento_id)
  SELECT p_id, btrim(w.v ->> 'id'), (row_number() OVER (ORDER BY w.n) - 1)::smallint, NULLIF(btrim(COALESCE(w.v ->> 'baseId', '')), ''),
         btrim(w.v #>> '{base,name}'), COALESCE(w.v #>> '{base,tl}', ''), COALESCE(w.v #>> '{base,type}', ''),
         least(greatest(round(COALESCE(hounds_interno.numero(w.v #> '{base,cost}'), 0), 2), 0), 9999999),
         least(greatest(round(COALESCE(hounds_interno.numero(w.v #> '{base,weight}'), 0), 2), 0), 99999),
         COALESCE(w.v ->> 'description', ''),
         least(greatest(round(COALESCE(hounds_interno.numero(w.v -> 'cost'), 0), 2), 0), 9999999),
         least(greatest(round(COALESCE(hounds_interno.numero(w.v -> 'weight'), 0), 2), 0), 99999),
         NULLIF(btrim(COALESCE(w.v ->> 'equipId', '')), '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'customWeapons')) WITH ORDINALITY AS w (v, n)
  WHERE jsonb_typeof(w.v) = 'object' AND COALESCE(btrim(w.v ->> 'id'), '') <> '' AND COALESCE(btrim(w.v #>> '{base,name}'), '') <> '';

  INSERT INTO public.ficha_arma_criada_ataque (ficha_id, arma_criada_id, ordem, pericia, padroes, modo, dano_base, dano, alcance, aparar,
                                               precisao, distancia, cdt, tiros, st, volume, recuo, notas)
  SELECT p_id, c.id, (t.n - 1)::smallint, COALESCE(t.v ->> 'skill', ''), COALESCE(t.v ->> 'defaults', ''), COALESCE(t.v ->> 'mode', ''),
         COALESCE(t.v ->> 'baseDamage', t.v ->> 'damage', ''), COALESCE(t.v ->> 'damage', ''), COALESCE(t.v ->> 'reach', ''), COALESCE(t.v ->> 'parry', ''),
         COALESCE(t.v ->> 'acc', ''), COALESCE(t.v ->> 'range', ''), COALESCE(t.v ->> 'rof', ''), COALESCE(t.v ->> 'shots', ''), COALESCE(t.v ->> 'st', ''),
         COALESCE(t.v ->> 'bulk', ''), COALESCE(t.v ->> 'rcl', ''), COALESCE(t.v ->> 'notes', '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'customWeapons')) AS w (v)
  JOIN public.ficha_arma_criada c ON c.ficha_id = p_id AND c.id = btrim(w.v ->> 'id')
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(w.v -> 'attacks')) WITH ORDINALITY AS t (v, n)
  WHERE jsonb_typeof(w.v) = 'object' AND jsonb_typeof(t.v) = 'object' AND t.n <= 30;

  INSERT INTO public.ficha_arma_criada_mod (ficha_id, arma_criada_id, ordem, nome, magia_id, dano, nh, custo, peso_pct)
  SELECT p_id, c.id, (row_number() OVER (PARTITION BY c.id ORDER BY m.n) - 1)::smallint, btrim(m.v ->> 'name'),
         NULLIF(btrim(COALESCE(m.v ->> 'spellId', '')), ''), least(greatest(hounds_interno.inteiro(m.v -> 'dmg', 0), -20), 20),
         least(greatest(hounds_interno.inteiro(m.v -> 'nh', 0), -20), 20),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'cost'), 0), 2), -9999999), 9999999),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'weightPct'), 0), 2), -100), 1000)
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'customWeapons')) AS w (v)
  JOIN public.ficha_arma_criada c ON c.ficha_id = p_id AND c.id = btrim(w.v ->> 'id')
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(w.v -> 'mods')) WITH ORDINALITY AS m (v, n)
  WHERE jsonb_typeof(w.v) = 'object' AND jsonb_typeof(m.v) = 'object' AND COALESCE(btrim(m.v ->> 'name'), '') <> '';

  -- A linha da lista que é uma arma criada: uma arma com o peso e o custo calculados.
  SELECT c.nome AS conjunto, e.nome AS a, NULL::text AS b INTO v_peca
  FROM public.ficha_arma_criada c
  JOIN public.ficha_equipamento e ON e.ficha_id = c.ficha_id AND e.id = c.equipamento_id
  WHERE c.ficha_id = p_id AND (e.tipo <> 'weapon' OR e.peso <> c.peso OR e.custo <> c.custo)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION '“%” é uma arma de Criar Arma: na lista, precisa ser uma arma com o peso e o custo calculados.', v_peca.a USING ERRCODE = 'check_violation';
  END IF;

  -- Corpo, mochilas e peças de armadura só com equipamentos da lista desta ficha (as chaves estrangeiras garantem
  -- o mesmo no fim da transação; aqui, com uma mensagem clara).
  IF EXISTS (SELECT 1 FROM (SELECT i.equipamento_id AS eq FROM public.ficha_corpo_item i WHERE i.ficha_id = p_id
                            UNION ALL SELECT m.equipamento_id FROM public.ficha_mochila m WHERE m.ficha_id = p_id AND m.equipamento_id IS NOT NULL
                            UNION ALL SELECT i.equipamento_id FROM public.ficha_mochila_item i WHERE i.ficha_id = p_id
                            UNION ALL SELECT p.equipamento_id FROM public.ficha_armadura_peca p WHERE p.ficha_id = p_id AND p.equipamento_id IS NOT NULL
                            UNION ALL SELECT w.equipamento_id FROM public.ficha_arma_criada w WHERE w.ficha_id = p_id AND w.equipamento_id IS NOT NULL) r
             WHERE NOT EXISTS (SELECT 1 FROM public.ficha_equipamento e WHERE e.ficha_id = p_id AND e.id = r.eq)) THEN
    RAISE EXCEPTION 'Um equipamento do Corpo, das Mochilas, de Criar Armadura ou de Criar Arma não está mais na lista de equipamentos da ficha. Recarregue a página e confira.'
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
