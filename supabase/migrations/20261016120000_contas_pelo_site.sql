-- ============================================================
-- 8 · CONTAS DE LOGIN PELO SITE
-- O Mestre cria, troca a senha e exclui contas de login na aba
-- Usuários. Quem faz isso é a Edge Function "contas"
-- (supabase/functions/contas), que roda no Supabase com a chave
-- service_role e confere antes que o pedido veio do Mestre. Esta
-- função acha a conta de login (Supabase Auth) de um usuário do
-- Hounds pelo email dele. Só a service_role a chama.
-- ============================================================

CREATE FUNCTION public.hounds_conta_id(p_usuario TEXT) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id
  FROM public.usuario_email e
  JOIN auth.users a ON lower(a.email) = e.email
  WHERE e.usuario_id = p_usuario
$$;

REVOKE ALL ON FUNCTION public.hounds_conta_id(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hounds_conta_id(TEXT) TO service_role;
