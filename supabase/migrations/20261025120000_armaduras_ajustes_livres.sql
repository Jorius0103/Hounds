-- ============================================================
-- 17 · ARMADURAS MODULARES: AJUSTES LIVRES
-- Para bancos que rodaram a primeira versão da migration 16, com a
-- lista fixa de modificadores (Cheap, Hardened Steel, Heavy Plate,
-- Tailoring). Agora cada conjunto tem ajustes livres: um nome (texto
-- ou uma magia) e o que ele soma ou tira da RD de cada peça e do custo
-- ($) e do peso (lbs) do conjunto.
--   - ficha_armadura_mod passa ao formato novo; cada modificador gravado
--     vira um ajuste com o mesmo nome, a RD vezes os níveis, e o custo e
--     o peso que o percentual dele dava sobre as peças do conjunto (as
--     peças já gravadas não mudam);
--   - a tabela armadura_modificadores, a view e a função dela saem;
--   - tabela, gravar, autorizar, fichas_doc e salvar_ficha ficam como na
--     migration 16 atual.
-- Num banco que rodou a migration 16 atual, nada muda (as conversões só
-- rodam se acharem o formato antigo).
-- ============================================================

-- ---------- ficha_armadura_mod: do formato antigo para o novo ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'ficha_armadura_mod' AND column_name = 'modificador_id') THEN
    RETURN;
  END IF;
  ALTER TABLE public.ficha_armadura_mod
    ADD COLUMN ordem    SMALLINT,
    ADD COLUMN magia_id TEXT,
    ADD COLUMN custo    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN peso     NUMERIC(10, 2) NOT NULL DEFAULT 0;
  -- O que o modificador fazia, em valores: % sobre o modelo base vezes os níveis, nas peças do
  -- conjunto (a soma dos percentuais delas sobre o tronco).
  UPDATE public.ficha_armadura_mod m SET
    ordem = x.ordem,
    rd = least(greatest(COALESCE(m.rd, 0) * m.niveis, -50), 50),
    custo = least(greatest(round(a.custo_base * COALESCE(m.custo_pct, 0) * m.niveis / 100 * x.pct / 100, 2), -9999999), 9999999),
    peso = least(greatest(round(a.peso_base * COALESCE(m.peso_pct, 0) * m.niveis / 100 * x.pct / 100, 2), -99999), 99999)
  FROM (SELECT mm.ficha_id, mm.armadura_id, mm.modificador_id,
               (row_number() OVER (PARTITION BY mm.ficha_id, mm.armadura_id ORDER BY mm.modificador_id) - 1)::smallint AS ordem,
               COALESCE((SELECT sum(p.percentual) FROM public.ficha_armadura_peca p
                         WHERE p.ficha_id = mm.ficha_id AND p.armadura_id = mm.armadura_id), 0) AS pct
        FROM public.ficha_armadura_mod mm) x
  JOIN public.ficha_armadura a ON a.ficha_id = x.ficha_id AND a.id = x.armadura_id
  WHERE m.ficha_id = x.ficha_id AND m.armadura_id = x.armadura_id AND m.modificador_id = x.modificador_id;
END $$;

-- ---------- view de leitura (ajustes livres): antes de tirar as colunas antigas, que a view antiga lê ----------
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
    'armorSets', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.nome, 'description', a.descricao, 'baseId', a.modelo_id,
                    'base', jsonb_build_object('name', a.modelo_nome, 'dr', a.rd_base, 'cost', a.custo_base, 'weight', a.peso_base, 'don', a.vestir_base, 'tl', a.tl),
                    'version', a.versao, 'originId', a.origem_id,
                    'mods', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', m.nome, 'spellId', m.magia_id, 'dr', m.rd,
                                        'cost', m.custo, 'weight', m.peso)) ORDER BY m.ordem)
                                      FROM public.ficha_armadura_mod m WHERE m.ficha_id = a.ficha_id AND m.armadura_id = a.id), '[]'::jsonb),
                    'pieces', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'loc', p.localizacao_id, 'cover', p.cobertura, 'pct', p.percentual,
                                          'dr', p.rd, 'cost', p.custo, 'weight', p.peso, 'don', p.vestir, 'equipId', p.equipamento_id) ORDER BY p.ordem)
                                        FROM public.ficha_armadura_peca p WHERE p.ficha_id = a.ficha_id AND p.armadura_id = a.id), '[]'::jsonb)) ORDER BY a.ordem)
                  FROM public.ficha_armadura a WHERE a.ficha_id = f.id), '[]'::jsonb),
    'visible', f.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.ficha_compartilhamento c WHERE c.item_id = f.id), '[]'::jsonb),
    'createdBy', f.criado_por,
    'createdAt', hounds_interno.ms(f.criado_em),
    'updatedAt', hounds_interno.ms(f.atualizado_em)) AS data
FROM public.fichas f;

