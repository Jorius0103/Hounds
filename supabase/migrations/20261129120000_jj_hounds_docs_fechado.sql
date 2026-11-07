-- ============================================================
-- 53 · hounds_docs E IMAGENS FECHADOS DE NOVO
-- O Security Advisor do Supabase acusa a policy "Acesso público
-- hounds_docs" (FOR ALL, USING e WITH CHECK true) na cópia antiga dos
-- dados. A 6 a apagou, mas rodar a 1 de novo a recria e desfaz também
-- o resto do que a 6, a 7 e a 30 fecharam:
--   - devolve à chave pública o EXECUTE de patch_hounds_doc
--     (SECURITY DEFINER: grava em hounds_docs por cima das permissões);
--   - deixa a chave pública enviar, trocar e apagar imagens do bucket
--     hounds-images (a 7 exige login);
--   - põe hounds_docs de volta na publicação do Realtime (a 30 a tira).
-- Esta volta tudo ao que aquelas migrations deixaram: hounds_docs sem
-- policies e sem acesso para anon e authenticated (só a chave
-- service_role a lê, como o tools/validar-migracao.mjs), sem o
-- EXECUTE, as policies de imagens da 7 e hounds_docs fora do Realtime.
-- O site não usa hounds_docs nem patch_hounds_doc. Não rode a 1 de
-- novo num banco que já passou da 6. Pode rodar a qualquer momento, e
-- de novo sem efeito.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.hounds_docs') IS NOT NULL THEN
    ALTER TABLE public.hounds_docs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Acesso público hounds_docs" ON public.hounds_docs;
    DROP POLICY IF EXISTS "Leitura pública hounds_docs" ON public.hounds_docs;
    REVOKE ALL ON public.hounds_docs FROM anon, authenticated;
    IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hounds_docs') THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.hounds_docs;
    END IF;
  END IF;
  IF to_regprocedure('public.patch_hounds_doc(text, text, jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.patch_hounds_doc(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- Imagens: enviar, trocar e apagar só com login, como na 7. A leitura segue pública pelo endereço.
DROP POLICY IF EXISTS "Permitir upload de imagens" ON storage.objects;
CREATE POLICY "Permitir upload de imagens" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
DROP POLICY IF EXISTS "Permitir atualização de imagens" ON storage.objects;
CREATE POLICY "Permitir atualização de imagens" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
DROP POLICY IF EXISTS "Permitir exclusão de imagens" ON storage.objects;
CREATE POLICY "Permitir exclusão de imagens" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
