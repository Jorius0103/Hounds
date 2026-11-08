-- ============================================================
-- 63 · CATÁLOGO DAS REGRAS CINEMÁTICAS
-- A aba Cinematic de Regras › Combate: as regras cinemáticas dos
-- livros (Cinematic Combat Rules, Chambara Fighting, Bullet Time...)
-- ficam em dados/cinematicas.json, como os outros catálogos (veja
-- "Catálogos de GURPS" em js/mundo.js). Aqui fica só o que o Mestre
-- criou ou mudou: uma linha com o id do livro (cine_*) guarda as
-- mudanças dele numa entrada dos livros (texto, visibilidade ou
-- excluída), e uma coluna nula segue o livro; as regras que ele cria
-- têm ids próprios.
-- As funções tabela, gravar e autorizar são as mais recentes (a da
-- migration 39 e as da tabuleiro_mesa_virtual) com a coleção nova;
-- o resto delas não muda. Sem Realtime: os catálogos são lidos quando
-- o site abre (migration 30).
-- Rode antes de publicar a versão do site em que o Mestre cria regras
-- cinemáticas: sem a tabela, a aba mostra só as regras dos livros e
-- gravar uma regra dá erro. Pode rodar uma vez só (cria as tabelas).
-- ============================================================

CREATE TABLE public.cinematicas (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  -- O tema do filtro da aba ("Regras de combate", "Chambara", "Esforço extra"...).
  categoria     TEXT,
  -- O título do livro sob o qual a regra está ("Cinematic Combat Rules", "More Cinematic Combat Rules").
  secao         TEXT,
  descricao     TEXT,
  livro         TEXT,
  pagina        TEXT,
  excluida      BOOLEAN NOT NULL DEFAULT false,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas que veem uma regra oculta (sharedWith), como nos outros catálogos.
CREATE TABLE public.cinematica_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.cinematicas (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);

-- ---------- triggers e índices (os mesmos das outras tabelas, migrations 2 e 62) ----------
CREATE TRIGGER cinematicas_gravado_em BEFORE INSERT OR UPDATE ON public.cinematicas
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE INDEX cinematicas_criado_por_idx ON public.cinematicas (criado_por);
CREATE INDEX cinematica_compartilhamento_usuario_id_idx ON public.cinematica_compartilhamento (usuario_id);
CREATE TRIGGER cinematica_compartilhamento_dono AFTER INSERT OR UPDATE OR DELETE ON public.cinematica_compartilhamento
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('cinematicas', 'item_id');

-- ---------- view de leitura ----------
-- Campos nulos (que seguem o livro) ficam fora do objeto, para não apagar o texto do livro.
CREATE VIEW public.cinematicas_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'category', x.categoria, 'section', x.secao, 'description', x.descricao,
    'book', x.livro, 'page', x.pagina, 'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.cinematica_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.cinematicas x;

-- ---------- gravação ----------
-- Catálogos: campo que não veio fica nulo (numa entrada dos livros, segue o livro).
CREATE FUNCTION hounds_interno.salvar_cinematica(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.cinematicas AS t (id, nome, categoria, secao, descricao, livro, pagina,
                                       excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'category'), hounds_interno.texto(d -> 'section'),
          hounds_interno.texto(d -> 'description'), hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, categoria, secao, descricao, livro, pagina,
                                  excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.categoria, EXCLUDED.secao, EXCLUDED.descricao, EXCLUDED.livro, EXCLUDED.pagina,
         EXCLUDED.excluida, EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('cinematica_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

-- ---------- coleção do site → tabela (a da migration 39, com cinematics) ----------
-- Ao acrescentar coleções, copie esta versão (o CREATE OR REPLACE sem o SET apaga o search_path).
CREATE OR REPLACE FUNCTION hounds_interno.tabela(p_col TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_col ~ '^maps/[^/]+/markers$' THEN 'marcadores'
    ELSE CASE p_col
      WHEN 'users' THEN 'usuarios' WHEN 'maps' THEN 'mapas' WHEN 'locations' THEN 'locais' WHEN 'characters' THEN 'personagens'
      WHEN 'organizations' THEN 'organizacoes' WHEN 'sheets' THEN 'fichas' WHEN 'events' THEN 'eventos'
      WHEN 'notebooks' THEN 'cadernos' WHEN 'notes' THEN 'anotacoes'
      WHEN 'spells' THEN 'magias' WHEN 'advantages' THEN 'vantagens' WHEN 'disadvantages' THEN 'desvantagens' WHEN 'skills' THEN 'pericias'
      WHEN 'techniques' THEN 'tecnicas' WHEN 'styles' THEN 'estilos' WHEN 'cinematics' THEN 'cinematicas' WHEN 'weapons' THEN 'armas' WHEN 'armors' THEN 'armaduras'
      WHEN 'items' THEN 'itens' WHEN 'improvements' THEN 'melhoramentos' WHEN 'armorLocs' THEN 'armadura_localizacoes'
      WHEN 'boards' THEN 'tabuleiros' WHEN 'boardTokens' THEN 'tabuleiro_tokens' WHEN 'boardDrawings' THEN 'tabuleiro_desenhos'
      WHEN 'boardTurns' THEN 'tabuleiro_turnos' WHEN 'boardArt' THEN 'tabuleiro_arte' WHEN 'boardCampaign' THEN 'tabuleiro_campanha'
      WHEN 'chatMessages' THEN 'chat_mensagens'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- Grava o item da coleção p_col (a da tabuleiro_mesa_virtual, com cinematicas).
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
    WHEN 'cinematicas' THEN PERFORM hounds_interno.salvar_cinematica(p_id, p_doc);
    WHEN 'armas' THEN PERFORM hounds_interno.salvar_arma(p_id, p_doc);
    WHEN 'armaduras' THEN PERFORM hounds_interno.salvar_armadura(p_id, p_doc);
    WHEN 'itens' THEN PERFORM hounds_interno.salvar_item(p_id, p_doc);
    WHEN 'melhoramentos' THEN PERFORM hounds_interno.salvar_melhoramento(p_id, p_doc);
    WHEN 'armadura_localizacoes' THEN PERFORM hounds_interno.salvar_armadura_localizacao(p_id, p_doc);
    WHEN 'tabuleiros' THEN PERFORM hounds_interno.salvar_tabuleiro(p_id, p_doc);
    WHEN 'tabuleiro_tokens' THEN PERFORM hounds_interno.salvar_tabuleiro_token(p_id, p_doc);
    WHEN 'tabuleiro_desenhos' THEN PERFORM hounds_interno.salvar_tabuleiro_desenho(p_id, p_doc);
    WHEN 'tabuleiro_turnos' THEN PERFORM hounds_interno.salvar_tabuleiro_turno(p_id, p_doc);
    WHEN 'tabuleiro_arte' THEN PERFORM hounds_interno.salvar_tabuleiro_arte(p_id, p_doc);
    WHEN 'tabuleiro_campanha' THEN PERFORM hounds_interno.salvar_tabuleiro_campanha(p_id, p_doc);
    WHEN 'chat_mensagens' THEN PERFORM hounds_interno.salvar_chat_mensagem(p_id, p_doc);
    WHEN 'mesa_estado' THEN PERFORM hounds_interno.salvar_mesa_estado(p_id, p_doc);
    WHEN 'mesa_partes' THEN PERFORM hounds_interno.salvar_mesa_parte(p_id, p_doc);
    ELSE RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END $$;

-- A mesma conferência da tabuleiro_mesa_virtual, com cinematicas entre os catálogos do Mestre.
CREATE OR REPLACE FUNCTION hounds_interno.autorizar(p_col TEXT, p_id TEXT, p_doc JSONB, p_remover BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  u TEXT;
  papel TEXT;
  mestre BOOLEAN;
  atual JSONB;
  v_itens JSONB;
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

  IF t IN ('magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'cinematicas', 'armas', 'armaduras', 'itens',
           'melhoramentos', 'armadura_localizacoes', 'tabuleiro_arte', 'tabuleiro_campanha') AND NOT mestre THEN
    RAISE EXCEPTION 'Só o Mestre pode alterar isto.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Chat: cada um escreve como a própria conta; ninguém muda uma mensagem; só o Mestre apaga.
  -- O Jogador aparece com o nome dele ou o do personagem que escolheu, e não usa /desc.
  IF t = 'chat_mensagens' THEN
    IF p_remover THEN
      IF NOT mestre THEN RAISE EXCEPTION 'Só o Mestre apaga mensagens do chat.' USING ERRCODE = 'insufficient_privilege'; END IF;
      RETURN NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM public.chat_mensagens m WHERE m.id = p_id) THEN
      RAISE EXCEPTION 'Uma mensagem do chat não pode ser mudada.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT mestre THEN
      IF p_doc ->> 'kind' = 'desc' THEN
        RAISE EXCEPTION 'Só o Mestre escreve descrições (/desc).' USING ERRCODE = 'insufficient_privilege';
      END IF;
      p_doc := p_doc || jsonb_build_object('as', COALESCE((SELECT p.nome FROM public.personagens p WHERE p.id = p_doc ->> 'characterId'),
                                                          (SELECT x.nome FROM public.usuarios x WHERE x.id = u), ''));
    END IF;
    RETURN p_doc || jsonb_build_object('createdBy', u);
  END IF;

  -- Tabuleiro, pelo Jogador: só as áreas exploradas pelos tokens dele, e só na versão atual do
  -- explorado (depois que o Mestre o apagou, uma gravação antiga não o põe de volta). O resto
  -- fica como está no banco.
  IF t = 'tabuleiros' AND NOT mestre THEN
    atual := hounds_interno.ler(p_col, p_id) -> 'data';
    IF atual IS NULL OR p_remover THEN
      RAISE EXCEPTION 'Só o Mestre cria ou exclui tabuleiros.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT hounds_interno.pode_ver(atual, u) THEN
      RAISE EXCEPTION 'Você não tem permissão para alterar este item.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN atual || CASE WHEN (p_doc -> 'exploredEpoch') = (atual -> 'exploredEpoch') AND p_doc ? 'explored'
                         THEN jsonb_build_object('explored', p_doc -> 'explored') ELSE '{}'::jsonb END;
  END IF;
  -- Token, pelo Jogador: só um token que ele controla, e só a posição, a direção, os PV, os PF e
  -- os marcadores.
  IF t = 'tabuleiro_tokens' AND NOT mestre THEN
    atual := hounds_interno.ler(p_col, p_id) -> 'data';
    IF atual IS NULL OR p_remover OR NOT COALESCE(atual -> 'ownerIds', '[]'::jsonb) ? u THEN
      RAISE EXCEPTION 'Só o Mestre e quem controla o token podem mexer nele.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN atual || jsonb_strip_nulls(jsonb_build_object('x', p_doc -> 'x', 'y', p_doc -> 'y', 'rotation', p_doc -> 'rotation',
                                                         'hp', p_doc -> 'hp', 'fp', p_doc -> 'fp', 'markers', p_doc -> 'markers',
                                                         'updatedAt', p_doc -> 'updatedAt'));
  END IF;
  -- Desenho, pelo Jogador: desenha na camada dos tokens e só muda ou apaga os próprios desenhos.
  IF t = 'tabuleiro_desenhos' AND NOT mestre THEN
    atual := hounds_interno.ler(p_col, p_id) -> 'data';
    IF atual IS NOT NULL AND atual ->> 'createdBy' IS DISTINCT FROM u THEN
      RAISE EXCEPTION 'Só o Mestre e quem desenhou podem mudar este desenho.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_remover THEN RETURN NULL; END IF;
    RETURN p_doc || jsonb_build_object('createdBy', u, 'layer', 'tokens');
  END IF;
  -- Ordem de turno, pelo Jogador: os itens dos tokens que ele controla (pôr, mudar o valor, tirar);
  -- os outros itens, a ordem deles, a vez, a rodada e se a janela está aberta ficam como estão.
  IF t = 'tabuleiro_turnos' AND NOT mestre THEN
    atual := hounds_interno.ler(p_col, p_id) -> 'data';
    IF atual IS NULL OR p_remover THEN
      RAISE EXCEPTION 'Só o Mestre abre, limpa e fecha a ordem de turno.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT COALESCE(jsonb_agg(s.e ORDER BY s.n), '[]'::jsonb) INTO v_itens FROM (
      -- Os itens que já estavam: os dos tokens dele na versão nova (ou fora, se ele os tirou).
      SELECT CASE WHEN o.dele THEN novo.e || jsonb_build_object('id', a.e -> 'id', 'tokenId', a.e -> 'tokenId') ELSE a.e END AS e, a.n AS n
        FROM jsonb_array_elements(hounds_interno.lista(atual -> 'items')) WITH ORDINALITY AS a (e, n)
        CROSS JOIN LATERAL (SELECT hounds_interno.controla_token(a.e ->> 'tokenId', u) AS dele) o
        LEFT JOIN LATERAL (SELECT x.e FROM jsonb_array_elements(hounds_interno.lista(p_doc -> 'items')) AS x (e)
                            WHERE x.e ->> 'id' = a.e ->> 'id' LIMIT 1) novo ON true
       WHERE NOT o.dele OR novo.e IS NOT NULL
      UNION ALL
      -- Os novos, dos tokens dele, no fim.
      SELECT b.e, 1000000 + b.n
        FROM jsonb_array_elements(hounds_interno.lista(p_doc -> 'items')) WITH ORDINALITY AS b (e, n)
       WHERE hounds_interno.controla_token(b.e ->> 'tokenId', u)
         AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(hounds_interno.lista(atual -> 'items')) AS c (e) WHERE c.e ->> 'id' = b.e ->> 'id')
    ) s;
    RETURN atual || jsonb_build_object('items', v_itens);
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
  FOREACH t IN ARRAY ARRAY['cinematicas', 'cinematica_compartilhamento'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
  REVOKE ALL ON public.cinematicas_doc FROM anon, authenticated;
  GRANT SELECT ON public.cinematicas_doc TO authenticated;
END $$;

-- A função nova, como as outras internas: ninguém além do dono (as públicas rodam como ele).
REVOKE ALL ON FUNCTION hounds_interno.salvar_cinematica(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.autorizar(TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
