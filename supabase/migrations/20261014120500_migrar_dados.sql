-- ============================================================
-- 6/6 · MIGRAÇÃO DOS DADOS DE hounds_docs PARA AS TABELAS
--
-- 1. hounds_docs passa a ser só leitura (antes de copiar, para que
--    nada gravado por uma página antiga se perca no meio do caminho).
--    Os dados continuam lá: nada é apagado.
-- 2. Cada documento é gravado pela mesma função que o site usa
--    (hounds_interno.gravar), com os mesmos ids. São duas passadas,
--    para que um item que aponta para outro gravado depois dele (um
--    mapa e o seu mapa pai) fique com o vínculo.
-- 3. Documento que não pôde ser copiado vai para
--    hounds_interno.migracao_erros, com o motivo.
-- 4. hounds_interno.validar_migracao() compara quantidades e vínculos.
--    O resultado aparece abaixo, ao rodar no SQL Editor, e pode ser
--    consultado de novo a qualquer momento:
--      SELECT * FROM hounds_interno.validar_migracao();
--    Para comparar cada campo de cada item: node tools/validar-migracao.mjs
--
-- Se precisar voltar ao site antigo antes de apagar hounds_docs:
--   GRANT INSERT, UPDATE, DELETE ON public.hounds_docs TO anon, authenticated;
--   CREATE POLICY "Acesso público hounds_docs" ON public.hounds_docs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
--   GRANT EXECUTE ON FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB) TO anon, authenticated;
-- ============================================================

-- ---------- 1. hounds_docs só leitura ----------
DROP POLICY IF EXISTS "Acesso público hounds_docs" ON public.hounds_docs;
DROP POLICY IF EXISTS "Leitura pública hounds_docs" ON public.hounds_docs;
CREATE POLICY "Leitura pública hounds_docs" ON public.hounds_docs FOR SELECT TO anon, authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.hounds_docs FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.hounds_docs IS 'Cópia dos dados de antes das tabelas relacionais, só para leitura. Pode ser apagada depois de validar a migração (SUPABASE.md).';

-- ---------- 2. cópia ----------
CREATE TABLE hounds_interno.migracao_erros (
  col  TEXT NOT NULL,
  id   TEXT NOT NULL,
  erro TEXT NOT NULL,
  em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (col, id)
);
CREATE TABLE hounds_interno.migracao (
  id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  executada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ordem das coleções: quem é apontado vem antes de quem aponta.
CREATE FUNCTION hounds_interno.ordem_migracao(p_col TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE hounds_interno.tabela(p_col)
    WHEN 'usuarios' THEN 1 WHEN 'mapas' THEN 2 WHEN 'fichas' THEN 3 WHEN 'personagens' THEN 4 WHEN 'locais' THEN 5
    WHEN 'organizacoes' THEN 6 WHEN 'eventos' THEN 7 WHEN 'cadernos' THEN 8 WHEN 'anotacoes' THEN 9 WHEN 'marcadores' THEN 10
    ELSE 11 END
$$;

-- Depois da primeira vez, só com p_forcar: copiar de novo substitui o que o site gravou nas
-- tabelas desde então pelo que está em hounds_docs.
CREATE FUNCTION hounds_interno.migrar_documentos(p_forcar BOOLEAN DEFAULT false) RETURNS INTEGER
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  doc RECORD;
  passada INTEGER;
  copiados INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM hounds_interno.migracao) AND NOT p_forcar THEN
    RAISE NOTICE 'A migração já foi feita em %. Nada foi copiado.', (SELECT executada_em FROM hounds_interno.migracao);
    RETURN 0;
  END IF;
  FOR passada IN 1..2 LOOP
    copiados := 0;
    FOR doc IN
      SELECT d.col, d.id, d.data FROM public.hounds_docs d
      ORDER BY hounds_interno.ordem_migracao(d.col), d.col, d.created_at, d.id
    LOOP
      BEGIN
        PERFORM hounds_interno.gravar(doc.col, doc.id, doc.data);
        DELETE FROM hounds_interno.migracao_erros e WHERE e.col = doc.col AND e.id = doc.id;
        copiados := copiados + 1;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO hounds_interno.migracao_erros (col, id, erro) VALUES (doc.col, doc.id, SQLERRM)
        ON CONFLICT (col, id) DO UPDATE SET erro = EXCLUDED.erro, em = now();
      END;
    END LOOP;
  END LOOP;
  INSERT INTO hounds_interno.migracao (id, executada_em) VALUES (1, now()) ON CONFLICT (id) DO UPDATE SET executada_em = now();
  RETURN copiados;
END $$;

-- ---------- 3. validação ----------
-- Quantos pares (documento, id da lista p_campo) existem nos documentos de p_col, contando só ids
-- de documentos que existem em p_alvo (os outros já eram ignorados pelo site). p_chave: para
-- listas de objetos (members, relations), o campo do objeto que tem o id.
CREATE FUNCTION hounds_interno.vinculos_json(p_col TEXT, p_campo TEXT, p_alvo TEXT, p_chave TEXT DEFAULT NULL) RETURNS BIGINT
LANGUAGE sql STABLE AS $$
  SELECT count(DISTINCT (d.id, x.ref))
  FROM public.hounds_docs d
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(d.data -> p_campo)) AS e (v)
  CROSS JOIN LATERAL (SELECT CASE WHEN p_chave IS NULL THEN e.v #>> '{}' ELSE e.v ->> p_chave END AS ref) x
  WHERE d.col = p_col AND x.ref IS NOT NULL AND x.ref <> ''
    AND EXISTS (SELECT 1 FROM public.hounds_docs a WHERE a.col = p_alvo AND a.id = x.ref)
    AND NOT (p_campo = 'relations' AND x.ref = d.id)
$$;

-- Quantos documentos de p_col têm em p_campo o id de um documento de p_alvo.
CREATE FUNCTION hounds_interno.referencias_json(p_col TEXT, p_campo TEXT, p_alvo TEXT) RETURNS BIGINT
LANGUAGE sql STABLE AS $$
  SELECT count(*) FROM public.hounds_docs d
  WHERE (d.col = p_col OR (p_col = 'markers' AND d.col LIKE 'maps/%/markers'))
    AND d.data ->> p_campo IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.hounds_docs a WHERE a.col = p_alvo AND a.id = d.data ->> p_campo AND a.id <> d.id)
