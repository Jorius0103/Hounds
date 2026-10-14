-- ============================================================
-- 4/6 · FUNÇÕES DE GRAVAÇÃO (RPC)
-- O site não grava direto nas tabelas (veja as permissões na 5/6).
-- Toda gravação passa por uma destas funções, que rodam numa
-- transação só: ou a tabela principal e todos os vínculos mudam
-- juntos, ou nada muda.
--
--   hounds_put(col, id, doc)      grava o item inteiro (cria ou substitui)
--   hounds_patch(col, id, campos) muda só os campos enviados
--   hounds_remove(col, id)        exclui (com as regras de cada entidade)
--   hounds_remove_many(col, ids)  exclui vários de uma vez
--   hounds_trocar_imagem_mapa(...) troca a imagem do mapa e exclui os marcadores
--
-- "col" é o nome da coleção que o site usa (maps, characters,
-- maps/<id>/markers...). "doc" é o item no formato do site; cada
-- campo vai para a sua coluna ou tabela de vínculo. Os campos são
-- limpos com as mesmas regras do site (js/tabs/*.js), e ids de
-- itens que não existem mais são ignorados, como o site já faz.
-- ============================================================

-- ---------- conversões de valores do JSON enviado pelo site ----------
CREATE FUNCTION hounds_interno.texto(p JSONB, padrao TEXT DEFAULT NULL) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE jsonb_typeof(p) WHEN 'string' THEN p #>> '{}' WHEN 'number' THEN p #>> '{}' WHEN 'boolean' THEN p #>> '{}' ELSE padrao END
$$;

CREATE FUNCTION hounds_interno.numero(p JSONB, padrao NUMERIC DEFAULT NULL) RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'number' THEN (p #>> '{}')::numeric
              WHEN jsonb_typeof(p) = 'string' AND (p #>> '{}') ~ '^\s*-?\d+(\.\d+)?\s*$' THEN btrim(p #>> '{}')::numeric
              ELSE padrao END
$$;

CREATE FUNCTION hounds_interno.inteiro(p JSONB, padrao INTEGER DEFAULT NULL) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$ SELECT COALESCE(round(hounds_interno.numero(p))::integer, padrao) $$;

CREATE FUNCTION hounds_interno.logico(p JSONB, padrao BOOLEAN DEFAULT NULL) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN jsonb_typeof(p) = 'boolean' THEN (p #>> '{}')::boolean ELSE padrao END $$;

-- createdAt/updatedAt (milissegundos) para TIMESTAMPTZ.
CREATE FUNCTION hounds_interno.ts(p JSONB) RETURNS TIMESTAMPTZ
LANGUAGE sql IMMUTABLE AS $$ SELECT to_timestamp(hounds_interno.numero(p) / 1000) $$;

CREATE FUNCTION hounds_interno.lista(p JSONB) RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN jsonb_typeof(p) = 'array' THEN p ELSE '[]'::jsonb END $$;

-- Os ids de uma lista, cada um uma vez (vale a primeira posição), com a posição.
CREATE FUNCTION hounds_interno.lista_ids(p JSONB) RETURNS TABLE (id TEXT, ordem INTEGER)
LANGUAGE sql IMMUTABLE AS $$
  SELECT e.v #>> '{}', (min(e.n) - 1)::integer
  FROM jsonb_array_elements(hounds_interno.lista(p)) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'string' AND e.v #>> '{}' <> ''
  GROUP BY 1
$$;

-- A imagem ({ ref, w, h, type, size }) ou null.
CREATE FUNCTION hounds_interno.objeto_imagem(p JSONB) RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'object' AND COALESCE(p ->> 'ref', '') <> '' THEN p END
$$;

-- O usuário, se a conta existe (um id de conta excluída vira "sem dono", como item antigo).
CREATE FUNCTION hounds_interno.usuario(p TEXT) RETURNS TEXT
LANGUAGE sql STABLE AS $$ SELECT u.id FROM public.usuarios u WHERE u.id = p $$;

CREATE FUNCTION hounds_interno.exigir_nome(p JSONB, mensagem TEXT) RETURNS VOID
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF COALESCE(btrim(hounds_interno.texto(p)), '') = '' THEN
    RAISE EXCEPTION '%', mensagem USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- Substitui a lista de vínculos de um item (p_tabela, coluna do item p_col_dono, coluna do
-- vinculado p_col_item) pelos ids de p_lista que existem em p_alvo.
CREATE FUNCTION hounds_interno.gravar_vinculos(p_tabela TEXT, p_col_dono TEXT, p_col_item TEXT, p_dono TEXT, p_lista JSONB, p_alvo TEXT)
RETURNS VOID LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  EXECUTE format('DELETE FROM public.%I WHERE %I = $1', p_tabela, p_col_dono) USING p_dono;
  EXECUTE format(
    'INSERT INTO public.%1$I (%2$I, %3$I, ordem)
     SELECT $1, v.id, v.ordem FROM hounds_interno.lista_ids($2) v
     WHERE EXISTS (SELECT 1 FROM public.%4$I a WHERE a.id = v.id)',
    p_tabela, p_col_dono, p_col_item, p_alvo) USING p_dono, p_lista;
END $$;

-- ---------- coleção do site → tabela ----------
CREATE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- O item como o site o lê (a linha da view <tabela>_doc), ou null.
CREATE FUNCTION hounds_interno.ler(p_col TEXT, p_id TEXT, p_com_dados BOOLEAN DEFAULT true) RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  r JSONB;
BEGIN
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col; END IF;
  EXECUTE format('SELECT jsonb_build_object(''id'', d.id, ''updated_at'', d.updated_at%s) FROM public.%I d WHERE d.id = $1%s',
      CASE WHEN p_com_dados THEN ', ''data'', d.data' ELSE '' END, t || '_doc',
      CASE WHEN t = 'marcadores' THEN ' AND d.mapa_id = $2' ELSE '' END)
    INTO r USING p_id, split_part(p_col, '/', 2);
  RETURN r;
END $$;

-- ============================================================
-- Gravação de cada entidade
-- ============================================================

CREATE FUNCTION hounds_interno.salvar_usuario(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do usuário.');
  INSERT INTO public.usuarios AS t (id, nome, papel, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'role'), 'jogador'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, papel, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.papel, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

CREATE FUNCTION hounds_interno.salvar_mapa(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do mapa.');
  INSERT INTO public.mapas AS t (id, nome, mapa_pai_id, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                 visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'),
          (SELECT m.id FROM public.mapas m WHERE m.id = d ->> 'parentId' AND m.id <> p_id),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, mapa_pai_id, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.mapa_pai_id, EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo,
         EXCLUDED.imagem_tamanho, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('mapa_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_marcador(p_mapa TEXT, p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  x NUMERIC := hounds_interno.numero(d -> 'x');
  y NUMERIC := hounds_interno.numero(d -> 'y');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mapas m WHERE m.id = p_mapa) THEN
    RAISE EXCEPTION 'Esse mapa não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF x IS NULL OR y IS NULL OR x NOT BETWEEN 0 AND 1 OR y NOT BETWEEN 0 AND 1 THEN
    RAISE EXCEPTION 'O marcador precisa ficar dentro da imagem do mapa.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.marcadores AS t (id, mapa_id, x, y, titulo, descricao, categoria, local_id, mapa_vinculado_id,
                                      visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, p_mapa, x, y, COALESCE(hounds_interno.texto(d -> 'title'), ''), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          hounds_interno.texto(d -> 'category'),
          (SELECT l.id FROM public.locais l WHERE l.id = d ->> 'locationId'),
          (SELECT m.id FROM public.mapas m WHERE m.id = d ->> 'linkedMapId'),
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (mapa_id, x, y, titulo, descricao, categoria, local_id, mapa_vinculado_id, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.mapa_id, EXCLUDED.x, EXCLUDED.y, EXCLUDED.titulo, EXCLUDED.descricao, EXCLUDED.categoria, EXCLUDED.local_id,
         EXCLUDED.mapa_vinculado_id, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

CREATE FUNCTION hounds_interno.salvar_local(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
  img2 JSONB := hounds_interno.objeto_imagem(d -> 'image2');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do local.');
  INSERT INTO public.locais AS t (id, nome, descricao, mapa_id, local_pai_id,
                                  imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  imagem2_ref, imagem2_largura, imagem2_altura, imagem2_tipo, imagem2_tamanho,
                                  visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          (SELECT m.id FROM public.mapas m WHERE m.id = d ->> 'mapId'),
          (SELECT l.id FROM public.locais l WHERE l.id = d ->> 'parentId' AND l.id <> p_id),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          img2 ->> 'ref', hounds_interno.inteiro(img2 -> 'w'), hounds_interno.inteiro(img2 -> 'h'), img2 ->> 'type', hounds_interno.numero(img2 -> 'size')::bigint,
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, mapa_id, local_pai_id,
                                  imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  imagem2_ref, imagem2_largura, imagem2_altura, imagem2_tipo, imagem2_tamanho,
                                  visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.mapa_id, EXCLUDED.local_pai_id,
         EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho,
         EXCLUDED.imagem2_ref, EXCLUDED.imagem2_largura, EXCLUDED.imagem2_altura, EXCLUDED.imagem2_tipo, EXCLUDED.imagem2_tamanho,
         EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('local_personagem', 'local_id', 'personagem_id', p_id, d -> 'characterIds', 'personagens');
  PERFORM hounds_interno.gravar_vinculos('local_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- Itens da seção Combate (estilo p_estilo, ou nulo para "Gerais"), limpos como em cleanCombatItem.
CREATE FUNCTION hounds_interno.inserir_itens_combate(p_ficha TEXT, p_estilo SMALLINT, p_itens JSONB) RETURNS VOID
LANGUAGE sql AS $$
  INSERT INTO public.ficha_item_combate (ficha_id, estilo_ordem, ordem, tipo, nome, pontos, bonus, atributo, dificuldade, pericia_id,
                                         pericia_base, padrao, limite, tecnica_id)
  SELECT p_ficha, p_estilo, (i.n - 1)::smallint, k.tipo, COALESCE(i.v ->> 'name', ''),
         greatest(hounds_interno.inteiro(i.v -> 'pts', CASE k.tipo WHEN 'tech' THEN 0 ELSE 1 END), 0),
         CASE WHEN k.tipo <> 'trait' THEN hounds_interno.inteiro(i.v -> 'bonus', 0) END,
         CASE WHEN k.tipo = 'skill' THEN CASE WHEN i.v ->> 'attr' IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN i.v ->> 'attr' ELSE 'DX' END END,
         CASE k.tipo WHEN 'skill' THEN CASE WHEN i.v ->> 'diff' IN ('E', 'A', 'H', 'VH') THEN i.v ->> 'diff' ELSE 'A' END
                     WHEN 'tech' THEN CASE WHEN i.v ->> 'diff' = 'A' THEN 'A' ELSE 'H' END END,
         CASE WHEN k.tipo = 'skill' THEN NULLIF(i.v ->> 'skillId', '') END,
         CASE WHEN k.tipo = 'tech' THEN COALESCE(i.v ->> 'base', '') END,
         CASE WHEN k.tipo = 'tech' THEN hounds_interno.inteiro(i.v -> 'def', 0) END,
         CASE WHEN k.tipo = 'tech' THEN hounds_interno.inteiro(i.v -> 'max') END,
         CASE WHEN k.tipo = 'tech' THEN NULLIF(i.v ->> 'techId', '') END
  FROM jsonb_array_elements(hounds_interno.lista(p_itens)) WITH ORDINALITY AS i (v, n)
  CROSS JOIN LATERAL (SELECT CASE WHEN i.v ->> 'kind' IN ('tech', 'trait') THEN i.v ->> 'kind' ELSE 'skill' END AS tipo) k
  WHERE jsonb_typeof(i.v) = 'object'
$$;

CREATE FUNCTION hounds_interno.salvar_ficha(p_id TEXT, d JSONB) RETURNS VOID
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
                                  bonus_defesa, visivel, criado_por, criado_em, atualizado_em)
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
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, st, dx, iq, ht, per, vontade, per_base, vontade_base, pv, pf, velocidade, deslocamento,
                                  carga, metal, penalidade_magia, posicao_gerais, aparar, aparar_bonus, bloqueio, bloqueio_bonus, esquiva_bonus,
                                  bonus_defesa, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.st, EXCLUDED.dx, EXCLUDED.iq, EXCLUDED.ht, EXCLUDED.per, EXCLUDED.vontade,
         EXCLUDED.per_base, EXCLUDED.vontade_base, EXCLUDED.pv, EXCLUDED.pf, EXCLUDED.velocidade, EXCLUDED.deslocamento, EXCLUDED.carga,
         EXCLUDED.metal, EXCLUDED.penalidade_magia, EXCLUDED.posicao_gerais, EXCLUDED.aparar, EXCLUDED.aparar_bonus, EXCLUDED.bloqueio,
         EXCLUDED.bloqueio_bonus, EXCLUDED.esquiva_bonus, EXCLUDED.bonus_defesa, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- As listas da ficha são regravadas inteiras, na ordem recebida.
  DELETE FROM public.ficha_pericia WHERE ficha_id = p_id;
  DELETE FROM public.ficha_cultura WHERE ficha_id = p_id;
  DELETE FROM public.ficha_vantagem WHERE ficha_id = p_id;
  DELETE FROM public.ficha_item_combate WHERE ficha_id = p_id;
  DELETE FROM public.ficha_estilo WHERE ficha_id = p_id;
  DELETE FROM public.ficha_arma WHERE ficha_id = p_id;

  -- Perícias (cleanSkill): sem nome não entra.
  INSERT INTO public.ficha_pericia (ficha_id, ordem, nome, atributo, dificuldade, pontos, bonus, pericia_id)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name',
         CASE WHEN e.v ->> 'attr' IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN e.v ->> 'attr' ELSE 'IQ' END,
         CASE WHEN e.v ->> 'diff' IN ('E', 'A', 'H', 'VH') THEN e.v ->> 'diff' ELSE 'A' END,
         greatest(hounds_interno.inteiro(e.v -> 'pts', 1), 0), hounds_interno.inteiro(e.v -> 'bonus', 0), NULLIF(e.v ->> 'skillId', '')
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

  PERFORM hounds_interno.gravar_vinculos('ficha_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_personagem(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
  ficha TEXT := (SELECT f.id FROM public.fichas f WHERE f.id = d ->> 'sheetId');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do personagem.');
  -- Uma ficha é de um personagem só: quem estava com ela perde o vínculo (como Ops.setCharSheet).
  IF ficha IS NOT NULL THEN
    UPDATE public.personagens SET ficha_id = NULL, atualizado_em = now() WHERE ficha_id = ficha AND id <> p_id;
  END IF;
  INSERT INTO public.personagens AS t (id, nome, descricao, raca, organizacao_antiga, ficha_id,
                                       imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                       origem, mesa_id, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          COALESCE(hounds_interno.texto(d -> 'race'), ''), COALESCE(hounds_interno.texto(d -> 'organization'), ''), ficha,
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          COALESCE(hounds_interno.texto(d -> 'source'), 'manual'), hounds_interno.texto(d -> 'mesaId'),
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, raca, organizacao_antiga, ficha_id,
                                  imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  origem, mesa_id, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.raca, EXCLUDED.organizacao_antiga, EXCLUDED.ficha_id,
         EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho,
         EXCLUDED.origem, EXCLUDED.mesa_id, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  PERFORM hounds_interno.gravar_vinculos('personagem_mapa', 'personagem_id', 'mapa_id', p_id, d -> 'mapIds', 'mapas');
  PERFORM hounds_interno.gravar_vinculos('personagem_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');

  -- Relações: cada outro personagem uma vez (vale a primeira), nunca consigo mesmo.
  DELETE FROM public.personagem_relacao WHERE personagem_id = p_id;
  INSERT INTO public.personagem_relacao (personagem_id, relacionado_id, tipo, ordem)
  SELECT DISTINCT ON (r.v ->> 'charId') p_id, r.v ->> 'charId', COALESCE(r.v ->> 'type', ''), (r.n - 1)::smallint
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'relations')) WITH ORDINALITY AS r (v, n)
  WHERE jsonb_typeof(r.v) = 'object' AND r.v ->> 'charId' <> p_id
    AND EXISTS (SELECT 1 FROM public.personagens o WHERE o.id = r.v ->> 'charId')
  ORDER BY r.v ->> 'charId', r.n;
END $$;

CREATE FUNCTION hounds_interno.salvar_organizacao(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome da organização.');
  INSERT INTO public.organizacoes AS t (id, nome, descricao, reputacao, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                        visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'description'), ''), COALESCE(hounds_interno.texto(d -> 'reputation'), ''),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, reputacao, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.reputacao, EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura,
         EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- Membros: cada personagem uma vez (vale a primeira entrada), com o cargo.
  DELETE FROM public.personagem_organizacao WHERE organizacao_id = p_id;
  INSERT INTO public.personagem_organizacao (organizacao_id, personagem_id, cargo, ordem)
  SELECT DISTINCT ON (m.v ->> 'charId') p_id, m.v ->> 'charId', COALESCE(m.v ->> 'rank', ''), (m.n - 1)::smallint
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'members')) WITH ORDINALITY AS m (v, n)
  WHERE jsonb_typeof(m.v) = 'object' AND EXISTS (SELECT 1 FROM public.personagens p WHERE p.id = m.v ->> 'charId')
  ORDER BY m.v ->> 'charId', m.n;

  PERFORM hounds_interno.gravar_vinculos('organizacao_local', 'organizacao_id', 'local_id', p_id, d -> 'locationIds', 'locais');
  PERFORM hounds_interno.gravar_vinculos('organizacao_mapa', 'organizacao_id', 'mapa_id', p_id, d -> 'mapIds', 'mapas');
  PERFORM hounds_interno.gravar_vinculos('organizacao_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_evento(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do evento.');
  INSERT INTO public.eventos AS t (id, nome, data_texto, descricao, local_id, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                   visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'date'), ''), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          (SELECT l.id FROM public.locais l WHERE l.id = d ->> 'locationId'),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, data_texto, descricao, local_id, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.data_texto, EXCLUDED.descricao, EXCLUDED.local_id, EXCLUDED.imagem_ref, EXCLUDED.imagem_largura,
         EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('evento_personagem', 'evento_id', 'personagem_id', p_id, d -> 'characterIds', 'personagens');
  PERFORM hounds_interno.gravar_vinculos('evento_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_caderno(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o título.');
  INSERT INTO public.cadernos AS t (id, nome, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

CREATE FUNCTION hounds_interno.salvar_anotacao(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  caderno TEXT := (SELECT n.id FROM public.cadernos n WHERE n.id = d ->> 'notebookId');
BEGIN
  IF caderno IS NULL THEN
    RAISE EXCEPTION 'Esse título não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  INSERT INTO public.anotacoes AS t (id, caderno_id, titulo, corpo, formato, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, caderno, COALESCE(hounds_interno.texto(d -> 'title'), ''), COALESCE(hounds_interno.texto(d -> 'body'), ''),
          hounds_interno.texto(d -> 'format'), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (caderno_id, titulo, corpo, formato, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.caderno_id, EXCLUDED.titulo, EXCLUDED.corpo, EXCLUDED.formato, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

-- Catálogos: campo que não veio fica nulo (numa entrada dos livros, segue o livro).
CREATE FUNCTION hounds_interno.salvar_magia(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.magias AS t (id, nome, dificuldade, classe, escola, tempo_conjuracao, duracao, custo_inicial, custo_manutencao,
                                  prerequisitos, descricao, item, pagina, fonte, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'difficulty'), hounds_interno.texto(d -> 'class'),
          hounds_interno.texto(d -> 'college'), hounds_interno.texto(d -> 'timeToCast'), hounds_interno.texto(d -> 'duration'),
          hounds_interno.texto(d -> 'initialCost'), hounds_interno.texto(d -> 'maintenanceCost'), hounds_interno.texto(d -> 'prerequisites'),
          hounds_interno.texto(d -> 'description'), hounds_interno.texto(d -> 'item'), hounds_interno.texto(d -> 'page'),
          hounds_interno.texto(d -> 'source'), hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true),
          hounds_interno.usuario(d ->> 'createdBy'), COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, dificuldade, classe, escola, tempo_conjuracao, duracao, custo_inicial, custo_manutencao,
                                  prerequisitos, descricao, item, pagina, fonte, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.dificuldade, EXCLUDED.classe, EXCLUDED.escola, EXCLUDED.tempo_conjuracao, EXCLUDED.duracao,
         EXCLUDED.custo_inicial, EXCLUDED.custo_manutencao, EXCLUDED.prerequisitos, EXCLUDED.descricao, EXCLUDED.item, EXCLUDED.pagina,
         EXCLUDED.fonte, EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('magia_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_vantagem(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.vantagens AS t (id, nome, custo, tipo, livro, pagina, descricao, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'type'),
          hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'), hounds_interno.texto(d -> 'description'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, custo, tipo, livro, pagina, descricao, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.custo, EXCLUDED.tipo, EXCLUDED.livro, EXCLUDED.pagina, EXCLUDED.descricao, EXCLUDED.excluida,
         EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('vantagem_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_pericia(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.pericias AS t (id, nome, tipo, atributo, dificuldade, especializacao, cinematica, padroes, prerequisitos, descricao,
                                    modificadores, livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'type'), hounds_interno.texto(d -> 'attribute'),
          hounds_interno.texto(d -> 'difficulty'), hounds_interno.logico(d -> 'specialty'), hounds_interno.logico(d -> 'cinematic'),
          hounds_interno.texto(d -> 'defaults'), hounds_interno.texto(d -> 'prerequisites'), hounds_interno.texto(d -> 'description'),
          hounds_interno.texto(d -> 'modifiers'), hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, tipo, atributo, dificuldade, especializacao, cinematica, padroes, prerequisitos, descricao,
                                  modificadores, livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.tipo, EXCLUDED.atributo, EXCLUDED.dificuldade, EXCLUDED.especializacao, EXCLUDED.cinematica,
         EXCLUDED.padroes, EXCLUDED.prerequisitos, EXCLUDED.descricao, EXCLUDED.modificadores, EXCLUDED.livro, EXCLUDED.pagina,
         EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('pericia_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_tecnica(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.tecnicas AS t (id, nome, dificuldade, cinematica, padroes, prerequisitos, descricao, modificadores, livro, pagina,
                                    excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'difficulty'), hounds_interno.logico(d -> 'cinematic'),
          hounds_interno.texto(d -> 'defaults'), hounds_interno.texto(d -> 'prerequisites'), hounds_interno.texto(d -> 'description'),
          hounds_interno.texto(d -> 'modifiers'), hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, dificuldade, cinematica, padroes, prerequisitos, descricao, modificadores, livro, pagina,
                                  excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.dificuldade, EXCLUDED.cinematica, EXCLUDED.padroes, EXCLUDED.prerequisitos, EXCLUDED.descricao,
         EXCLUDED.modificadores, EXCLUDED.livro, EXCLUDED.pagina, EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('tecnica_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_estilo(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.estilos AS t (id, nome, custo, descricao, pericias, tecnicas, pericias_cinematicas, tecnicas_cinematicas, perks,
                                   vantagens_opcionais, desvantagens_opcionais, pericias_opcionais, tecnicas_opcionais, perks_opcionais,
                                   livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'description'),
          hounds_interno.texto(d -> 'skills'), hounds_interno.texto(d -> 'techniques'), hounds_interno.texto(d -> 'cinematicSkills'),
          hounds_interno.texto(d -> 'cinematicTechniques'), hounds_interno.texto(d -> 'perks'), hounds_interno.texto(d -> 'optAdvantages'),
          hounds_interno.texto(d -> 'optDisadvantages'), hounds_interno.texto(d -> 'optSkills'), hounds_interno.texto(d -> 'optTechniques'),
          hounds_interno.texto(d -> 'optPerks'), hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, custo, descricao, pericias, tecnicas, pericias_cinematicas, tecnicas_cinematicas, perks,
                                  vantagens_opcionais, desvantagens_opcionais, pericias_opcionais, tecnicas_opcionais, perks_opcionais,
                                  livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.custo, EXCLUDED.descricao, EXCLUDED.pericias, EXCLUDED.tecnicas, EXCLUDED.pericias_cinematicas,
         EXCLUDED.tecnicas_cinematicas, EXCLUDED.perks, EXCLUDED.vantagens_opcionais, EXCLUDED.desvantagens_opcionais,
         EXCLUDED.pericias_opcionais, EXCLUDED.tecnicas_opcionais, EXCLUDED.perks_opcionais, EXCLUDED.livro, EXCLUDED.pagina,
         EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('estilo_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- Mesa: os metadados em colunas e o estado do app da Mesa como ele mandou.
CREATE FUNCTION hounds_interno.salvar_mesa_estado(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.mesa_estado AS t (id, rev, partes, autor, estado, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'rev'), greatest(hounds_interno.inteiro(d -> 'n', 0), 0), hounds_interno.texto(d -> 'by'),
          d - ARRAY['rev', 'n', 'by', 'createdAt', 'updatedAt'],
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (rev, partes, autor, estado, criado_em, atualizado_em) =
    ROW (EXCLUDED.rev, EXCLUDED.partes, EXCLUDED.autor, EXCLUDED.estado, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

CREATE FUNCTION hounds_interno.salvar_mesa_parte(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.mesa_partes AS t (id, rev, indice, parte, criado_em)
  VALUES (p_id, COALESCE(hounds_interno.texto(d -> 'rev'), ''), greatest(hounds_interno.inteiro(d -> 'i', 0), 0),
          COALESCE(hounds_interno.texto(d -> 'part'), ''), COALESCE(hounds_interno.ts(d -> 'createdAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (rev, indice, parte, criado_em) = ROW (EXCLUDED.rev, EXCLUDED.indice, EXCLUDED.parte, EXCLUDED.criado_em);
END $$;

-- Grava o item da coleção p_col.
CREATE FUNCTION hounds_interno.gravar(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS VOID
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
    WHEN 'pericias' THEN PERFORM hounds_interno.salvar_pericia(p_id, p_doc);
    WHEN 'tecnicas' THEN PERFORM hounds_interno.salvar_tecnica(p_id, p_doc);
    WHEN 'estilos' THEN PERFORM hounds_interno.salvar_estilo(p_id, p_doc);
    WHEN 'mesa_estado' THEN PERFORM hounds_interno.salvar_mesa_estado(p_id, p_doc);
    WHEN 'mesa_partes' THEN PERFORM hounds_interno.salvar_mesa_parte(p_id, p_doc);
    ELSE RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END $$;

-- ============================================================
-- Exclusões com as regras do site (as mesmas de Ops.deleteMap e Ops.deleteLocation, em mundo.js)
-- ============================================================

-- Mapa: os submapas e os locais dele sobem para o mapa pai (ou para o topo); personagens e
-- organizações ligados a ele passam a ficar no mapa pai; marcadores de outros mapas que levavam
-- a ele perdem o vínculo. Os marcadores dele vão junto (ON DELETE CASCADE).
CREATE FUNCTION hounds_interno.remover_mapa(p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  acima TEXT;
BEGIN
  SELECT m.mapa_pai_id INTO acima FROM public.mapas m WHERE m.id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.mapas SET mapa_pai_id = acima, atualizado_em = now() WHERE mapa_pai_id = p_id;
  UPDATE public.locais SET mapa_id = acima, atualizado_em = now() WHERE mapa_id = p_id;
  IF acima IS NOT NULL THEN
    INSERT INTO public.personagem_mapa (personagem_id, mapa_id, ordem)
      SELECT v.personagem_id, acima, v.ordem FROM public.personagem_mapa v WHERE v.mapa_id = p_id
      ON CONFLICT DO NOTHING;
    INSERT INTO public.organizacao_mapa (organizacao_id, mapa_id, ordem)
      SELECT v.organizacao_id, acima, v.ordem FROM public.organizacao_mapa v WHERE v.mapa_id = p_id
      ON CONFLICT DO NOTHING;
  END IF;
  UPDATE public.marcadores SET mapa_vinculado_id = NULL, atualizado_em = now() WHERE mapa_vinculado_id = p_id AND mapa_id <> p_id;
  DELETE FROM public.mapas WHERE id = p_id;
END $$;

-- Local: os sublocais sobem para o local pai; marcadores e eventos que apontavam para ele
-- ficam sem local; organizações e personagens perdem o vínculo (ON DELETE CASCADE).
CREATE FUNCTION hounds_interno.remover_local(p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  acima TEXT;
BEGIN
  SELECT l.local_pai_id INTO acima FROM public.locais l WHERE l.id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.locais SET local_pai_id = acima, atualizado_em = now() WHERE local_pai_id = p_id;
  UPDATE public.marcadores SET local_id = NULL, atualizado_em = now() WHERE local_id = p_id;
  UPDATE public.eventos SET local_id = NULL, atualizado_em = now() WHERE local_id = p_id;
  DELETE FROM public.locais WHERE id = p_id;
END $$;

CREATE FUNCTION hounds_interno.remover(p_col TEXT, p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
BEGIN
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  IF t = 'mapas' THEN PERFORM hounds_interno.remover_mapa(p_id);
  ELSIF t = 'locais' THEN PERFORM hounds_interno.remover_local(p_id);
  ELSIF t = 'marcadores' THEN DELETE FROM public.marcadores WHERE id = p_id AND mapa_id = split_part(p_col, '/', 2);
  ELSIF t = 'fichas' THEN
    -- Os personagens ligados a ela ficam sem ficha (como Ops.deleteSheet).
    UPDATE public.personagens SET ficha_id = NULL, atualizado_em = now() WHERE ficha_id = p_id;
    DELETE FROM public.fichas WHERE id = p_id;
  ELSE
    -- Personagens, organizações, eventos, títulos (com as anotações), usuários...: os vínculos
    -- saem pelas chaves estrangeiras (ON DELETE CASCADE / SET NULL).
    EXECUTE format('DELETE FROM public.%I WHERE id = $1', t) USING p_id;
  END IF;
END $$;

-- ============================================================
-- Funções chamadas pelo site (SECURITY DEFINER: as únicas que podem gravar; veja a 5/6)
-- ============================================================

-- Grava o item inteiro e devolve como ficou ({ id, data, updated_at }; a Mesa só { id, updated_at }).
CREATE FUNCTION public.hounds_put(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM hounds_interno.gravar(p_col, p_id, p_doc);
  RETURN hounds_interno.ler(p_col, p_id, p_col NOT IN ('mesa', 'mesa_chunks'));
END $$;

-- Muda só os campos de p_patch (os outros ficam como estão).
CREATE FUNCTION public.hounds_patch(p_col TEXT, p_id TEXT, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  atual JSONB;
BEGIN
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Dados inválidos para %.', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  -- Duas mudanças ao mesmo tempo no mesmo item esperam uma pela outra, e nenhuma se perde.
  EXECUTE format('SELECT 1 FROM public.%I WHERE id = $1 FOR UPDATE', t) USING p_id;
  atual := hounds_interno.ler(p_col, p_id) -> 'data';
  IF atual IS NULL THEN
    RAISE EXCEPTION 'Esse item não existe mais. Recarregue a página.' USING ERRCODE = 'no_data_found';
  END IF;
  PERFORM hounds_interno.gravar(p_col, p_id, atual || p_patch);
  RETURN hounds_interno.ler(p_col, p_id, p_col NOT IN ('mesa', 'mesa_chunks'));
END $$;

CREATE FUNCTION public.hounds_remove(p_col TEXT, p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM hounds_interno.remover(p_col, p_id);
END $$;

CREATE FUNCTION public.hounds_remove_many(p_col TEXT, p_ids TEXT[]) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  i TEXT;
BEGIN
  FOREACH i IN ARRAY COALESCE(p_ids, ARRAY[]::TEXT[]) LOOP
    PERFORM hounds_interno.remover(p_col, i);
  END LOOP;
END $$;

-- A nova imagem de um mapa. As posições dos marcadores valem só para a imagem antiga, então
-- todos os marcadores do mapa são excluídos; havendo marcadores, só com p_confirmado (o
-- formulário pergunta antes). Sem confirmação, o erro traz hint 'markers_exist' e a contagem
-- em detail. Devolve { removidos, imagemAnterior } para o site apagar o arquivo antigo.
CREATE FUNCTION public.hounds_trocar_imagem_mapa(p_mapa_id TEXT, p_imagem JSONB, p_confirmado BOOLEAN, p_atualizado_em BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(p_imagem);
  anterior TEXT;
  n INTEGER;
BEGIN
  SELECT m.imagem_ref INTO anterior FROM public.mapas m WHERE m.id = p_mapa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esse mapa não existe mais.' USING ERRCODE = 'no_data_found'; END IF;
  IF img IS NULL THEN RAISE EXCEPTION 'Selecione a nova imagem do mapa.' USING ERRCODE = 'invalid_parameter_value'; END IF;
  SELECT count(*) INTO n FROM public.marcadores k WHERE k.mapa_id = p_mapa_id;
  IF n > 0 AND p_confirmado IS NOT TRUE THEN
    RAISE EXCEPTION 'Este mapa tem % %. Confirme a troca da imagem, que exclui todos eles.', n, CASE WHEN n = 1 THEN 'marcador' ELSE 'marcadores' END
      USING ERRCODE = 'check_violation', HINT = 'markers_exist', DETAIL = n::text;
  END IF;
  DELETE FROM public.marcadores WHERE mapa_id = p_mapa_id;
  UPDATE public.mapas SET imagem_ref = img ->> 'ref', imagem_largura = hounds_interno.inteiro(img -> 'w'), imagem_altura = hounds_interno.inteiro(img -> 'h'),
         imagem_tipo = img ->> 'type', imagem_tamanho = hounds_interno.numero(img -> 'size')::bigint,
         atualizado_em = COALESCE(hounds_interno.ts(to_jsonb(p_atualizado_em)), now())
   WHERE id = p_mapa_id;
  RETURN jsonb_build_object('removidos', n, 'imagemAnterior', anterior);
END $$;
