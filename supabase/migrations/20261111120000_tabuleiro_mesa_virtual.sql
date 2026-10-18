-- ============================================================
-- 34 · MESA VIRTUAL DOS TABULEIROS
-- O que a aba Tabuleiros ganhou para funcionar como uma mesa virtual, no
-- jeito do editor do Roll20 (js/tabs/tab-tabuleiros.js e js/tabuleiro-*.js):
--   chat_mensagens      o chat da mesa: falas, ações (/em), descrições do
--                       Mestre (/desc), sussurros (/w) e rolagens de dados
--                       (/r), que o próprio banco rola (rolar_dados);
--   tabuleiro_turnos    a ordem de turno de cada tabuleiro;
--   tabuleiro_arte      a biblioteca de arte do Mestre (imagens para tokens);
--   tabuleiro_campanha  uma linha só ('mesa'): em que tabuleiro os jogadores
--                       estão (a fita), um tabuleiro próprio para quem se
--                       separou do grupo e a ordem das páginas;
--   e, nos tokens e desenhos, a camada de primeiro plano (fore); nos tokens,
--   os PF (fadiga) e os marcadores de estado (atordoado, caído...).
-- Permissões (em autorizar):
--   Mestre   tudo; apaga mensagens do chat, mas não muda nenhuma;
--   Jogador  manda mensagens sempre como a própria conta (createdBy é ele,
--            e o nome que aparece é o dele ou o do personagem escolhido),
--            sem /desc; não muda nem apaga mensagens; na ordem de turno, só
--            põe, muda o valor e tira os tokens que controla; num token que
--            controla, muda também os PF e os marcadores; a arte e a
--            campanha são do Mestre.
-- Leitura do chat (RLS, além do login): quem escreveu, menos numa rolagem
-- secreta; o Mestre, nas mensagens só para o Mestre e nas secretas; todos,
-- nas públicas; os destinatários, nos sussurros. Um sussurro entre dois
-- jogadores o Mestre não lê, como no Roll20.
-- A view chat_mensagens_doc tem só as 500 mensagens mais novas que cada um
-- pode ler: o site carrega o chat inteiro de uma vez.
-- Realtime: chat_mensagens, tabuleiro_turnos e tabuleiro_campanha entram na
-- publicação; os avisos seguem a RLS (um sussurro só chega a quem o lê).
-- Como na 33, não rode a 30 de novo depois desta: ela tira estas tabelas
-- da publicação (rode só o último bloco desta para pôr de volta).
-- As funções tabela, gravar e autorizar são as da migration 33 com as
-- coleções novas; o resto delas não muda. Rode depois da 33.
-- ============================================================

-- ---------- tokens e desenhos: primeiro plano, PF e marcadores ----------
ALTER TABLE public.tabuleiro_tokens
  -- Fadiga (PF de GURPS), a segunda barra do token.
  ADD COLUMN pf         INTEGER,
  ADD COLUMN pf_max     INTEGER CHECK (pf_max IS NULL OR pf_max >= 0),
  -- Marcadores de estado, pelos ids que js/tabs/tab-tabuleiros.js conhece (BOARD_MARKERS).
  ADD COLUMN marcadores JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(marcadores) = 'array');
-- fore: primeiro plano, acima dos tokens (copas de árvores, telhados), visto por todos.
ALTER TABLE public.tabuleiro_tokens DROP CONSTRAINT IF EXISTS tabuleiro_tokens_camada_check;
ALTER TABLE public.tabuleiro_tokens ADD CONSTRAINT tabuleiro_tokens_camada_check CHECK (camada IN ('map', 'tokens', 'gm', 'fore'));
ALTER TABLE public.tabuleiro_desenhos DROP CONSTRAINT IF EXISTS tabuleiro_desenhos_camada_check;
ALTER TABLE public.tabuleiro_desenhos ADD CONSTRAINT tabuleiro_desenhos_camada_check CHECK (camada IN ('map', 'tokens', 'gm', 'fore'));

