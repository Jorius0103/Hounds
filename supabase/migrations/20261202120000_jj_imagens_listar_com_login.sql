-- ============================================================
-- 56 · IMAGENS: LISTAR SÓ COM LOGIN
-- O Security Advisor do Supabase acusa a policy "Imagens públicas
-- para leitura" (SELECT em storage.objects no bucket público
-- hounds-images, para anon e authenticated): com ela, qualquer um com
-- a chave pública lista todos os arquivos do bucket, e os endereços
-- aleatórios das imagens deixam de ser segredo. Abrir uma imagem pelo
-- endereço público (getPublicUrl) não precisa de policy: basta o
-- bucket ser público. O SELECT continua necessário para o site enviar
-- uma imagem (o upload com upsert lê o arquivo) e apagar uma (o remove
-- também lê, em js/store/supabase.js), então ele fica, mas só para
-- quem entrou com uma conta ligada a um usuário, como enviar, trocar e
-- apagar na 7. Rodar a 1 de novo recria a policy antiga; se rodou,
-- rode a 53 e esta depois. Pode rodar a qualquer momento, e de novo
-- sem efeito.
-- ============================================================

DROP POLICY IF EXISTS "Imagens públicas para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Ler imagens com login" ON storage.objects;
CREATE POLICY "Ler imagens com login" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
