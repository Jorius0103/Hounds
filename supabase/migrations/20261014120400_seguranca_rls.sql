-- ============================================================
-- 5/6 · SEGURANÇA: RLS E PERMISSÕES
-- O site não tem login: quem abre escolhe um usuário na entrada e
-- usa a chave pública (anon) do Supabase. Por isso as regras de
-- Mestre/Jogador e de visibilidade continuam no site, e o banco
-- garante o que não depende de saber quem é a pessoa:
--   * leitura: liberada (RLS com política só de SELECT);
--   * escrita: nenhuma direto nas tabelas. Só pelas funções
--     hounds_put/patch/remove/remove_many/trocar_imagem_mapa
--     (SECURITY DEFINER), que validam os dados, respeitam as chaves
--     estrangeiras e gravam tudo numa transação;
--   * as funções internas (schema hounds_interno) não são expostas
--     pela API e não podem ser chamadas pela chave anon.
-- A chave service_role (que ignora RLS) nunca vai para o site: o
-- supabase-config.js só tem a anon.
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'mapas', 'locais', 'fichas', 'ficha_pericia', 'ficha_cultura', 'ficha_vantagem', 'ficha_vantagem_pericia',
    'ficha_estilo', 'ficha_item_combate', 'ficha_arma', 'personagens', 'personagem_mapa', 'personagem_relacao', 'local_personagem',
    'organizacoes', 'personagem_organizacao', 'organizacao_local', 'organizacao_mapa', 'eventos', 'evento_personagem',
    'marcadores', 'cadernos', 'anotacoes', 'magias', 'vantagens', 'pericias', 'tecnicas', 'estilos',
    'mapa_compartilhamento', 'local_compartilhamento', 'personagem_compartilhamento', 'organizacao_compartilhamento',
    'ficha_compartilhamento', 'evento_compartilhamento', 'magia_compartilhamento', 'vantagem_compartilhamento',
    'pericia_compartilhamento', 'tecnica_compartilhamento', 'estilo_compartilhamento', 'mesa_estado', 'mesa_partes']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Leitura pública" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Leitura pública" ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'usuarios_doc', 'mapas_doc', 'marcadores_doc', 'locais_doc', 'personagens_doc', 'organizacoes_doc', 'eventos_doc', 'fichas_doc',
    'cadernos_doc', 'anotacoes_doc', 'magias_doc', 'vantagens_doc', 'pericias_doc', 'tecnicas_doc', 'estilos_doc',
    'mesa_estado_doc', 'mesa_partes_doc']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

REVOKE ALL ON SEQUENCE public.ficha_item_combate_id_seq FROM anon, authenticated;

-- Funções internas: ninguém além do dono (as funções públicas abaixo rodam como ele).
-- As três usadas pelas views de leitura ficam liberadas, porque as views rodam com as
-- permissões de quem consulta.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hounds_interno FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA hounds_interno TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.ms(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.imagem(TEXT, INTEGER, INTEGER, TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.itens_combate(TEXT, SMALLINT) TO anon, authenticated;

-- Funções de gravação chamadas pelo site.
REVOKE ALL ON FUNCTION public.hounds_put(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hounds_patch(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hounds_remove(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hounds_remove_many(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hounds_trocar_imagem_mapa(TEXT, JSONB, BOOLEAN, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hounds_put(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hounds_patch(TEXT, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hounds_remove(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hounds_remove_many(TEXT, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hounds_trocar_imagem_mapa(TEXT, JSONB, BOOLEAN, BIGINT) TO anon, authenticated;
