-- ============================================================
-- 48 · MESA DE COMBATE: TABELA DE ROLAGENS PERMANENTES
-- Guarda o histórico oficial de rolagens de dados da Mesa no Supabase.
-- Garante recuperação de rolagens mesmo após horas de inatividade,
-- reconexão de navegadores, ou entrada tardia de jogadores.
--
-- Tabela: public.mesa_rolagens
--   * Chave primária pelo ID da rolagem gerado na mesa (idempotência);
--   * Índices para consulta rápida por combate e por data decrescente;
--   * Política de segurança RLS com SELECT e INSERT públicos (anon e auth);
--   * Função hounds_registrar_rolagem com limpeza automática das
--     últimas 1.500 rolagens para evitar estouro da cota de 500 MB;
--   * Integração com Realtime do Supabase (supabase_realtime).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mesa_rolagens (
  id              TEXT PRIMARY KEY CHECK (id <> ''),
  combate_id      TEXT,
  personagem_id   TEXT,
  personagem_nome TEXT NOT NULL DEFAULT 'Mestre',
  jogador_nome    TEXT NOT NULL DEFAULT 'Mestre',
  autor_papel     TEXT NOT NULL DEFAULT 'jogador',
  qtd_dados       INTEGER NOT NULL DEFAULT 3,
  lados_dados     INTEGER NOT NULL DEFAULT 6,
  rolagens        INTEGER[] NOT NULL DEFAULT '{}',
  total           INTEGER NOT NULL DEFAULT 0,
  descricao       TEXT NOT NULL DEFAULT '',
  secreto         BOOLEAN NOT NULL DEFAULT false,
  rodada          INTEGER NOT NULL DEFAULT 0,
  dados_completos JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas ordenadas por tempo e por combate
CREATE INDEX IF NOT EXISTS idx_mesa_rolagens_criado_em ON public.mesa_rolagens (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mesa_rolagens_combate_id ON public.mesa_rolagens (combate_id);

-- Habilita RLS
ALTER TABLE public.mesa_rolagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Leitura de rolagens" ON public.mesa_rolagens
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Inserção de rolagens" ON public.mesa_rolagens;
CREATE POLICY "Inserção de rolagens" ON public.mesa_rolagens
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.mesa_rolagens TO anon, authenticated;

-- Função RPC idempotente com auto-retenção (mantém até 1.500 rolagens mais recentes)
CREATE OR REPLACE FUNCTION public.hounds_registrar_rolagem(p_rolagem JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id TEXT;
BEGIN
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
    COALESCE((p_rolagem ->> 'secreto')::boolean, false),
    COALESCE((p_rolagem ->> 'rodada')::integer, 0),
    COALESCE(p_rolagem -> 'dados_completos', '{}'::jsonb),
    COALESCE((p_rolagem ->> 'criado_em')::timestamptz, clock_timestamp())
  )
  ON CONFLICT (id) DO UPDATE SET
    dados_completos = EXCLUDED.dados_completos,
    descricao = EXCLUDED.descricao;

  -- Auto-limpeza de segurança: mantém no máximo 1.500 registros para não inchar o banco
  DELETE FROM public.mesa_rolagens
  WHERE id NOT IN (
    SELECT id FROM public.mesa_rolagens ORDER BY criado_em DESC LIMIT 1500
  );

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hounds_registrar_rolagem(JSONB) TO anon, authenticated;

-- Adiciona à publicação Realtime se ela existir no Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mesa_rolagens'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_rolagens;
    END IF;
  END IF;
END $$;
