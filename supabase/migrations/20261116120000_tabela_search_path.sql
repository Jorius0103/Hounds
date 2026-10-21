-- ============================================================
-- 39 · SEARCH_PATH FIXO EM hounds_interno.tabela
-- O Security Advisor do Supabase acusa "Function Search Path Mutable"
-- em hounds_interno.tabela: era a única função sem SET search_path.
-- Ela é a da migration 33, a mesma lista de coleções, agora com
-- search_path = '' como as outras. Ao acrescentar coleções, copie
-- esta versão (o CREATE OR REPLACE sem o SET apaga o search_path).
-- ============================================================

CREATE OR REPLACE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'disadvantages' THEN 'desvantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos' WHEN 'weapons' THEN 'armas' WHEN 'armors' THEN 'armaduras'
      WHEN 'items' THEN 'itens' WHEN 'improvements' THEN 'melhoramentos' WHEN 'armorLocs' THEN 'armadura_localizacoes'
      WHEN 'boards' THEN 'tabuleiros' WHEN 'boardTokens' THEN 'tabuleiro_tokens' WHEN 'boardDrawings' THEN 'tabuleiro_desenhos'
      WHEN 'boardTurns' THEN 'tabuleiro_turnos' WHEN 'boardArt' THEN 'tabuleiro_arte' WHEN 'boardCampaign' THEN 'tabuleiro_campanha'
      WHEN 'chatMessages' THEN 'chat_mensagens'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;
