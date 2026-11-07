-- ============================================================
-- 58 · hounds_eu COMO QUEM CHAMA (SECURITY INVOKER)
-- O Security Advisor do Supabase acusa public.hounds_eu(): é SECURITY
-- DEFINER e uma conta logada a executa. Ela só lê a linha do usuário
-- da conta em public.usuarios, que a conta já lê pela policy "Leitura
-- com login" (a 7), e o usuario_atual, que tem as próprias permissões.
-- Rodando como quem chama, o resultado é o mesmo: { id, name, role }
-- para uma conta ligada a um usuário, null para as outras. É a da 7
-- com SECURITY INVOKER; o EXECUTE (só authenticated e service_role,
-- a 7) não muda.
-- As outras RPCs do site (hounds_put, hounds_patch, hounds_remove,
-- hounds_remove_many, hounds_trocar_imagem_mapa, hounds_limpar_chat,
-- hounds_registrar_rolagem e hounds_limpar_mesa_rolagens) continuam
-- SECURITY DEFINER de propósito: as tabelas são só leitura para as
-- contas, e elas gravam depois de conferir as permissões
-- (hounds_interno.autorizar e as checagens de cada uma).
-- Pode rodar a qualquer momento, e de novo sem efeito.
-- ============================================================

CREATE OR REPLACE FUNCTION public.hounds_eu() RETURNS JSONB
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('id', u.id, 'name', u.nome, 'role', u.papel)
  FROM public.usuarios u WHERE u.id = hounds_interno.usuario_atual()
$$;
