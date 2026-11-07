-- ============================================================
-- 57 · rls_auto_enable SEM A CHAVE PÚBLICA
-- O Security Advisor do Supabase acusa public.rls_auto_enable(): é
-- SECURITY DEFINER e a chave pública a executa por
-- /rest/v1/rpc/rls_auto_enable. Ela não vem das migrations: é a do
-- Supabase que liga o RLS sozinha em cada tabela nova do public (um
-- event trigger a chama ao criar a tabela) e ganhou o EXECUTE que o
-- Supabase dá a anon e authenticated em toda função nova do public.
-- O event trigger não precisa desse EXECUTE, e o site não a chama:
-- ele sai de PUBLIC, anon e authenticated, e a função continua
-- ligando o RLS das tabelas novas. Se ela não existir, nada muda.
-- As funções do public criadas pelas migrations já não dão EXECUTE à
-- chave pública (a 7, a 8, a 34, a 53 e a 54). Pode rodar a qualquer
-- momento, e de novo sem efeito.
-- ============================================================

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
