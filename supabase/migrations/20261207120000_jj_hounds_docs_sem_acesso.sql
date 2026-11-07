-- ============================================================
-- 61 · hounds_docs: SEM ACESSO, POR ESCRITO
-- O Security Advisor do Supabase acusa public.hounds_docs: RLS ligado
-- e nenhuma policy. É o que a 53 deixou de propósito (a cópia antiga
-- dos dados, fechada para anon e authenticated; só o service_role a
-- lê, como o tools/validar-migracao.mjs, e ele passa por cima do RLS).
-- Como na 60, o aviso pede que fique escrito: uma policy que nega
-- tudo a anon e authenticated. Nada muda. A 53 apaga só as policies
-- antigas pelo nome, então rodá-la de novo não tira esta.
-- Pode rodar a qualquer momento, e de novo sem efeito.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.hounds_docs') IS NOT NULL THEN
    ALTER TABLE public.hounds_docs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Sem acesso pelo site" ON public.hounds_docs;
    CREATE POLICY "Sem acesso pelo site" ON public.hounds_docs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
    REVOKE ALL ON public.hounds_docs FROM anon, authenticated;
  END IF;
END $$;