-- ---------- ficha_armadura_mod: sem as colunas antigas ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'ficha_armadura_mod' AND column_name = 'modificador_id') THEN
    RETURN;
  END IF;
  ALTER TABLE public.ficha_armadura_mod DROP CONSTRAINT ficha_armadura_mod_pkey;
  ALTER TABLE public.ficha_armadura_mod
    DROP COLUMN modificador_id,
    DROP COLUMN niveis,
    DROP COLUMN custo_pct,
    DROP COLUMN peso_pct;
  UPDATE public.ficha_armadura_mod SET rd = 0 WHERE rd IS NULL;
  ALTER TABLE public.ficha_armadura_mod
    ALTER COLUMN ordem SET NOT NULL,
    ALTER COLUMN rd SET NOT NULL,
    ALTER COLUMN rd SET DEFAULT 0,
    ADD CONSTRAINT ficha_armadura_mod_rd_check CHECK (rd BETWEEN -50 AND 50),
    ADD CONSTRAINT ficha_armadura_mod_nome_check CHECK (btrim(nome) <> ''),
    ADD CONSTRAINT ficha_armadura_mod_pkey PRIMARY KEY (ficha_id, armadura_id, ordem);
  -- As fichas com conjuntos mudaram: os navegadores abertos baixam de novo.
  UPDATE public.fichas f SET atualizado_em = f.atualizado_em
  WHERE EXISTS (SELECT 1 FROM public.ficha_armadura a WHERE a.ficha_id = f.id);
END $$;

-- ---------- a tabela de modificadores sai ----------
DROP FUNCTION IF EXISTS hounds_interno.salvar_armadura_modificador(TEXT, JSONB);
DROP VIEW IF EXISTS public.armadura_modificadores_doc;
DROP TABLE IF EXISTS public.armadura_modificadores;

-- ---------- coleções do site → tabelas (sem armorMods) ----------
CREATE OR REPLACE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'disadvantages' THEN 'desvantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos' WHEN 'weapons' THEN 'armas' WHEN 'armors' THEN 'armaduras'
      WHEN 'items' THEN 'itens' WHEN 'armorLocs' THEN 'armadura_localizacoes'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

