-- ============================================================
-- 64 · MESA DE COMBATE: OTIMIZAÇÃO DA AUTO-LIMPEZA DE ROLAGENS
-- Na migration 48 e 54, public.hounds_registrar_rolagem executava a
-- cada rolagem:
--   DELETE FROM public.mesa_rolagens
--   WHERE id NOT IN (SELECT id FROM ... ORDER BY criado_em DESC LIMIT 1500);
-- Em toda e qualquer rolagem de dado, o Postgres fazia um scan completo
-- com NOT IN e locks de deleção, elevando o uso de CPU e escrita no WAL.
--
-- Agora:
--   1. A limpeza só roda probabilisticamente (5% das chamadas, ~1 a cada 20 rolagens),
--      tornando 95% das inserções instantâneas sem nenhuma checagem de delete;
--   2. A deleção usa o índice existente idx_mesa_rolagens_criado_em com OFFSET 1500:
--      apaga direto por data (criado_em < timestamp_corte), sem subselect de NOT IN.
--
-- Mantém as políticas de segurança e RLS definidas na migration 54.
-- Pode rodar a qualquer momento, e de novo sem efeito.
-- ============================================================

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
  v_corte_tempo TIMESTAMPTZ;
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

  -- Auto-limpeza eficiente: executa apenas em ~5% das inserções para não sobrecarregar
  -- o banco a cada rolagem individual.
  IF random() < 0.05 THEN
    SELECT criado_em INTO v_corte_tempo
    FROM public.mesa_rolagens
    ORDER BY criado_em DESC
    OFFSET 1500
    LIMIT 1;

    IF v_corte_tempo IS NOT NULL THEN
      DELETE FROM public.mesa_rolagens
      WHERE criado_em < v_corte_tempo;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;