$$;

CREATE FUNCTION hounds_interno.validar_migracao()
RETURNS TABLE (verificacao TEXT, esperado BIGINT, encontrado BIGINT, ok BOOLEAN)
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  c TEXT;
  n_doc BIGINT;
  n_tab BIGINT;
BEGIN
  -- Quantidade de itens: documentos de cada coleção que estão na tabela com o mesmo id.
  FOR c IN SELECT DISTINCT CASE WHEN d.col LIKE 'maps/%/markers' THEN 'markers' ELSE d.col END FROM public.hounds_docs d ORDER BY 1 LOOP
    SELECT count(*) INTO n_doc FROM public.hounds_docs d WHERE d.col = c OR (c = 'markers' AND d.col LIKE 'maps/%/markers');
    IF c = 'markers' THEN
      SELECT count(*) INTO n_tab FROM public.hounds_docs d JOIN public.marcadores k ON k.id = d.id AND d.col = 'maps/' || k.mapa_id || '/markers';
    ELSIF hounds_interno.tabela(c) IS NULL THEN
      n_tab := 0;
    ELSE
      EXECUTE format('SELECT count(*) FROM public.hounds_docs d JOIN public.%I t ON t.id = d.id WHERE d.col = $1', hounds_interno.tabela(c))
        INTO n_tab USING c;
    END IF;
    verificacao := 'itens: ' || c || COALESCE(' → ' || hounds_interno.tabela(CASE WHEN c = 'markers' THEN 'maps/x/markers' ELSE c END), ' (coleção desconhecida)');
    esperado := n_doc; encontrado := n_tab; ok := n_doc = n_tab;
    RETURN NEXT;
  END LOOP;

  -- Vínculos: pares (item, item vinculado) nas listas dos documentos e linhas nas tabelas de vínculo.
  RETURN QUERY
  SELECT v.nome, v.esp, v.enc, v.esp = v.enc FROM (VALUES
    ('vínculos: organizations.members → personagem_organizacao', hounds_interno.vinculos_json('organizations', 'members', 'characters', 'charId'), (SELECT count(*) FROM public.personagem_organizacao)),
    ('vínculos: organizations.locationIds → organizacao_local', hounds_interno.vinculos_json('organizations', 'locationIds', 'locations'), (SELECT count(*) FROM public.organizacao_local)),
    ('vínculos: organizations.mapIds → organizacao_mapa', hounds_interno.vinculos_json('organizations', 'mapIds', 'maps'), (SELECT count(*) FROM public.organizacao_mapa)),
    ('vínculos: characters.mapIds → personagem_mapa', hounds_interno.vinculos_json('characters', 'mapIds', 'maps'), (SELECT count(*) FROM public.personagem_mapa)),
    ('vínculos: characters.relations → personagem_relacao', hounds_interno.vinculos_json('characters', 'relations', 'characters', 'charId'), (SELECT count(*) FROM public.personagem_relacao)),
    ('vínculos: locations.characterIds → local_personagem', hounds_interno.vinculos_json('locations', 'characterIds', 'characters'), (SELECT count(*) FROM public.local_personagem)),
    ('vínculos: events.characterIds → evento_personagem', hounds_interno.vinculos_json('events', 'characterIds', 'characters'), (SELECT count(*) FROM public.evento_personagem)),
    ('vínculos: sharedWith → *_compartilhamento',
      (SELECT sum(hounds_interno.vinculos_json(x, 'sharedWith', 'users')) FROM unnest(ARRAY['maps', 'locations', 'characters', 'organizations', 'sheets', 'events',
         'spells', 'advantages', 'skills', 'techniques', 'styles']) AS x)::bigint,
      (SELECT (SELECT count(*) FROM public.mapa_compartilhamento) + (SELECT count(*) FROM public.local_compartilhamento)
            + (SELECT count(*) FROM public.personagem_compartilhamento) + (SELECT count(*) FROM public.organizacao_compartilhamento)
            + (SELECT count(*) FROM public.ficha_compartilhamento) + (SELECT count(*) FROM public.evento_compartilhamento)
            + (SELECT count(*) FROM public.magia_compartilhamento) + (SELECT count(*) FROM public.vantagem_compartilhamento)
            + (SELECT count(*) FROM public.pericia_compartilhamento) + (SELECT count(*) FROM public.tecnica_compartilhamento)
            + (SELECT count(*) FROM public.estilo_compartilhamento))),
    ('referências: characters.sheetId → personagens.ficha_id', hounds_interno.referencias_json('characters', 'sheetId', 'sheets'), (SELECT count(*) FROM public.personagens WHERE ficha_id IS NOT NULL)),
    ('referências: maps.parentId → mapas.mapa_pai_id', hounds_interno.referencias_json('maps', 'parentId', 'maps'), (SELECT count(*) FROM public.mapas WHERE mapa_pai_id IS NOT NULL)),
    ('referências: locations.parentId → locais.local_pai_id', hounds_interno.referencias_json('locations', 'parentId', 'locations'), (SELECT count(*) FROM public.locais WHERE local_pai_id IS NOT NULL)),
    ('referências: locations.mapId → locais.mapa_id', hounds_interno.referencias_json('locations', 'mapId', 'maps'), (SELECT count(*) FROM public.locais WHERE mapa_id IS NOT NULL)),
    ('referências: events.locationId → eventos.local_id', hounds_interno.referencias_json('events', 'locationId', 'locations'), (SELECT count(*) FROM public.eventos WHERE local_id IS NOT NULL)),
    ('referências: notes.notebookId → anotacoes.caderno_id', hounds_interno.referencias_json('notes', 'notebookId', 'notebooks'), (SELECT count(*) FROM public.anotacoes)),
    ('referências: markers.locationId → marcadores.local_id', hounds_interno.referencias_json('markers', 'locationId', 'locations'), (SELECT count(*) FROM public.marcadores WHERE local_id IS NOT NULL)),
    ('referências: markers.linkedMapId → marcadores.mapa_vinculado_id', hounds_interno.referencias_json('markers', 'linkedMapId', 'maps'), (SELECT count(*) FROM public.marcadores WHERE mapa_vinculado_id IS NOT NULL)),
    ('fichas: skills → ficha_pericia',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'skills')) e (v)
        WHERE d.col = 'sheets' AND COALESCE(btrim(e.v ->> 'name'), '') <> ''), (SELECT count(*) FROM public.ficha_pericia)),
    ('fichas: cultures → ficha_cultura',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'cultures')) e (v)
        WHERE d.col = 'sheets' AND COALESCE(btrim(e.v ->> 'name'), '') <> ''), (SELECT count(*) FROM public.ficha_cultura)),
    ('fichas: advs → ficha_vantagem',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'advs')) e (v)
        WHERE d.col = 'sheets' AND COALESCE(btrim(e.v ->> 'name'), '') <> ''), (SELECT count(*) FROM public.ficha_vantagem)),
    ('fichas: combat.styles → ficha_estilo',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'combat' -> 'styles')) e (v)
        WHERE d.col = 'sheets'), (SELECT count(*) FROM public.ficha_estilo)),
    ('fichas: itens de combate → ficha_item_combate',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'combat' -> 'general')) e (v) WHERE d.col = 'sheets')
      + (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'combat' -> 'styles')) s (v),
           jsonb_array_elements(hounds_interno.lista(s.v -> 'items')) e (v) WHERE d.col = 'sheets'),
      (SELECT count(*) FROM public.ficha_item_combate)),
    ('fichas: combat.weapons → ficha_arma',
      (SELECT count(*) FROM public.hounds_docs d, jsonb_array_elements(hounds_interno.lista(d.data -> 'combat' -> 'weapons')) e (v)
        WHERE d.col = 'sheets'), (SELECT count(*) FROM public.ficha_arma)),
    ('documentos com erro na cópia (hounds_interno.migracao_erros)', 0::bigint, (SELECT count(*) FROM hounds_interno.migracao_erros))
  ) AS v (nome, esp, enc);
END $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hounds_interno FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.ms(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.imagem(TEXT, INTEGER, INTEGER, TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.itens_combate(TEXT, SMALLINT) TO anon, authenticated;
REVOKE ALL ON hounds_interno.migracao_erros, hounds_interno.migracao FROM anon, authenticated;

-- ---------- 4. executa e mostra o resultado ----------
SELECT hounds_interno.migrar_documentos() AS documentos_copiados;
SELECT * FROM hounds_interno.migracao_erros;
SELECT * FROM hounds_interno.validar_migracao();
