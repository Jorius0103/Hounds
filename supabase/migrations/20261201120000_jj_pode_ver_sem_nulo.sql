-- ============================================================
-- 55 · pode_ver SEM NULO
-- hounds_interno.pode_ver devolvia NULL, e não false, para um item
-- oculto sem dono (createdBy nulo, como os itens de antes do login,
-- que ficam com o Mestre) e para um usuário nulo. Na autorizar,
-- "IF NOT mestre AND NOT pode_ver(...) THEN RAISE" não dispara com
-- NULL: um Jogador podia alterar ou excluir um item desses chamando o
-- banco direto (mapas, locais, personagens, fichas, anotações,
-- tabuleiros), mesmo sem vê-lo. Agora a função devolve false nesses
-- casos; nos outros, nada muda. É a da 7, com o SET search_path = ''
-- da 52.
-- Pode rodar a qualquer momento, e de novo sem efeito.
-- ============================================================

CREATE OR REPLACE FUNCTION hounds_interno.pode_ver(d JSONB, u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(COALESCE(d ->> 'visible', 'true') <> 'false' OR d ->> 'createdBy' = u OR COALESCE(d -> 'sharedWith', '[]'::jsonb) ? u, false)
$$;