CREATE OR REPLACE FUNCTION hounds_interno.gravar(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF COALESCE(p_id, '') = '' THEN RAISE EXCEPTION 'Item sem id.' USING ERRCODE = 'invalid_parameter_value'; END IF;
  IF jsonb_typeof(p_doc) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Dados inválidos para %.', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  CASE hounds_interno.tabela(p_col)
    WHEN 'usuarios' THEN PERFORM hounds_interno.salvar_usuario(p_id, p_doc);
    WHEN 'mapas' THEN PERFORM hounds_interno.salvar_mapa(p_id, p_doc);
    WHEN 'marcadores' THEN PERFORM hounds_interno.salvar_marcador(split_part(p_col, '/', 2), p_id, p_doc);
    WHEN 'locais' THEN PERFORM hounds_interno.salvar_local(p_id, p_doc);
    WHEN 'fichas' THEN PERFORM hounds_interno.salvar_ficha(p_id, p_doc);
    WHEN 'personagens' THEN PERFORM hounds_interno.salvar_personagem(p_id, p_doc);
    WHEN 'organizacoes' THEN PERFORM hounds_interno.salvar_organizacao(p_id, p_doc);
    WHEN 'eventos' THEN PERFORM hounds_interno.salvar_evento(p_id, p_doc);
    WHEN 'cadernos' THEN PERFORM hounds_interno.salvar_caderno(p_id, p_doc);
    WHEN 'anotacoes' THEN PERFORM hounds_interno.salvar_anotacao(p_id, p_doc);
    WHEN 'magias' THEN PERFORM hounds_interno.salvar_magia(p_id, p_doc);
    WHEN 'vantagens' THEN PERFORM hounds_interno.salvar_vantagem(p_id, p_doc);
    WHEN 'desvantagens' THEN PERFORM hounds_interno.salvar_desvantagem(p_id, p_doc);
    WHEN 'pericias' THEN PERFORM hounds_interno.salvar_pericia(p_id, p_doc);
    WHEN 'tecnicas' THEN PERFORM hounds_interno.salvar_tecnica(p_id, p_doc);
    WHEN 'estilos' THEN PERFORM hounds_interno.salvar_estilo(p_id, p_doc);
    WHEN 'armas' THEN PERFORM hounds_interno.salvar_arma(p_id, p_doc);
    WHEN 'armaduras' THEN PERFORM hounds_interno.salvar_armadura(p_id, p_doc);
    WHEN 'itens' THEN PERFORM hounds_interno.salvar_item(p_id, p_doc);
    WHEN 'armadura_localizacoes' THEN PERFORM hounds_interno.salvar_armadura_localizacao(p_id, p_doc);
    WHEN 'mesa_estado' THEN PERFORM hounds_interno.salvar_mesa_estado(p_id, p_doc);
    WHEN 'mesa_partes' THEN PERFORM hounds_interno.salvar_mesa_parte(p_id, p_doc);
    ELSE RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END $$;

CREATE OR REPLACE FUNCTION hounds_interno.autorizar(p_col TEXT, p_id TEXT, p_doc JSONB, p_remover BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  u TEXT;
  papel TEXT;
  mestre BOOLEAN;
  atual JSONB;
BEGIN
  IF hounds_interno.servico() THEN RETURN p_doc; END IF;
  u := hounds_interno.usuario_atual();
  IF u IS NULL THEN
    RAISE EXCEPTION 'Entre com a sua conta para salvar. Se já entrou, recarregue a página.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  papel := hounds_interno.papel_atual();
  mestre := papel = 'mestre';

  IF t = 'usuarios' THEN
    IF COALESCE(papel, '') NOT IN ('mestre', 'admin') THEN
      RAISE EXCEPTION 'Só o Mestre e o Admin podem alterar usuários.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT mestre THEN
      atual := hounds_interno.ler(p_col, p_id) -> 'data';
      IF atual ->> 'role' = 'mestre' THEN
        RAISE EXCEPTION 'Só o Mestre pode alterar ou excluir um Mestre.' USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NOT p_remover AND p_doc ->> 'role' = 'mestre' THEN
        RAISE EXCEPTION 'Só o Mestre pode dar o perfil de Mestre.' USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
    RETURN CASE WHEN p_remover THEN NULL ELSE p_doc END;
  END IF;

  IF t IN ('magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras', 'itens',
           'armadura_localizacoes') AND NOT mestre THEN
    RAISE EXCEPTION 'Só o Mestre pode alterar isto.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t IN ('mesa_estado', 'mesa_partes') THEN RETURN p_doc; END IF; -- a Mesa tem as próprias regras, dentro dela
  atual := hounds_interno.ler(p_col, p_id) -> 'data';
  IF atual IS NOT NULL THEN
    IF NOT mestre AND NOT hounds_interno.pode_ver(atual, u) THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar este item.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_remover THEN RETURN NULL; END IF;
    p_doc := p_doc || jsonb_build_object('createdBy', atual -> 'createdBy');
    IF NOT mestre THEN
      p_doc := p_doc || jsonb_build_object('sharedWith', COALESCE(atual -> 'sharedWith', '[]'::jsonb));
      IF COALESCE(p_doc ->> 'visible', 'true') <> COALESCE(atual ->> 'visible', 'true') AND atual ->> 'createdBy' IS DISTINCT FROM u THEN
        RAISE EXCEPTION 'Só o Mestre e quem criou podem mudar quem vê este item.' USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  ELSIF NOT p_remover THEN
    p_doc := p_doc || jsonb_build_object('createdBy', u);
    IF NOT mestre THEN p_doc := p_doc || jsonb_build_object('sharedWith', '[]'::jsonb); END IF;
  END IF;
  RETURN p_doc;
END $$;

-- ---------- gravação da ficha (ajustes livres) ----------
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

  INSERT INTO public.ficha_armadura_mod (ficha_id, armadura_id, ordem, nome, magia_id, rd, custo, peso)
  SELECT p_id, c.id, (row_number() OVER (PARTITION BY c.id ORDER BY m.n) - 1)::smallint, btrim(m.v ->> 'name'),
         NULLIF(btrim(COALESCE(m.v ->> 'spellId', '')), ''), least(greatest(hounds_interno.inteiro(m.v -> 'dr', 0), -50), 50),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'cost'), 0), 2), -9999999), 9999999),
         least(greatest(round(COALESCE(hounds_interno.numero(m.v -> 'weight'), 0), 2), -99999), 99999)
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

  -- Corpo, mochilas e peças de armadura só com equipamentos da lista desta ficha (as chaves estrangeiras garantem
  -- o mesmo no fim da transação; aqui, com uma mensagem clara).
  IF EXISTS (SELECT 1 FROM (SELECT i.equipamento_id AS eq FROM public.ficha_corpo_item i WHERE i.ficha_id = p_id
                            UNION ALL SELECT m.equipamento_id FROM public.ficha_mochila m WHERE m.ficha_id = p_id AND m.equipamento_id IS NOT NULL
                            UNION ALL SELECT i.equipamento_id FROM public.ficha_mochila_item i WHERE i.ficha_id = p_id
                            UNION ALL SELECT p.equipamento_id FROM public.ficha_armadura_peca p WHERE p.ficha_id = p_id AND p.equipamento_id IS NOT NULL) r
             WHERE NOT EXISTS (SELECT 1 FROM public.ficha_equipamento e WHERE e.ficha_id = p_id AND e.id = r.eq)) THEN
    RAISE EXCEPTION 'Um equipamento do Corpo, das Mochilas ou de um conjunto de armadura não está mais na lista de equipamentos da ficha. Recarregue a página e confira.'
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
