-- ============================================================
-- 12 · CATÁLOGOS DE ARMAS E ARMADURAS
-- As armas e as armaduras (com os escudos) dos livros ficam em
-- dados/armas.json e dados/armaduras.json, como os outros
-- catálogos (veja "Catálogos de GURPS" em js/mundo.js). Aqui fica
-- só o que o Mestre criou ou mudou: uma linha com o id do livro
-- (weapon_*, armor_*) guarda as mudanças dele numa entrada dos
-- livros, e uma coluna nula segue o livro.
-- Cada arma tem os ataques da tabela do livro (attacks), um por
-- linha, em arma_ataque. Sem nenhuma linha lá, os ataques seguem
-- o livro; editada pelo Mestre, a arma grava a lista inteira.
-- As funções tabela, gravar e autorizar são as das migrations 4 e
-- 9 com as duas coleções novas; o resto delas não muda.
-- Rode antes de publicar a versão do site com as abas Armas e
-- Armaduras: sem as tabelas, o site não consegue lê-las.
-- ============================================================

CREATE TABLE public.armas (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  tl            TEXT,
  -- Melee ou Ranged.
  tipo          TEXT,
  -- Título da tabela no livro ("Melee Weapon Table").
  tabela        TEXT,
  custo         TEXT,
  peso          TEXT,
  legalidade    TEXT,
  descricao     TEXT,
  -- Texto das notas numeradas da tabela citadas nos ataques, uma por linha.
  notas_tabela  TEXT,
  livro         TEXT,
  pagina        TEXT,
  excluida      BOOLEAN NOT NULL DEFAULT false,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Os ataques de uma arma, na ordem da tabela do livro, com os valores como o livro escreve
-- ("sw+1 cut", "1, 2*", "×15/×20").
CREATE TABLE public.arma_ataque (
  arma_id   TEXT NOT NULL REFERENCES public.armas (id) ON DELETE CASCADE,
  ordem     SMALLINT NOT NULL,
  pericia   TEXT,
  padroes   TEXT,
  -- O que o livro escreve no lugar do nome nas linhas seguintes: "or", "with Dart".
  modo      TEXT,
  dano      TEXT,
  alcance   TEXT,
  aparar    TEXT,
  precisao  TEXT,
  distancia TEXT,
  cadencia  TEXT,
  tiros     TEXT,
  espoleta  TEXT,
  st        TEXT,
  volume    TEXT,
  recuo     TEXT,
  -- Custo e peso próprios do ataque (o dardo e o dardo-lança do atlatl).
  custo     TEXT,
  peso      TEXT,
  notas     TEXT,
  PRIMARY KEY (arma_id, ordem)
);

CREATE TABLE public.armaduras (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  tl            TEXT,
  -- Armor ou Shield.
  tipo          TEXT,
  tabela        TEXT,
  -- Subtítulo da tabela de armaduras ("Body Armor", "Headgear").
  categoria     TEXT,
  -- Escudos: a perícia e os padrões do grupo da tabela.
  pericia       TEXT,
  padroes       TEXT,
  -- Partes do corpo que protege ("torso, groin").
  local_corpo   TEXT,
  rd            TEXT,
  bd            TEXT,
  pv            TEXT,
  rd_cobertura  TEXT,
  custo         TEXT,
  peso          TEXT,
  -- Segundos para vestir (Low-Tech).
  vestir        TEXT,
  legalidade    TEXT,
  notas         TEXT,
  notas_tabela  TEXT,
  livro         TEXT,
  pagina        TEXT,
  excluida      BOOLEAN NOT NULL DEFAULT false,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas que veem um item oculto (sharedWith), como nos outros catálogos.
CREATE TABLE public.arma_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.armas (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.armadura_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.armaduras (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);

-- ---------- triggers (os mesmos das outras tabelas, migration 2) ----------
CREATE TRIGGER armas_gravado_em BEFORE INSERT OR UPDATE ON public.armas
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE TRIGGER armaduras_gravado_em BEFORE INSERT OR UPDATE ON public.armaduras
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE INDEX arma_compartilhamento_usuario_id_idx ON public.arma_compartilhamento (usuario_id);
CREATE INDEX armadura_compartilhamento_usuario_id_idx ON public.armadura_compartilhamento (usuario_id);
CREATE TRIGGER arma_compartilhamento_dono AFTER INSERT OR UPDATE OR DELETE ON public.arma_compartilhamento
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('armas', 'item_id');
CREATE TRIGGER armadura_compartilhamento_dono AFTER INSERT OR UPDATE OR DELETE ON public.armadura_compartilhamento
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('armaduras', 'item_id');

-- ---------- views de leitura ----------
-- Campos nulos (que seguem o livro) ficam fora do objeto, para não apagar o texto do livro;
-- sem ataques gravados, "attacks" também fica fora.
CREATE VIEW public.armas_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'tl', x.tl, 'type', x.tipo, 'table', x.tabela, 'cost', x.custo, 'weight', x.peso, 'lc', x.legalidade,
    'description', x.descricao, 'footnotes', x.notas_tabela, 'book', x.livro, 'page', x.pagina,
    'attacks', (SELECT jsonb_agg(jsonb_build_object(
                  'skill', a.pericia, 'defaults', a.padroes, 'mode', a.modo, 'damage', a.dano, 'reach', a.alcance, 'parry', a.aparar,
                  'acc', a.precisao, 'range', a.distancia, 'rof', a.cadencia, 'shots', a.tiros, 'fuse', a.espoleta, 'st', a.st,
                  'bulk', a.volume, 'rcl', a.recuo, 'cost', a.custo, 'weight', a.peso, 'notes', a.notas) ORDER BY a.ordem)
                FROM public.arma_ataque a WHERE a.arma_id = x.id),
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.arma_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.armas x;

CREATE VIEW public.armaduras_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'tl', x.tl, 'type', x.tipo, 'table', x.tabela, 'category', x.categoria, 'skill', x.pericia, 'defaults', x.padroes,
    'location', x.local_corpo, 'dr', x.rd, 'db', x.bd, 'hp', x.pv, 'coverDr', x.rd_cobertura, 'cost', x.custo, 'weight', x.peso,
    'don', x.vestir, 'lc', x.legalidade, 'notes', x.notas, 'footnotes', x.notas_tabela, 'book', x.livro, 'page', x.pagina,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.armadura_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.armaduras x;

-- ---------- gravação ----------
-- Catálogos: campo que não veio fica nulo (numa entrada dos livros, segue o livro).
CREATE FUNCTION hounds_interno.salvar_arma(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.armas AS t (id, nome, tl, tipo, tabela, custo, peso, legalidade, descricao, notas_tabela, livro, pagina,
                                 excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'tl'), hounds_interno.texto(d -> 'type'),
          hounds_interno.texto(d -> 'table'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'weight'),
          hounds_interno.texto(d -> 'lc'), hounds_interno.texto(d -> 'description'), hounds_interno.texto(d -> 'footnotes'),
          hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, tl, tipo, tabela, custo, peso, legalidade, descricao, notas_tabela, livro, pagina,
                                  excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.tl, EXCLUDED.tipo, EXCLUDED.tabela, EXCLUDED.custo, EXCLUDED.peso, EXCLUDED.legalidade,
         EXCLUDED.descricao, EXCLUDED.notas_tabela, EXCLUDED.livro, EXCLUDED.pagina, EXCLUDED.excluida, EXCLUDED.visivel,
         EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- Os ataques são regravados inteiros, na ordem recebida; sem "attacks", nenhum (seguem o livro).
  DELETE FROM public.arma_ataque WHERE arma_id = p_id;
  INSERT INTO public.arma_ataque (arma_id, ordem, pericia, padroes, modo, dano, alcance, aparar, precisao, distancia, cadencia,
                                  tiros, espoleta, st, volume, recuo, custo, peso, notas)
  SELECT p_id, (row_number() OVER (ORDER BY a.n) - 1)::smallint,
         hounds_interno.texto(a.v -> 'skill'), hounds_interno.texto(a.v -> 'defaults'), hounds_interno.texto(a.v -> 'mode'),
         hounds_interno.texto(a.v -> 'damage'), hounds_interno.texto(a.v -> 'reach'), hounds_interno.texto(a.v -> 'parry'),
         hounds_interno.texto(a.v -> 'acc'), hounds_interno.texto(a.v -> 'range'), hounds_interno.texto(a.v -> 'rof'),
         hounds_interno.texto(a.v -> 'shots'), hounds_interno.texto(a.v -> 'fuse'), hounds_interno.texto(a.v -> 'st'),
         hounds_interno.texto(a.v -> 'bulk'), hounds_interno.texto(a.v -> 'rcl'), hounds_interno.texto(a.v -> 'cost'),
         hounds_interno.texto(a.v -> 'weight'), hounds_interno.texto(a.v -> 'notes')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'attacks')) WITH ORDINALITY AS a (v, n)
  WHERE jsonb_typeof(a.v) = 'object';

  PERFORM hounds_interno.gravar_vinculos('arma_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE FUNCTION hounds_interno.salvar_armadura(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.armaduras AS t (id, nome, tl, tipo, tabela, categoria, pericia, padroes, local_corpo, rd, bd, pv, rd_cobertura,
                                     custo, peso, vestir, legalidade, notas, notas_tabela, livro, pagina,
                                     excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'tl'), hounds_interno.texto(d -> 'type'),
          hounds_interno.texto(d -> 'table'), hounds_interno.texto(d -> 'category'), hounds_interno.texto(d -> 'skill'),
          hounds_interno.texto(d -> 'defaults'), hounds_interno.texto(d -> 'location'), hounds_interno.texto(d -> 'dr'),
          hounds_interno.texto(d -> 'db'), hounds_interno.texto(d -> 'hp'), hounds_interno.texto(d -> 'coverDr'),
          hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'weight'), hounds_interno.texto(d -> 'don'),
          hounds_interno.texto(d -> 'lc'), hounds_interno.texto(d -> 'notes'), hounds_interno.texto(d -> 'footnotes'),
          hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, tl, tipo, tabela, categoria, pericia, padroes, local_corpo, rd, bd, pv, rd_cobertura,
                                  custo, peso, vestir, legalidade, notas, notas_tabela, livro, pagina,
                                  excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.tl, EXCLUDED.tipo, EXCLUDED.tabela, EXCLUDED.categoria, EXCLUDED.pericia, EXCLUDED.padroes,
         EXCLUDED.local_corpo, EXCLUDED.rd, EXCLUDED.bd, EXCLUDED.pv, EXCLUDED.rd_cobertura, EXCLUDED.custo, EXCLUDED.peso,
         EXCLUDED.vestir, EXCLUDED.legalidade, EXCLUDED.notas, EXCLUDED.notas_tabela, EXCLUDED.livro, EXCLUDED.pagina,
         EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('armadura_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- ---------- coleção do site → tabela (migration 4, com weapons e armors) ----------
CREATE OR REPLACE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos' WHEN 'weapons' THEN 'armas' WHEN 'armors' THEN 'armaduras'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- Grava o item da coleção p_col (migration 4, com armas e armaduras).
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

-- A mesma conferência da migration 9, com armas e armaduras entre os catálogos do Mestre.
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

  IF t IN ('magias', 'vantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras') AND NOT mestre THEN
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
  FOREACH t IN ARRAY ARRAY['armas', 'arma_ataque', 'armaduras', 'arma_compartilhamento', 'armadura_compartilhamento'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['armas_doc', 'armaduras_doc'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- As funções novas, como as outras internas: ninguém além do dono (as públicas rodam como ele).
REVOKE ALL ON FUNCTION hounds_interno.salvar_arma(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_armadura(TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- ---------- Realtime: avisos de alteração das tabelas principais ----------
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['armas', 'armaduras'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
