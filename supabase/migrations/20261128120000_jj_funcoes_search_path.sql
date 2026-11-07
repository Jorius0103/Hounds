-- ============================================================
-- 52 · SEARCH_PATH FIXO NAS OUTRAS FUNÇÕES
-- O Security Advisor do Supabase acusa "Function Search Path Mutable"
-- em cada função sem SET search_path (hounds_interno.cor, ...). A 39 e
-- a 51 corrigiram tabela, itens_combate e inserir_itens_combate; estas
-- são as que sobram nas migrations: as auxiliares de leitura e
-- gravação, os triggers e patch_hounds_doc (da base hounds_docs, que é
-- SECURITY DEFINER). Todas já escrevem os nomes com o esquema
-- (public.mapas, hounds_interno.texto) e usam só funções do
-- pg_catalog, então ficam com search_path = '' como as outras, sem
-- mudar o corpo. Uma que não exista no banco é pulada. Ao recriar
-- uma delas com CREATE OR REPLACE, ponha o SET search_path = '' (sem
-- ele, o search_path é apagado). Pode rodar a qualquer momento, e de
-- novo sem efeito.
-- ============================================================

DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.patch_hounds_doc(text, text, jsonb)',
    -- triggers
    'hounds_interno.marcar_gravacao()', 'hounds_interno.tocar_dono()', 'hounds_interno.checar_ciclo_mapa()', 'hounds_interno.checar_ciclo_local()',
    -- leitura (views)
    'hounds_interno.ms(timestamptz)', 'hounds_interno.imagem(text, integer, integer, text, bigint)',
    -- gravação
    'hounds_interno.texto(jsonb, text)', 'hounds_interno.numero(jsonb, numeric)', 'hounds_interno.inteiro(jsonb, integer)',
    'hounds_interno.logico(jsonb, boolean)', 'hounds_interno.ts(jsonb)', 'hounds_interno.lista(jsonb)', 'hounds_interno.lista_ids(jsonb)',
    'hounds_interno.objeto_imagem(jsonb)', 'hounds_interno.usuario(text)', 'hounds_interno.exigir_nome(jsonb, text)',
    'hounds_interno.nota_bonus(integer, jsonb)', 'hounds_interno.texto_lista(jsonb)', 'hounds_interno.partes_validas(text[])',
    'hounds_interno.parte_corpo(text)', 'hounds_interno.cor(jsonb, text)',
    -- migração de hounds_docs
    'hounds_interno.ordem_migracao(text)', 'hounds_interno.vinculos_json(text, text, text, text)', 'hounds_interno.referencias_json(text, text, text)',
    -- permissões
    'hounds_interno.servico()', 'hounds_interno.pode_ver(jsonb, text)'
  ]
  LOOP
    IF to_regprocedure(f) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = %L', to_regprocedure(f), '');
    END IF;
  END LOOP;
END $$;
