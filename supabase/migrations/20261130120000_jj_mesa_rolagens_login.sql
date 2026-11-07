-- ============================================================
-- 54 · MESA DE COMBATE: ROLAGENS SÓ COM LOGIN, SECRETAS SÓ DO MESTRE
-- O Security Advisor do Supabase acusa a policy "Inserção de
-- rolagens" (INSERT, WITH CHECK true) de public.mesa_rolagens. A 48 e
-- a 50 deixaram a tabela e as duas funções dela abertas para a chave
-- pública, sem login: ler tudo (até as rolagens secretas do Mestre),
-- gravar rolagens, apagar qualquer uma e limpar o histórico. Agora:
--   - ler, gravar e apagar exigem uma conta ligada a um usuário
--     (hounds_interno.usuario_atual), como as imagens na 7;
--   - uma rolagem secreta é só do Mestre: só ele a grava, a lê
--     (também pelo Realtime) e a apaga. O Jogador não rola em segredo
--     (na Mesa, isSecret só vale para o Mestre com as rolagens
--     ocultas, em src/App.tsx);
--   - hounds_registrar_rolagem e hounds_limpar_mesa_rolagens são
--     SECURITY DEFINER (as policies não valem dentro delas): passam a
--     conferir o login, e a chave pública perde o EXECUTE. A de
--     registrar recusa uma rolagem secreta do Jogador e não regrava
--     uma rolagem secreta que já existe, se quem grava não é o Mestre.
-- Como na 50, o Mestre e os jogadores ainda apagam rolagens e limpam
-- o histórico inteiro. As funções são as da 48 e da 50 com isso; ao
-- mudá-las, copie esta versão. Pode rodar a qualquer momento, e de
-- novo sem efeito.
-- ============================================================

-- ---------- tabela ----------
DROP POLICY IF EXISTS "Leitura de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Leitura de rolagens" ON public.mesa_rolagens FOR SELECT TO authenticated
  USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL AND (NOT secreto OR (SELECT hounds_interno.eh_mestre())));

DROP POLICY IF EXISTS "Inserção de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Inserção de rolagens" ON public.mesa_rolagens FOR INSERT TO authenticated
  WITH CHECK ((SELECT hounds_interno.usuario_atual()) IS NOT NULL AND (NOT secreto OR (SELECT hounds_interno.eh_mestre())));

DROP POLICY IF EXISTS "Exclusão de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Exclusão de rolagens" ON public.mesa_rolagens FOR DELETE TO authenticated
  USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL AND (NOT secreto OR (SELECT hounds_interno.eh_mestre())));

REVOKE ALL ON public.mesa_rolagens FROM anon;
GRANT SELECT, INSERT, DELETE ON public.mesa_rolagens TO authenticated;

-- ---------- gravação ----------
CREATE OR REPLACE FUNCTION public.hounds_registrar_rolagem(p_rolagem JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id TEXT;
  v_mestre BOOLEAN;
  v_secreto BOOLEAN := COALESCE((p_rolagem ->> 'secreto')::boolean, false);
BEGIN
  IF hounds_interno.usuario_atual() IS NULL THEN
    RAISE EXCEPTION 'Entre com a sua conta para rolar. Se já entrou, recarregue a página.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_mestre := hounds_interno.eh_mestre();
  IF v_secreto AND NOT v_mestre THEN
    RAISE EXCEPTION 'Só o Mestre rola em segredo.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_id := COALESCE(NULLIF(p_rolagem ->> 'id', ''), 'roll-' || floor(extract(epoch from clock_timestamp()) * 1000)::text);

  INSERT INTO public.mesa_rolagens (
    id, combate_id, personagem_id, personagem_nome, jogador_nome,
    autor_papel, qtd_dados, lados_dados, rolagens, total, descricao,
    secreto, rodada, dados_completos, criado_em
  ) VALUES (
    v_id,
    NULLIF(p_rolagem ->> 'combate_id', ''),
    NULLIF(p_rolagem ->> 'personagem_id', ''),
    COALESCE(p_rolagem ->> 'personagem_nome', 'Mestre'),
    COALESCE(p_rolagem ->> 'jogador_nome', 'Mestre'),
    COALESCE(p_rolagem ->> 'autor_papel', 'jogador'),
    COALESCE((p_rolagem ->> 'qtd_dados')::integer, 3),
    COALESCE((p_rolagem ->> 'lados_dados')::integer, 6),
    COALESCE((SELECT array_agg(x::integer) FROM jsonb_array_elements_text(COALESCE(p_rolagem -> 'rolagens', '[]'::jsonb)) x), '{}'::integer[]),
    COALESCE((p_rolagem ->> 'total')::integer, 0),
    COALESCE(p_rolagem ->> 'descricao', ''),
    v_secreto,
    COALESCE((p_rolagem ->> 'rodada')::integer, 0),
    COALESCE(p_rolagem -> 'dados_completos', '{}'::jsonb),
    COALESCE((p_rolagem ->> 'criado_em')::timestamptz, clock_timestamp())
  )
  ON CONFLICT (id) DO UPDATE SET
    dados_completos = EXCLUDED.dados_completos,
    descricao = EXCLUDED.descricao
  WHERE NOT public.mesa_rolagens.secreto OR v_mestre;

  -- Auto-limpeza de segurança: mantém no máximo 1.500 registros para não inchar o banco
  DELETE FROM public.mesa_rolagens
  WHERE id NOT IN (
    SELECT id FROM public.mesa_rolagens ORDER BY criado_em DESC LIMIT 1500
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ---------- limpeza ----------
CREATE OR REPLACE FUNCTION public.hounds_limpar_mesa_rolagens()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF hounds_interno.usuario_atual() IS NULL THEN
    RAISE EXCEPTION 'Entre com a sua conta para limpar as rolagens. Se já entrou, recarregue a página.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM public.mesa_rolagens;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.hounds_registrar_rolagem(JSONB), public.hounds_limpar_mesa_rolagens() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hounds_registrar_rolagem(JSONB), public.hounds_limpar_mesa_rolagens() TO authenticated;
