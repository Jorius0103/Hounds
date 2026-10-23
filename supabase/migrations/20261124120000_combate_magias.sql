-- ============================================================
-- 47 · FICHA › COMBATE: MAGIAS NOS ESTILOS
-- Um estilo (ou as Perícias de Combate) pode ter magias, como as da
-- aba Magia: IQ, dificuldade H ou VH, pontos, bônus com o motivo e a
-- entrada de Regras › Magias (js/tabs/ficha-combate.js, kind 'spell').
--   ficha_item_combate.tipo      ganha 'spell'
--   ficha_item_combate.magia_id  a magia do catálogo (ids spell_* dos
--                                livros, em dados/magias.json; nulo:
--                                digitada)
-- As funções itens_combate e inserir_itens_combate são as da
-- migration 11 (notas de bônus) com as magias; o resto não muda.
-- Pode rodar de novo sem efeito.
-- ============================================================

ALTER TABLE public.ficha_item_combate DROP CONSTRAINT IF EXISTS ficha_item_combate_tipo_check;
ALTER TABLE public.ficha_item_combate ADD CONSTRAINT ficha_item_combate_tipo_check CHECK (tipo IN ('skill', 'tech', 'trait', 'spell'));
ALTER TABLE public.ficha_item_combate ADD COLUMN IF NOT EXISTS magia_id TEXT;

-- ---------- leitura (com as magias) ----------
CREATE OR REPLACE FUNCTION hounds_interno.itens_combate(p_ficha TEXT, p_estilo SMALLINT) RETURNS JSONB
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(jsonb_agg(
    CASE i.tipo
      WHEN 'trait' THEN jsonb_build_object('kind', 'trait', 'name', i.nome, 'pts', i.pontos)
      WHEN 'skill' THEN jsonb_strip_nulls(jsonb_build_object('kind', 'skill', 'name', i.nome, 'pts', i.pontos, 'bonus', i.bonus,
                          'attr', i.atributo, 'diff', i.dificuldade, 'skillId', i.pericia_id, 'bonusNote', NULLIF(i.nota_bonus, '')))
      WHEN 'spell' THEN jsonb_strip_nulls(jsonb_build_object('kind', 'spell', 'name', i.nome, 'pts', i.pontos, 'bonus', i.bonus,
                          'diff', i.dificuldade, 'spellId', i.magia_id, 'bonusNote', NULLIF(i.nota_bonus, '')))
      ELSE jsonb_strip_nulls(jsonb_build_object('kind', 'tech', 'name', i.nome, 'pts', i.pontos, 'bonus', i.bonus,
             'base', i.pericia_base, 'diff', i.dificuldade, 'def', i.padrao, 'techId', i.tecnica_id, 'bonusNote', NULLIF(i.nota_bonus, '')))
           || jsonb_build_object('max', i.limite)   -- null: técnica sem limite
    END ORDER BY i.ordem), '[]'::jsonb)
  FROM public.ficha_item_combate i
  WHERE i.ficha_id = p_ficha AND i.estilo_ordem IS NOT DISTINCT FROM p_estilo
$$;

-- ---------- gravação (com as magias) ----------
-- Uma magia (cleanCombatItem): dificuldade H ou VH, bônus e o motivo como as perícias, e a entrada do catálogo.
CREATE OR REPLACE FUNCTION hounds_interno.inserir_itens_combate(p_ficha TEXT, p_estilo SMALLINT, p_itens JSONB) RETURNS VOID
LANGUAGE sql AS $$
  INSERT INTO public.ficha_item_combate (ficha_id, estilo_ordem, ordem, tipo, nome, pontos, bonus, atributo, dificuldade, pericia_id,
                                         pericia_base, padrao, limite, tecnica_id, nota_bonus, magia_id)
  SELECT p_ficha, p_estilo, (i.n - 1)::smallint, k.tipo, COALESCE(i.v ->> 'name', ''),
         greatest(hounds_interno.inteiro(i.v -> 'pts', CASE k.tipo WHEN 'tech' THEN 0 ELSE 1 END), 0),
         CASE WHEN k.tipo <> 'trait' THEN hounds_interno.inteiro(i.v -> 'bonus', 0) END,
         CASE WHEN k.tipo = 'skill' THEN CASE WHEN i.v ->> 'attr' IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN i.v ->> 'attr' ELSE 'DX' END END,
         CASE k.tipo WHEN 'skill' THEN CASE WHEN i.v ->> 'diff' IN ('E', 'A', 'H', 'VH') THEN i.v ->> 'diff' ELSE 'A' END
                     WHEN 'tech' THEN CASE WHEN i.v ->> 'diff' = 'A' THEN 'A' ELSE 'H' END
                     WHEN 'spell' THEN CASE WHEN i.v ->> 'diff' = 'VH' THEN 'VH' ELSE 'H' END END,
         CASE WHEN k.tipo = 'skill' THEN NULLIF(i.v ->> 'skillId', '') END,
         CASE WHEN k.tipo = 'tech' THEN COALESCE(i.v ->> 'base', '') END,
         CASE WHEN k.tipo = 'tech' THEN hounds_interno.inteiro(i.v -> 'def', 0) END,
         CASE WHEN k.tipo = 'tech' THEN hounds_interno.inteiro(i.v -> 'max') END,
         CASE WHEN k.tipo = 'tech' THEN NULLIF(i.v ->> 'techId', '') END,
         CASE WHEN k.tipo <> 'trait' THEN hounds_interno.nota_bonus(hounds_interno.inteiro(i.v -> 'bonus', 0), i.v -> 'bonusNote') ELSE '' END,
         CASE WHEN k.tipo = 'spell' THEN NULLIF(btrim(COALESCE(i.v ->> 'spellId', '')), '') END
  FROM jsonb_array_elements(hounds_interno.lista(p_itens)) WITH ORDINALITY AS i (v, n)
  CROSS JOIN LATERAL (SELECT CASE WHEN i.v ->> 'kind' IN ('tech', 'trait', 'spell') THEN i.v ->> 'kind' ELSE 'skill' END AS tipo) k
  WHERE jsonb_typeof(i.v) = 'object'
$$;
