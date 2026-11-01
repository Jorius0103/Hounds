-- ============================================================
-- 50 · MESA DE COMBATE: PERMISSÕES DE EXCLUSÃO E LIMPEZA DE ROLAGENS
-- Permite que o Mestre e os jogadores excluam rolagens ou limpem
-- completamente o histórico da mesa sem que os registros ressuscitem.
-- ============================================================

-- Garante política de exclusão (DELETE) na tabela public.mesa_rolagens
DROP POLICY IF EXISTS "Exclusão de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Exclusão de rolagens" ON public.mesa_rolagens
  FOR DELETE TO anon, authenticated USING (true);

-- Concede privilégio de exclusão
GRANT DELETE ON public.mesa_rolagens TO anon, authenticated;

-- Função RPC idempotente com SECURITY DEFINER para limpar todas as rolagens
CREATE OR REPLACE FUNCTION public.hounds_limpar_mesa_rolagens()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.mesa_rolagens;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hounds_limpar_mesa_rolagens() TO anon, authenticated;