-- ---------- tabelas novas ----------
CREATE TABLE public.chat_mensagens (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  -- say: fala; emote: ação (/em); desc: descrição do Mestre (/desc); roll: rolagem (/r).
  tipo           TEXT NOT NULL DEFAULT 'say' CHECK (tipo IN ('say', 'emote', 'desc', 'roll')),
  texto          TEXT NOT NULL DEFAULT '' CHECK (length(texto) <= 2000),
  -- O nome com que a mensagem aparece (o "Como:" do chat): a conta ou um personagem.
  como           TEXT NOT NULL DEFAULT '' CHECK (length(como) <= 80),
  personagem_id  TEXT REFERENCES public.personagens (id) ON DELETE SET NULL,
  -- O tabuleiro de onde a mensagem saiu (o chat é um só para todos os tabuleiros).
  tabuleiro_id   TEXT REFERENCES public.tabuleiros (id) ON DELETE SET NULL,
  -- Sussurro: as contas que leem, além de quem escreveu. Vazio: todos.
  para           TEXT[] NOT NULL DEFAULT '{}',
  -- Só o Mestre lê, além de quem escreveu (/w gm, /gr). Secreta: nem quem rolou vê o resultado.
  so_mestre      BOOLEAN NOT NULL DEFAULT false,
  secreta        BOOLEAN NOT NULL DEFAULT false,
  -- Rolagem (tipo roll): o que saiu ({ ex, g, mod, tot }, de rolar_dados), o NH do teste de
  -- GURPS, se explodiu e o rótulo ("Esquiva", "ST").
  rolagem        JSONB CHECK (rolagem IS NULL OR jsonb_typeof(rolagem) = 'object'),
  -- As rolagens no meio do texto ([[1d6+2]]), na ordem em que aparecem.
  rolagens_texto JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(rolagens_texto) = 'array'),
  autor_id       TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_mensagens_criado_em_idx ON public.chat_mensagens (criado_em DESC, id DESC);
CREATE INDEX chat_mensagens_personagem_id_idx ON public.chat_mensagens (personagem_id);
CREATE INDEX chat_mensagens_tabuleiro_id_idx ON public.chat_mensagens (tabuleiro_id);
CREATE INDEX chat_mensagens_autor_id_idx ON public.chat_mensagens (autor_id);

-- Uma por tabuleiro (o id é o do tabuleiro). Os itens ficam na ordem de agir; passar o turno
-- leva a vez ao item seguinte e, depois do último, ao primeiro, numa rodada nova.
CREATE TABLE public.tabuleiro_turnos (
  id            TEXT PRIMARY KEY REFERENCES public.tabuleiros (id) ON DELETE CASCADE,
  -- [{ id, tokenId, name, value }]: sem tokenId, um item avulso (um efeito, o fim da rodada).
  -- value é a iniciativa: em GURPS, a Velocidade Básica.
  itens         JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(itens) = 'array'),
  -- O id do item da vez (nulo: o primeiro). Pelo id, e não pela posição, a vez continua com o
  -- mesmo item quando um jogador põe ou tira um token dele.
  vez           TEXT,
  rodada        INTEGER NOT NULL DEFAULT 1 CHECK (rodada BETWEEN 1 AND 100000),
  -- O Mestre abriu a ordem de turno: os jogadores também a veem.
  aberto        BOOLEAN NOT NULL DEFAULT false,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tabuleiro_arte (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  nome           TEXT NOT NULL DEFAULT '' CHECK (length(nome) <= 80),
  imagem_ref     TEXT NOT NULL CHECK (imagem_ref <> ''),
  imagem_largura INTEGER,
  imagem_altura  INTEGER,
  imagem_tipo    TEXT,
  imagem_tamanho BIGINT,
  -- Pasta da biblioteca ('' é a raiz).
  pasta          TEXT NOT NULL DEFAULT '' CHECK (length(pasta) <= 60),
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tabuleiro_campanha (
  id               TEXT PRIMARY KEY CHECK (id = 'mesa'),
  -- A fita dos jogadores: o tabuleiro em que o grupo está.
  pagina_jogadores TEXT REFERENCES public.tabuleiros (id) ON DELETE SET NULL,
  -- { idDoUsuario: idDoTabuleiro }: quem está num tabuleiro diferente do grupo.
  paginas_jogador  JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(paginas_jogador) = 'object'),
  -- A ordem das páginas na barra de páginas do Mestre (ids de tabuleiros); os outros vêm depois.
  ordem_paginas    JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(ordem_paginas) = 'array'),
  criado_por       TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- triggers (os mesmos das outras tabelas, migration 2) ----------
CREATE TRIGGER chat_mensagens_gravado_em BEFORE INSERT OR UPDATE ON public.chat_mensagens
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE TRIGGER tabuleiro_turnos_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiro_turnos
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE TRIGGER tabuleiro_arte_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiro_arte
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE TRIGGER tabuleiro_campanha_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiro_campanha
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();

-- ---------- views de leitura ----------
-- Os tokens com os campos novos (as mesmas colunas da view da 33).
CREATE OR REPLACE VIEW public.tabuleiro_tokens_doc WITH (security_invoker = true) AS
SELECT k.id, k.gravado_em AS updated_at,
  jsonb_build_object(
    'boardId', k.tabuleiro_id,
    'name', k.nome, 'x', k.x, 'y', k.y, 'size', k.tamanho, 'rotation', k.rotacao, 'color', k.cor,
    'image', hounds_interno.imagem(k.imagem_ref, k.imagem_largura, k.imagem_altura, k.imagem_tipo, k.imagem_tamanho),
    'characterId', k.personagem_id,
    'layer', k.camada,
    'ownerIds', COALESCE((SELECT jsonb_agg(o.usuario_id ORDER BY o.ordem) FROM public.tabuleiro_token_dono o WHERE o.token_id = k.id), '[]'::jsonb),
    'sight', k.visao, 'sightRange', k.visao_alcance, 'darkvision', k.visao_escuro,
    'lightBright', k.luz_forte, 'lightDim', k.luz_fraca,
    'hp', k.pv, 'hpMax', k.pv_max, 'fp', k.pf, 'fpMax', k.pf_max, 'markers', k.marcadores,
    'showName', k.mostrar_nome,
    'createdBy', k.criado_por,
    'createdAt', hounds_interno.ms(k.criado_em),
    'updatedAt', hounds_interno.ms(k.atualizado_em)) AS data
