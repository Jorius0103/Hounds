-- ============================================================
-- 13 · CATÁLOGO DE DESVANTAGENS
-- As desvantagens dos livros ficam em dados/desvantagens.json,
-- como os outros catálogos (veja "Catálogos de GURPS" em
-- js/mundo.js). Aqui fica só o que o Mestre criou ou mudou: uma
-- linha com o id do livro (disadv_*) guarda as mudanças dele numa
-- entrada dos livros, e uma coluna nula segue o livro.
-- As funções tabela, gravar e autorizar são as da migration 12 com
-- a coleção nova; o resto delas não muda.
-- Rode antes de publicar a versão do site com a aba Desvantagens:
-- sem a tabela, o site não consegue lê-la.
-- ============================================================

CREATE TABLE public.desvantagens (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  custo         TEXT,
  -- Disadvantage, Expansion (Basic Set disadvantage) ou Cross-reference.
  tipo          TEXT,
  -- Os ícones do livro, separados por vírgula ("Physical, Exotic").
  classes       TEXT,
  -- Pede teste de autocontrole (o * do livro).
  autocontrole  BOOLEAN,
  livro         TEXT,
  pagina        TEXT,
  descricao     TEXT,
  excluida      BOOLEAN NOT NULL DEFAULT false,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas que veem um item oculto (sharedWith), como nos outros catálogos.
CREATE TABLE public.desvantagem_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.desvantagens (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);

-- ---------- triggers (os mesmos das outras tabelas, migration 2) ----------
CREATE TRIGGER desvantagens_gravado_em BEFORE INSERT OR UPDATE ON public.desvantagens
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE INDEX desvantagem_compartilhamento_usuario_id_idx ON public.desvantagem_compartilhamento (usuario_id);
CREATE TRIGGER desvantagem_compartilhamento_dono AFTER INSERT OR UPDATE OR DELETE ON public.desvantagem_compartilhamento
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('desvantagens', 'item_id');

-- ---------- view de leitura ----------
-- Campos nulos (que seguem o livro) ficam fora do objeto, para não apagar o texto do livro.
CREATE VIEW public.desvantagens_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'cost', x.custo, 'type', x.tipo, 'classes', x.classes, 'selfControl', x.autocontrole,
    'book', x.livro, 'page', x.pagina, 'description', x.descricao,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.desvantagem_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.desvantagens x;

-- ---------- gravação ----------
-- Catálogos: campo que não veio fica nulo (numa entrada dos livros, segue o livro).
CREATE FUNCTION hounds_interno.salvar_desvantagem(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.desvantagens AS t (id, nome, custo, tipo, classes, autocontrole, livro, pagina, descricao,
                                        excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'type'),
          hounds_interno.texto(d -> 'classes'), hounds_interno.logico(d -> 'selfControl'),
          hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'), hounds_interno.texto(d -> 'description'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, custo, tipo, classes, autocontrole, livro, pagina, descricao,
                                  excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.custo, EXCLUDED.tipo, EXCLUDED.classes, EXCLUDED.autocontrole, EXCLUDED.livro,
         EXCLUDED.pagina, EXCLUDED.descricao, EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('desvantagem_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- ---------- coleção do site → tabela (migration 12, com disadvantages) ----------
CREATE OR REPLACE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'disadvantages' THEN 'desvantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos' WHEN 'weapons' THEN 'armas' WHEN 'armors' THEN 'armaduras'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- Grava o item da coleção p_col (migration 12, com desvantagens).
CREATE OR REPLACE FUNCTION hounds_interno.gravar(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF COALESCE(p_id, '') = '' THEN RAISE EXCEPTION 'Item sem id.' USING ERRCODE = 'invalid_parameter_value'; END IF;
  IF jsonb_typeof(p_doc) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Dados inválidos para %.', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  CASE hounds_interno.tabela(p_col)
    WHEN 'usuarios' THEN PERFORM hounds_interno.salvar_usuario(p_id, p_doc);
    WHEN 'mapas' THEN PERFORM hounds_interno.salvar_mapa(p_id, p_doc);
    WHEN 'marcadores' THEN PERFORM hounds_interno.salvar_marcador(split_part(p_col, '/', 2), p_id, p_doc);
    WHEN 'locais' THEN PERFORM hounds_interno.salvar_local(p_id, p_doc);
    WHEN 'fichas' THEN PERFORM hounds_interno.salvar_ficha(p_id, p_doc);
    WHEN 'personagens' THEN PERFORM hounds_interno.salvar_personagem(p_id, p_doc);
    WHEN 'organizacoes' THEN PERFORM hounds_interno.salvar_organizacao(p_id, p_doc);
    WHEN 'eventos' THEN PERFORM hounds_interno.salvar_evento(p_id, p_doc);
    WHEN 'cadernos' THEN PERFORM hounds_interno.salvar_caderno(p_id, p_doc);
    WHEN 'anotacoes' THEN PERFORM hounds_interno.salvar_anotacao(p_id, p_doc);
    WHEN 'magias' THEN PERFORM hounds_interno.salvar_magia(p_id, p_doc);
    WHEN 'vantagens' THEN PERFORM hounds_interno.salvar_vantagem(p_id, p_doc);
    WHEN 'desvantagens' THEN PERFORM hounds_interno.salvar_desvantagem(p_id, p_doc);
    WHEN 'pericias' THEN PERFORM hounds_interno.salvar_pericia(p_id, p_doc);
    WHEN 'tecnicas' THEN PERFORM hounds_interno.salvar_tecnica(p_id, p_doc);
    WHEN 'estilos' THEN PERFORM hounds_interno.salvar_estilo(p_id, p_doc);
    WHEN 'armas' THEN PERFORM hounds_interno.salvar_arma(p_id, p_doc);
    WHEN 'armaduras' THEN PERFORM hounds_interno.salvar_armadura(p_id, p_doc);
    WHEN 'mesa_estado' THEN PERFORM hounds_interno.salvar_mesa_estado(p_id, p_doc);
    WHEN 'mesa_partes' THEN PERFORM hounds_interno.salvar_mesa_parte(p_id, p_doc);
    ELSE RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END $$;

-- A mesma conferência da migration 12, com desvantagens entre os catálogos do Mestre.
CREATE OR REPLACE FUNCTION hounds_interno.autorizar(p_col TEXT, p_id TEXT, p_doc JSONB, p_remover BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  u TEXT;
  papel TEXT;
  mestre BOOLEAN;
  atual JSONB;
BEGIN
  IF hounds_interno.servico() THEN RETURN p_doc; END IF;
  u := hounds_interno.usuario_atual();
  IF u IS NULL THEN
    RAISE EXCEPTION 'Entre com a sua conta para salvar. Se já entrou, recarregue a página.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  papel := hounds_interno.papel_atual();
  mestre := papel = 'mestre';

  IF t = 'usuarios' THEN
    IF COALESCE(papel, '') NOT IN ('mestre', 'admin') THEN
      RAISE EXCEPTION 'Só o Mestre e o Admin podem alterar usuários.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT mestre THEN
      atual := hounds_interno.ler(p_col, p_id) -> 'data';
      IF atual ->> 'role' = 'mestre' THEN
        RAISE EXCEPTION 'Só o Mestre pode alterar ou excluir um Mestre.' USING ERRCODE = 'insufficient_privilege';
      END IF;
      IF NOT p_remover AND p_doc ->> 'role' = 'mestre' THEN
        RAISE EXCEPTION 'Só o Mestre pode dar o perfil de Mestre.' USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
    RETURN CASE WHEN p_remover THEN NULL ELSE p_doc END;
  END IF;

  IF t IN ('magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras') AND NOT mestre THEN
    RAISE EXCEPTION 'Só o Mestre pode alterar isto.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t IN ('mesa_estado', 'mesa_partes') THEN RETURN p_doc; END IF; -- a Mesa tem as próprias regras, dentro dela
  atual := hounds_interno.ler(p_col, p_id) -> 'data';
  IF atual IS NOT NULL THEN
    IF NOT mestre AND NOT hounds_interno.pode_ver(atual, u) THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar este item.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_remover THEN RETURN NULL; END IF;
    p_doc := p_doc || jsonb_build_object('createdBy', atual -> 'createdBy');
    IF NOT mestre THEN
      p_doc := p_doc || jsonb_build_object('sharedWith', COALESCE(atual -> 'sharedWith', '[]'::jsonb));
      IF COALESCE(p_doc ->> 'visible', 'true') <> COALESCE(atual ->> 'visible', 'true') AND atual ->> 'createdBy' IS DISTINCT FROM u THEN
        RAISE EXCEPTION 'Só o Mestre e quem criou podem mudar quem vê este item.' USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  ELSIF NOT p_remover THEN
    p_doc := p_doc || jsonb_build_object('createdBy', u);
    IF NOT mestre THEN p_doc := p_doc || jsonb_build_object('sharedWith', '[]'::jsonb); END IF;
  END IF;
  RETURN p_doc;
END $$;

-- ---------- permissões (as mesmas das outras tabelas, migration 7) ----------
-- Leitura só para contas ligadas a um usuário; escrita só pelas funções hounds_*.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['desvantagens', 'desvantagem_compartilhamento'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
  REVOKE ALL ON public.desvantagens_doc FROM anon, authenticated;
  GRANT SELECT ON public.desvantagens_doc TO authenticated;
END $$;

-- A função nova, como as outras internas: ninguém além do dono (as públicas rodam como ele).
REVOKE ALL ON FUNCTION hounds_interno.salvar_desvantagem(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------- Realtime: avisos de alteração da tabela ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'desvantagens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.desvantagens;
  END IF;
END $$;
