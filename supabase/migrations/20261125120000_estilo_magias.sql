-- ============================================================
-- 48 · ESTILOS: MAGIAS
-- Um estilo de luta (Regras › Combate) pode listar magias, como as
-- técnicas e os perks: escolhidas de Regras › Magias no formulário
-- do estilo, mostradas na página dele e trazidas para a ficha com
-- 0 pontos quando o estilo é adicionado (js/tabs/tab-combate.js e
-- ficha-combate.js).
--   estilos.magias  os nomes, separados por "; " (nulo: nenhuma)
-- A view estilos_doc é a da migration 2 e a função salvar_estilo a
-- da 3, com o campo novo; o resto delas não muda. Pode rodar de novo.
-- ============================================================

ALTER TABLE public.estilos ADD COLUMN IF NOT EXISTS magias TEXT;

-- ---------- leitura (com as magias) ----------
CREATE OR REPLACE VIEW public.estilos_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'cost', x.custo, 'description', x.descricao, 'skills', x.pericias, 'techniques', x.tecnicas,
    'cinematicSkills', x.pericias_cinematicas, 'cinematicTechniques', x.tecnicas_cinematicas, 'perks', x.perks, 'spells', x.magias,
    'optAdvantages', x.vantagens_opcionais, 'optDisadvantages', x.desvantagens_opcionais, 'optSkills', x.pericias_opcionais,
    'optTechniques', x.tecnicas_opcionais, 'optPerks', x.perks_opcionais, 'book', x.livro, 'page', x.pagina,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.estilo_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.estilos x;

-- ---------- gravação (com as magias) ----------
CREATE OR REPLACE FUNCTION hounds_interno.salvar_estilo(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.estilos AS t (id, nome, custo, descricao, pericias, tecnicas, pericias_cinematicas, tecnicas_cinematicas, perks, magias,
                                   vantagens_opcionais, desvantagens_opcionais, pericias_opcionais, tecnicas_opcionais, perks_opcionais,
                                   livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'description'),
          hounds_interno.texto(d -> 'skills'), hounds_interno.texto(d -> 'techniques'), hounds_interno.texto(d -> 'cinematicSkills'),
          hounds_interno.texto(d -> 'cinematicTechniques'), hounds_interno.texto(d -> 'perks'), hounds_interno.texto(d -> 'spells'),
          hounds_interno.texto(d -> 'optAdvantages'),
          hounds_interno.texto(d -> 'optDisadvantages'), hounds_interno.texto(d -> 'optSkills'), hounds_interno.texto(d -> 'optTechniques'),
          hounds_interno.texto(d -> 'optPerks'), hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, custo, descricao, pericias, tecnicas, pericias_cinematicas, tecnicas_cinematicas, perks, magias,
                                  vantagens_opcionais, desvantagens_opcionais, pericias_opcionais, tecnicas_opcionais, perks_opcionais,
                                  livro, pagina, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.custo, EXCLUDED.descricao, EXCLUDED.pericias, EXCLUDED.tecnicas, EXCLUDED.pericias_cinematicas,
         EXCLUDED.tecnicas_cinematicas, EXCLUDED.perks, EXCLUDED.magias, EXCLUDED.vantagens_opcionais, EXCLUDED.desvantagens_opcionais,
         EXCLUDED.pericias_opcionais, EXCLUDED.tecnicas_opcionais, EXCLUDED.perks_opcionais, EXCLUDED.livro, EXCLUDED.pagina,
         EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('estilo_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;