FROM public.tabuleiro_tokens k;

-- Só as 500 mais novas que quem lê pode ver (a RLS da tabela vale antes do limite).
CREATE VIEW public.chat_mensagens_doc WITH (security_invoker = true) AS
SELECT m.id, m.gravado_em AS updated_at,
  jsonb_build_object(
    'kind', m.tipo, 'text', m.texto, 'as', m.como, 'characterId', m.personagem_id, 'boardId', m.tabuleiro_id,
    'to', to_jsonb(m.para), 'gm', m.so_mestre, 'secret', m.secreta,
    'roll', m.rolagem, 'inline', m.rolagens_texto,
    'createdBy', m.autor_id,
    'createdAt', hounds_interno.ms(m.criado_em),
    'updatedAt', hounds_interno.ms(m.atualizado_em)) AS data
FROM (SELECT * FROM public.chat_mensagens c ORDER BY c.criado_em DESC, c.id DESC LIMIT 500) m;

CREATE VIEW public.tabuleiro_turnos_doc WITH (security_invoker = true) AS
SELECT t.id, t.gravado_em AS updated_at,
  jsonb_build_object(
    'boardId', t.id, 'items', t.itens, 'turn', t.vez, 'round', t.rodada, 'open', t.aberto,
    'createdBy', t.criado_por,
    'createdAt', hounds_interno.ms(t.criado_em),
    'updatedAt', hounds_interno.ms(t.atualizado_em)) AS data
FROM public.tabuleiro_turnos t;

CREATE VIEW public.tabuleiro_arte_doc WITH (security_invoker = true) AS
SELECT a.id, a.gravado_em AS updated_at,
  jsonb_build_object(
    'name', a.nome,
    'image', hounds_interno.imagem(a.imagem_ref, a.imagem_largura, a.imagem_altura, a.imagem_tipo, a.imagem_tamanho),
    'folder', a.pasta,
    'createdBy', a.criado_por,
    'createdAt', hounds_interno.ms(a.criado_em),
    'updatedAt', hounds_interno.ms(a.atualizado_em)) AS data
FROM public.tabuleiro_arte a;

CREATE VIEW public.tabuleiro_campanha_doc WITH (security_invoker = true) AS
SELECT c.id, c.gravado_em AS updated_at,
  jsonb_build_object(
    'playersBoardId', c.pagina_jogadores, 'perPlayer', c.paginas_jogador, 'order', c.ordem_paginas,
    'createdBy', c.criado_por,
    'createdAt', hounds_interno.ms(c.criado_em),
    'updatedAt', hounds_interno.ms(c.atualizado_em)) AS data
FROM public.tabuleiro_campanha c;

