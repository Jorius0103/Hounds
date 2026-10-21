-- ============================================================
-- 35 · FICHA › ANOTAÇÕES
-- A aba Anotações da ficha (js/tabs/ficha-anotacoes.js): os mesmos
-- títulos e anotações do menu Anotações, mas de uma ficha. Um título
-- com ficha_id é da ficha: fica fora do menu Anotações e sai junto
-- quando a ficha é excluída (as anotações dele vão em cascata).
-- Os aliados não têm a aba; o título é sempre da ficha principal.
--   cadernos.ficha_id   a ficha do título (nulo: menu Anotações)
-- A view cadernos_doc e a função salvar_caderno são as da migration 1
-- com o sheetId; o resto delas não muda.
-- ============================================================

ALTER TABLE public.cadernos ADD COLUMN IF NOT EXISTS ficha_id TEXT REFERENCES public.fichas (id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS cadernos_ficha_id_idx ON public.cadernos (ficha_id);
COMMENT ON COLUMN public.cadernos.ficha_id IS 'Ficha dona do título (aba Anotações da ficha); nulo para os títulos do menu Anotações.';

-- ---------- view de leitura (com o sheetId) ----------
CREATE OR REPLACE VIEW public.cadernos_doc WITH (security_invoker = true) AS
SELECT n.id, n.gravado_em AS updated_at,
  jsonb_build_object('name', n.nome, 'visible', n.visivel, 'sheetId', n.ficha_id, 'createdBy', n.criado_por,
    'createdAt', hounds_interno.ms(n.criado_em), 'updatedAt', hounds_interno.ms(n.atualizado_em)) AS data
FROM public.cadernos n;

-- ---------- gravação (com o sheetId) ----------
-- Uma ficha que não existe mais (ou vazia) deixa o título no menu Anotações.
CREATE OR REPLACE FUNCTION hounds_interno.salvar_caderno(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  ficha TEXT := (SELECT f.id FROM public.fichas f WHERE f.id = d ->> 'sheetId');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o título.');
  INSERT INTO public.cadernos AS t (id, nome, visivel, ficha_id, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.logico(d -> 'visible', true), ficha, hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, visivel, ficha_id, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.visivel, EXCLUDED.ficha_id, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;