-- ---------- dados ----------
-- Rola uma expressão como as do site (BoardDice em js/tabuleiro-dados.js): "3d6+2", "2d10 - 1",
-- "d20", "4dF" (Fudge: -1, 0 ou +1 cada). Com p_explodir, um dado no valor mais alto rola de novo
-- e soma (até 20 vezes). Devolve { ex, g: [{ s, sg, r }], mod, tot } (o mesmo formato que o site
-- grava no banco local), ou null se a expressão não for entendida.
CREATE FUNCTION hounds_interno.rolar_dados(p_expr TEXT, p_explodir BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SET search_path = '' AS $$
DECLARE
  s TEXT := lower(COALESCE(p_expr, ''));
  m TEXT[];
  lido TEXT := '';
  primeiro BOOLEAN := true;
  sinal INTEGER;
  n INTEGER;
  lados INTEGER;
  fudge BOOLEAN;
  dados INTEGER := 0;
  modificador BIGINT := 0;
  grupos JSONB := '[]'::jsonb;
  faces JSONB;
  soma BIGINT;
  total BIGINT := 0;
  v INTEGER;
  extra INTEGER;
  ex TEXT := '';
BEGIN
  -- Espaços só em volta dos sinais: "3d6 2" não é 3d62.
  IF s ~ '[0-9fd]\s+[0-9fd]' THEN RETURN NULL; END IF;
  s := regexp_replace(s, '\s+', '', 'g');
  IF s = '' OR length(s) > 80 THEN RETURN NULL; END IF;
  FOR m IN SELECT regexp_matches(s, '(([+-])?(?:([0-9]*)d([0-9]+|f)|([0-9]+)))', 'g') LOOP
    lido := lido || m[1];
    -- Só o primeiro termo vai sem sinal.
    IF NOT primeiro AND COALESCE(m[2], '') = '' THEN RETURN NULL; END IF;
    primeiro := false;
    sinal := CASE WHEN m[2] = '-' THEN -1 ELSE 1 END;
    IF COALESCE(m[5], '') <> '' THEN
      IF length(m[5]) > 6 THEN RETURN NULL; END IF;
      modificador := modificador + sinal * m[5]::BIGINT;
      CONTINUE;
    END IF;
    IF length(COALESCE(m[3], '')) > 3 OR length(m[4]) > 4 THEN RETURN NULL; END IF;
    n := CASE WHEN COALESCE(m[3], '') = '' THEN 1 ELSE m[3]::INTEGER END;
    fudge := m[4] = 'f';
    lados := CASE WHEN fudge THEN 3 ELSE m[4]::INTEGER END;
    IF n < 1 OR n > 100 OR (NOT fudge AND (lados < 2 OR lados > 1000)) THEN RETURN NULL; END IF;
    dados := dados + n;
    IF dados > 200 THEN RETURN NULL; END IF;
    faces := '[]'::jsonb; soma := 0;
    FOR i IN 1..n LOOP
      IF fudge THEN
        v := floor(random() * 3)::INTEGER - 1;
        faces := faces || to_jsonb(v); soma := soma + v;
        CONTINUE;
      END IF;
      v := floor(random() * lados)::INTEGER + 1;
      faces := faces || to_jsonb(v); soma := soma + v;
      extra := 0;
      WHILE p_explodir AND v = lados AND extra < 20 LOOP
        v := floor(random() * lados)::INTEGER + 1;
        faces := faces || to_jsonb(v); soma := soma + v;
        extra := extra + 1;
      END LOOP;
    END LOOP;
    total := total + sinal * soma;
    grupos := grupos || jsonb_build_array(jsonb_build_object('s', CASE WHEN fudge THEN to_jsonb('F'::TEXT) ELSE to_jsonb(lados) END, 'sg', sinal, 'r', faces));
    ex := ex || CASE WHEN sinal < 0 THEN '-' WHEN ex <> '' THEN '+' ELSE '' END || n || 'd' || CASE WHEN fudge THEN 'F' ELSE lados::TEXT END;
  END LOOP;
  IF primeiro OR lido <> s OR abs(modificador) > 100000 THEN RETURN NULL; END IF;
  IF modificador > 0 THEN ex := ex || CASE WHEN ex <> '' THEN '+' ELSE '' END || modificador;
  ELSIF modificador < 0 THEN ex := ex || '-' || abs(modificador); END IF;
  IF ex = '' THEN ex := '0'; END IF;
  RETURN jsonb_build_object('ex', ex, 'g', grupos, 'mod', modificador, 'tot', total + modificador);
END $$;

-- O usuário u controla o token (está nos donos dele).
CREATE FUNCTION hounds_interno.controla_token(p_token TEXT, u TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tabuleiro_token_dono o WHERE o.token_id = p_token AND o.usuario_id = u)
$$;

-- ---------- gravação ----------
-- O token da 33, com os PF e os marcadores; a camada aceita também fore.
CREATE OR REPLACE FUNCTION hounds_interno.salvar_tabuleiro_token(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
  v_tab TEXT := d ->> 'boardId';
  v_x NUMERIC := hounds_interno.numero(d -> 'x');
  v_y NUMERIC := hounds_interno.numero(d -> 'y');
  v_marcadores JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = v_tab) THEN
    RAISE EXCEPTION 'Esse tabuleiro não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_x IS NULL OR v_y IS NULL OR abs(v_x) > 100000 OR abs(v_y) > 100000 THEN
    RAISE EXCEPTION 'O token precisa de uma posição no tabuleiro.' USING ERRCODE = 'check_violation';
  END IF;
  -- Os marcadores: ids curtos, cada um uma vez, na ordem em que vieram.
  SELECT COALESCE(jsonb_agg(to_jsonb(x.id) ORDER BY x.ordem), '[]'::jsonb) INTO v_marcadores
    FROM hounds_interno.lista_ids(d -> 'markers') x
   WHERE x.id ~ '^[a-z][a-z0-9-]{0,23}$' AND x.ordem < 30;
  INSERT INTO public.tabuleiro_tokens AS t (id, tabuleiro_id, nome, x, y, tamanho, rotacao, cor,
                                            imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                            personagem_id, camada, visao, visao_alcance, visao_escuro, luz_forte, luz_fraca,
                                            pv, pv_max, pf, pf_max, marcadores, mostrar_nome, criado_por, criado_em, atualizado_em)
  VALUES (p_id, v_tab, left(COALESCE(btrim(hounds_interno.texto(d -> 'name')), ''), 80), round(v_x, 2), round(v_y, 2),
          least(20, greatest(0.25, COALESCE(hounds_interno.numero(d -> 'size'), 1))),
          -- Qualquer ângulo vira 0 a 359,9 (−90 é 270; 360 é 0).
          mod(mod(COALESCE(round(hounds_interno.numero(d -> 'rotation'), 1), 0), 360) + 360, 360),
          hounds_interno.cor(d -> 'color', NULL),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          (SELECT p.id FROM public.personagens p WHERE p.id = d ->> 'characterId'),
          CASE WHEN hounds_interno.texto(d -> 'layer') IN ('map', 'tokens', 'gm', 'fore') THEN hounds_interno.texto(d -> 'layer') ELSE 'tokens' END,
          hounds_interno.logico(d -> 'sight', false),
          greatest(0, COALESCE(hounds_interno.numero(d -> 'sightRange'), 0)), greatest(0, COALESCE(hounds_interno.numero(d -> 'darkvision'), 0)),
          greatest(0, COALESCE(hounds_interno.numero(d -> 'lightBright'), 0)), greatest(0, COALESCE(hounds_interno.numero(d -> 'lightDim'), 0)),
          hounds_interno.inteiro(d -> 'hp'),
          CASE WHEN hounds_interno.inteiro(d -> 'hpMax') >= 0 THEN hounds_interno.inteiro(d -> 'hpMax') END,
          hounds_interno.inteiro(d -> 'fp'),
          CASE WHEN hounds_interno.inteiro(d -> 'fpMax') >= 0 THEN hounds_interno.inteiro(d -> 'fpMax') END,
          v_marcadores,
          hounds_interno.logico(d -> 'showName', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (tabuleiro_id, nome, x, y, tamanho, rotacao, cor, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  personagem_id, camada, visao, visao_alcance, visao_escuro, luz_forte, luz_fraca,
                                  pv, pv_max, pf, pf_max, marcadores, mostrar_nome, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.tabuleiro_id, EXCLUDED.nome, EXCLUDED.x, EXCLUDED.y, EXCLUDED.tamanho, EXCLUDED.rotacao, EXCLUDED.cor, EXCLUDED.imagem_ref,
         EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho, EXCLUDED.personagem_id,
         EXCLUDED.camada, EXCLUDED.visao, EXCLUDED.visao_alcance, EXCLUDED.visao_escuro, EXCLUDED.luz_forte, EXCLUDED.luz_fraca,
         EXCLUDED.pv, EXCLUDED.pv_max, EXCLUDED.pf, EXCLUDED.pf_max, EXCLUDED.marcadores, EXCLUDED.mostrar_nome,
         EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('tabuleiro_token_dono', 'token_id', 'usuario_id', p_id, d -> 'ownerIds', 'usuarios');
END $$;

-- O desenho da 33; a camada aceita também fore.
CREATE OR REPLACE FUNCTION hounds_interno.salvar_tabuleiro_desenho(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_tab TEXT := d ->> 'boardId';
  v_tipo TEXT := hounds_interno.texto(d -> 'kind');
  v_texto TEXT := left(btrim(COALESCE(hounds_interno.texto(d -> 'text'), '')), 500);
  v_pontos JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = v_tab) THEN
    RAISE EXCEPTION 'Esse tabuleiro não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_tipo IS NULL OR v_tipo NOT IN ('free', 'line', 'rect', 'ellipse', 'text') THEN
    RAISE EXCEPTION 'Tipo de desenho desconhecido.' USING ERRCODE = 'check_violation';
  END IF;
  IF v_tipo = 'text' AND v_texto = '' THEN
    RAISE EXCEPTION 'Escreva o texto.' USING ERRCODE = 'check_violation';
  END IF;
  -- Só números, em pares (x, y).
  SELECT COALESCE(jsonb_agg(round(hounds_interno.numero(a.e), 1) ORDER BY a.n), '[]'::jsonb) INTO v_pontos
    FROM jsonb_array_elements(hounds_interno.lista(d -> 'points')) WITH ORDINALITY AS a (e, n)
   WHERE a.n <= 8000 AND hounds_interno.numero(a.e) IS NOT NULL;
  IF jsonb_array_length(v_pontos) % 2 = 1 THEN v_pontos := v_pontos - (jsonb_array_length(v_pontos) - 1); END IF;
  IF jsonb_array_length(v_pontos) < (CASE WHEN v_tipo = 'text' THEN 2 ELSE 4 END) THEN
    RAISE EXCEPTION 'O desenho precisa de pontos no tabuleiro.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.tabuleiro_desenhos AS t (id, tabuleiro_id, tipo, camada, pontos, cor_traco, cor_fundo, espessura,
                                              texto, fonte, tamanho_fonte, negrito, italico, criado_por, criado_em, atualizado_em)
  VALUES (p_id, v_tab, v_tipo,
          CASE WHEN hounds_interno.texto(d -> 'layer') IN ('map', 'tokens', 'gm', 'fore') THEN hounds_interno.texto(d -> 'layer') ELSE 'tokens' END,
          v_pontos, hounds_interno.cor(d -> 'stroke', '#000000'), hounds_interno.cor(d -> 'fill', NULL),
          least(400, greatest(0.5, COALESCE(hounds_interno.numero(d -> 'width'), 4))),
          CASE WHEN v_tipo = 'text' THEN v_texto END,
          CASE WHEN hounds_interno.texto(d -> 'font') IN ('sans', 'serif', 'mono', 'hand') THEN hounds_interno.texto(d -> 'font') END,
          CASE WHEN v_tipo = 'text' THEN least(2000, greatest(2, COALESCE(hounds_interno.numero(d -> 'fontSize'), 24))) END,
          hounds_interno.logico(d -> 'bold', false), hounds_interno.logico(d -> 'italic', false),
          hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (tabuleiro_id, tipo, camada, pontos, cor_traco, cor_fundo, espessura, texto, fonte, tamanho_fonte,
                                  negrito, italico, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.tabuleiro_id, EXCLUDED.tipo, EXCLUDED.camada, EXCLUDED.pontos, EXCLUDED.cor_traco, EXCLUDED.cor_fundo,
         EXCLUDED.espessura, EXCLUDED.texto, EXCLUDED.fonte, EXCLUDED.tamanho_fonte, EXCLUDED.negrito, EXCLUDED.italico,
         EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

-- Uma mensagem do chat. O banco rola os dados (a rolagem de um navegador não vale) e guarda o
-- que saiu; gravada de novo, a mensagem fica com as rolagens que já tinha.
CREATE FUNCTION hounds_interno.salvar_chat_mensagem(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_tipo TEXT := COALESCE(hounds_interno.texto(d -> 'kind'), 'say');
  v_texto TEXT := left(btrim(COALESCE(hounds_interno.texto(d -> 'text'), '')), 2000);
  v_r JSONB := CASE WHEN jsonb_typeof(d -> 'roll') = 'object' THEN d -> 'roll' ELSE '{}'::jsonb END;
  v_rolagem JSONB;
  v_inline JSONB;
  v_existe BOOLEAN := false;
  v_secreta BOOLEAN := COALESCE(hounds_interno.logico(d -> 'secret'), false);
  v_para TEXT[];
  e JSONB;
BEGIN
  IF v_tipo NOT IN ('say', 'emote', 'desc', 'roll') THEN
    RAISE EXCEPTION 'Tipo de mensagem desconhecido.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT true, c.rolagem, c.rolagens_texto INTO v_existe, v_rolagem, v_inline FROM public.chat_mensagens c WHERE c.id = p_id;
  v_existe := COALESCE(v_existe, false);
  IF NOT v_existe THEN
    IF v_tipo = 'roll' THEN
      v_rolagem := hounds_interno.rolar_dados(hounds_interno.texto(v_r -> 'expr'), COALESCE(hounds_interno.logico(v_r -> 'explode'), false));
      IF v_rolagem IS NULL THEN
        RAISE EXCEPTION 'Não entendi a rolagem. Use algo como 3d6, 3d6+2, 2d10-1 ou 4dF.' USING ERRCODE = 'check_violation';
      END IF;
      v_rolagem := v_rolagem || jsonb_build_object('nh', hounds_interno.inteiro(v_r -> 'nh'),
                                                   'explode', COALESCE(hounds_interno.logico(v_r -> 'explode'), false),
                                                   'label', left(btrim(COALESCE(hounds_interno.texto(v_r -> 'label'), '')), 80));
    END IF;
    -- As rolagens do texto ([[...]]): até 10, cada uma uma expressão; uma que não se entende fica null.
    v_inline := '[]'::jsonb;
    FOR e IN SELECT a.x FROM jsonb_array_elements(hounds_interno.lista(d -> 'inline')) WITH ORDINALITY AS a (x, n) WHERE a.n <= 10 ORDER BY a.n LOOP
      v_inline := v_inline || jsonb_build_array(COALESCE(hounds_interno.rolar_dados(hounds_interno.texto(e), false), 'null'::jsonb));
    END LOOP;
  END IF;
  IF v_tipo <> 'roll' AND v_texto = '' THEN
    RAISE EXCEPTION 'Escreva a mensagem.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT COALESCE(array_agg(l.id ORDER BY l.ordem), '{}') INTO v_para
    FROM hounds_interno.lista_ids(d -> 'to') l
   WHERE EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = l.id);
  INSERT INTO public.chat_mensagens AS t (id, tipo, texto, como, personagem_id, tabuleiro_id, para, so_mestre, secreta,
                                          rolagem, rolagens_texto, autor_id, criado_em, atualizado_em)
  VALUES (p_id, v_tipo, v_texto, left(btrim(COALESCE(hounds_interno.texto(d -> 'as'), '')), 80),
          (SELECT p.id FROM public.personagens p WHERE p.id = d ->> 'characterId'),
          (SELECT b.id FROM public.tabuleiros b WHERE b.id = d ->> 'boardId'),
          v_para, COALESCE(hounds_interno.logico(d -> 'gm'), false) OR v_secreta, v_secreta,
          CASE WHEN v_tipo = 'roll' THEN v_rolagem END, COALESCE(v_inline, '[]'::jsonb),
          hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (tipo, texto, como, personagem_id, tabuleiro_id, para, so_mestre, secreta, rolagem, rolagens_texto,
                                  autor_id, criado_em, atualizado_em) =
    ROW (EXCLUDED.tipo, EXCLUDED.texto, EXCLUDED.como, EXCLUDED.personagem_id, EXCLUDED.tabuleiro_id, EXCLUDED.para, EXCLUDED.so_mestre,
         EXCLUDED.secreta, EXCLUDED.rolagem, EXCLUDED.rolagens_texto, EXCLUDED.autor_id, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

-- A ordem de turno de um tabuleiro: só itens com id, os tokens só deste tabuleiro, até 200.
CREATE FUNCTION hounds_interno.salvar_tabuleiro_turno(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_itens JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = p_id) THEN
    RAISE EXCEPTION 'Esse tabuleiro não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', left(a.e ->> 'id', 40),
           'tokenId', CASE WHEN jsonb_typeof(a.e -> 'tokenId') = 'string' THEN a.e ->> 'tokenId' END,
           'name', left(btrim(COALESCE(hounds_interno.texto(a.e -> 'name'), '')), 80),
           -- A iniciativa: um número (5,25) ou um texto curto.
           'value', CASE WHEN jsonb_typeof(a.e -> 'value') = 'number' THEN a.e -> 'value'
                         ELSE to_jsonb(left(btrim(COALESCE(hounds_interno.texto(a.e -> 'value'), '')), 12)) END) ORDER BY a.n), '[]'::jsonb)
    INTO v_itens
    FROM jsonb_array_elements(hounds_interno.lista(d -> 'items')) WITH ORDINALITY AS a (e, n)
   WHERE a.n <= 200 AND jsonb_typeof(a.e) = 'object' AND COALESCE(a.e ->> 'id', '') <> ''
     AND (jsonb_typeof(a.e -> 'tokenId') IS DISTINCT FROM 'string'
          OR EXISTS (SELECT 1 FROM public.tabuleiro_tokens k WHERE k.id = a.e ->> 'tokenId' AND k.tabuleiro_id = p_id));
  INSERT INTO public.tabuleiro_turnos AS t (id, itens, vez, rodada, aberto, criado_por, criado_em, atualizado_em)
  VALUES (p_id, v_itens,
          -- A vez só de um item que ficou na lista.
          (SELECT x.e ->> 'id' FROM jsonb_array_elements(v_itens) AS x (e) WHERE x.e ->> 'id' = d ->> 'turn' LIMIT 1),
          least(100000, greatest(1, COALESCE(hounds_interno.inteiro(d -> 'round'), 1))),
          COALESCE(hounds_interno.logico(d -> 'open'), false), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (itens, vez, rodada, aberto, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.itens, EXCLUDED.vez, EXCLUDED.rodada, EXCLUDED.aberto, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

CREATE FUNCTION hounds_interno.salvar_tabuleiro_arte(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
BEGIN
  IF img IS NULL THEN RAISE EXCEPTION 'A arte precisa de uma imagem.' USING ERRCODE = 'check_violation'; END IF;
  INSERT INTO public.tabuleiro_arte AS t (id, nome, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho, pasta,
                                          criado_por, criado_em, atualizado_em)
  VALUES (p_id, left(btrim(COALESCE(hounds_interno.texto(d -> 'name'), '')), 80),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          left(btrim(COALESCE(hounds_interno.texto(d -> 'folder'), '')), 60), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho, pasta, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho,
         EXCLUDED.pasta, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

-- A campanha: os tabuleiros que existem e as contas que existem; o resto sai.
CREATE FUNCTION hounds_interno.salvar_tabuleiro_campanha(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_por JSONB;
  v_ordem JSONB;
BEGIN
  IF p_id <> 'mesa' THEN RAISE EXCEPTION 'A campanha tem um registro só, "mesa".' USING ERRCODE = 'check_violation'; END IF;
  SELECT COALESCE(jsonb_object_agg(x.k, x.v), '{}'::jsonb) INTO v_por
    FROM jsonb_each(CASE WHEN jsonb_typeof(d -> 'perPlayer') = 'object' THEN d -> 'perPlayer' ELSE '{}'::jsonb END) AS x (k, v)
   WHERE jsonb_typeof(x.v) = 'string'
     AND EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = x.k)
     AND EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = x.v #>> '{}');
  SELECT COALESCE(jsonb_agg(to_jsonb(l.id) ORDER BY l.ordem), '[]'::jsonb) INTO v_ordem
    FROM hounds_interno.lista_ids(d -> 'order') l
   WHERE EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = l.id);
  INSERT INTO public.tabuleiro_campanha AS t (id, pagina_jogadores, paginas_jogador, ordem_paginas, criado_por, criado_em, atualizado_em)
  VALUES (p_id, (SELECT b.id FROM public.tabuleiros b WHERE b.id = d ->> 'playersBoardId'), v_por, v_ordem,
          hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (pagina_jogadores, paginas_jogador, ordem_paginas, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.pagina_jogadores, EXCLUDED.paginas_jogador, EXCLUDED.ordem_paginas, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
END $$;

-- O Mestre apaga o chat inteiro, inclusive os sussurros que ele não lê (o site só conhece as
-- mensagens que vê).
CREATE FUNCTION public.hounds_limpar_chat() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT COALESCE(hounds_interno.servico(), false) AND COALESCE(hounds_interno.papel_atual(), '') <> 'mestre' THEN
    RAISE EXCEPTION 'Só o Mestre apaga o chat.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM public.chat_mensagens WHERE true;
END $$;

-- ---------- coleção do site → tabela (migration 33, com as coleções novas) ----------
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
      WHEN 'items' THEN 'itens' WHEN 'improvements' THEN 'melhoramentos' WHEN 'armorLocs' THEN 'armadura_localizacoes'
      WHEN 'boards' THEN 'tabuleiros' WHEN 'boardTokens' THEN 'tabuleiro_tokens' WHEN 'boardDrawings' THEN 'tabuleiro_desenhos'
      WHEN 'boardTurns' THEN 'tabuleiro_turnos' WHEN 'boardArt' THEN 'tabuleiro_arte' WHEN 'boardCampaign' THEN 'tabuleiro_campanha'
      WHEN 'chatMessages' THEN 'chat_mensagens'
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- Grava o item da coleção p_col (migration 33, com as coleções novas).
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

-- A mesma conferência da migration 33, com o chat, a ordem de turno, a arte, a campanha e os
-- campos novos do token.
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

  IF t IN ('magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras', 'itens',
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
-- Leitura só para contas ligadas a um usuário (o chat tem a regra dele, abaixo); escrita só pelas
-- funções hounds_*.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_mensagens', 'tabuleiro_turnos', 'tabuleiro_arte', 'tabuleiro_campanha'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF t <> 'chat_mensagens' THEN
      EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    END IF;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
  REVOKE ALL ON public.chat_mensagens_doc, public.tabuleiro_turnos_doc, public.tabuleiro_arte_doc, public.tabuleiro_campanha_doc FROM anon, authenticated;
  GRANT SELECT ON public.chat_mensagens_doc, public.tabuleiro_turnos_doc, public.tabuleiro_arte_doc, public.tabuleiro_campanha_doc TO authenticated;
END $$;

-- Quem lê cada mensagem: quem escreveu (menos numa secreta); o Mestre, nas só para o Mestre e
-- nas secretas; todos, nas públicas; os destinatários, nos sussurros.
CREATE POLICY "Leitura do chat" ON public.chat_mensagens FOR SELECT TO authenticated USING (
  (SELECT hounds_interno.usuario_atual()) IS NOT NULL AND (
    (autor_id = (SELECT hounds_interno.usuario_atual()) AND NOT secreta)
    OR ((so_mestre OR secreta) AND (SELECT hounds_interno.papel_atual()) = 'mestre')
    OR (NOT so_mestre AND NOT secreta AND (cardinality(para) = 0 OR (SELECT hounds_interno.usuario_atual()) = ANY (para)))
  )
);

-- As funções novas, como as outras internas: ninguém além do dono (as públicas rodam como ele).
REVOKE ALL ON FUNCTION hounds_interno.rolar_dados(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.controla_token(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_chat_mensagem(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_turno(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_arte(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_campanha(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_token(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_desenho(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.autorizar(TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hounds_limpar_chat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hounds_limpar_chat() TO authenticated, service_role;

-- ---------- Realtime: avisos de alteração das tabelas novas ----------
-- O chat, a ordem de turno e a fita dos jogadores chegam aos outros navegadores na hora (veja
-- LIVE em js/store/supabase.js). Pode rodar de novo sem efeito.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['chat_mensagens', 'tabuleiro_turnos', 'tabuleiro_campanha'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
