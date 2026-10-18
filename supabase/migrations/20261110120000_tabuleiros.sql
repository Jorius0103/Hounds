-- ============================================================
-- 33 · TABULEIROS
-- O mapa de batalha da aba Tabuleiros (js/tabs/tab-tabuleiros.js):
-- a imagem do mapa com uma grade (hexágonos, quadrados ou nenhuma),
-- as paredes e portas que barram a visão e o movimento, as áreas que
-- o Mestre revelou na névoa e as áreas que os tokens dos jogadores já
-- viram. Os tokens e os desenhos (ferramentas Desenhar e Texto) ficam
-- em tabelas próprias: cada movimento grava só o token que andou, e
-- dois jogadores mexendo ao mesmo tempo não desfazem um ao outro.
-- Permissões (em autorizar):
--   Mestre   tudo;
--   Jogador  não cria nem exclui tabuleiros e tokens; num tabuleiro
--            que vê, só soma as áreas exploradas; num token que
--            controla (ownerIds), só muda a posição, a direção e os PV;
--            desenha na camada dos tokens e muda ou apaga só os
--            próprios desenhos.
-- Realtime: as três tabelas entram na publicação supabase_realtime,
-- como a mesa_estado (a migration 30 deixava só ela): o tabuleiro
-- aberto acompanha os outros navegadores sem recarregar a página.
-- Não rode a 30 de novo depois desta: ela tira estas tabelas da
-- publicação (rode só o último bloco desta para pôr de volta).
-- As funções tabela, gravar e autorizar são as da migration 26 com as
-- coleções novas; o resto delas não muda.
-- Rode antes de publicar a versão do site com os tabuleiros: sem as
-- tabelas, o site não consegue lê-los.
-- Pode rodar de novo: num banco em que uma versão anterior desta rodou
-- (sem a direção dos tokens e sem os desenhos), ela põe só o que falta
-- (tabelas, colunas, índices, triggers e permissões) e troca as views e
-- as funções pelas de agora; o que já está gravado fica como está.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tabuleiros (
  id               TEXT PRIMARY KEY CHECK (id <> ''),
  nome             TEXT NOT NULL CHECK (btrim(nome) <> ''),
  imagem_ref       TEXT,
  imagem_largura   INTEGER,
  imagem_altura    INTEGER,
  imagem_tipo      TEXT,
  imagem_tamanho   BIGINT,
  -- O tamanho do tabuleiro em pixels: o da imagem, ou o escolhido para um fundo liso.
  largura          INTEGER NOT NULL DEFAULT 2100 CHECK (largura BETWEEN 100 AND 20000),
  altura           INTEGER NOT NULL DEFAULT 1400 CHECK (altura BETWEEN 100 AND 20000),
  cor_fundo        TEXT NOT NULL DEFAULT '#1e293b',
  -- hex: hexágonos em fileiras; hexc: hexágonos em colunas; square: quadrados; none: sem grade.
  grade_tipo       TEXT NOT NULL DEFAULT 'hex' CHECK (grade_tipo IN ('hex', 'hexc', 'square', 'none')),
  -- Distância entre os centros de duas células vizinhas, em pixels da imagem.
  grade_tamanho    NUMERIC NOT NULL DEFAULT 70 CHECK (grade_tamanho BETWEEN 8 AND 1000),
  -- Deslocamento da grade sobre a imagem, para alinhar com a grade desenhada nela.
  grade_x          NUMERIC NOT NULL DEFAULT 0,
  grade_y          NUMERIC NOT NULL DEFAULT 0,
  grade_cor        TEXT NOT NULL DEFAULT '#000000',
  grade_opacidade  NUMERIC NOT NULL DEFAULT 0.35 CHECK (grade_opacidade BETWEEN 0 AND 1),
  -- Quanto vale uma célula: 1 jd (o hexágono de GURPS), 1,5 m...
  escala           NUMERIC NOT NULL DEFAULT 1 CHECK (escala > 0),
  unidade          TEXT NOT NULL DEFAULT 'jd',
  -- Luz dinâmica: os jogadores veem só o que os tokens deles enxergam. Luz do dia: o que está à
  -- vista está iluminado. Modo explorador: o que já foi visto fica no mapa, escurecido.
  luz_dinamica     BOOLEAN NOT NULL DEFAULT false,
  luz_global       BOOLEAN NOT NULL DEFAULT true,
  explorar         BOOLEAN NOT NULL DEFAULT true,
  -- Névoa manual: os jogadores veem só as áreas que o Mestre revelou. nevoa_areas, na ordem:
  -- cada uma revela ou esconde um retângulo { x, y, w, h, show }.
  nevoa            BOOLEAN NOT NULL DEFAULT false,
  nevoa_areas      JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(nevoa_areas) = 'array'),
  -- Paredes e portas: segmentos { x1, y1, x2, y2, door, open }. Uma porta aberta não barra nada.
  paredes          JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(paredes) = 'array'),
  -- As áreas já vistas pelos tokens dos jogadores: um bit por meia célula, em base64 (veja
  -- BoardGeo em js/tabuleiro-geo.js). explorado_versao muda quando o Mestre apaga o explorado ou
  -- muda a grade: a gravação de um jogador com outra versão não volta a pôr o que foi apagado.
  explorado        TEXT NOT NULL DEFAULT '' CHECK (explorado ~ '^[A-Za-z0-9+/=]*$' AND length(explorado) <= 200000),
  explorado_versao INTEGER NOT NULL DEFAULT 0,
  visivel          BOOLEAN NOT NULL DEFAULT true,
  criado_por       TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contas que veem um tabuleiro oculto (sharedWith), como nos mapas.
CREATE TABLE IF NOT EXISTS public.tabuleiro_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.tabuleiros (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.tabuleiro_tokens (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  tabuleiro_id   TEXT NOT NULL REFERENCES public.tabuleiros (id) ON DELETE CASCADE,
  nome           TEXT NOT NULL DEFAULT '',
  -- O centro do token, em pixels da imagem do tabuleiro.
  x              NUMERIC NOT NULL,
  y              NUMERIC NOT NULL,
  -- Em células: 1 ocupa uma célula; 2, uma criatura grande.
  tamanho        NUMERIC NOT NULL DEFAULT 1 CHECK (tamanho BETWEEN 0.25 AND 20),
  -- Para onde o token está virado, em graus: 0 é para cima (norte), 90 para a direita.
  rotacao        NUMERIC NOT NULL DEFAULT 0 CHECK (rotacao >= 0 AND rotacao < 360),
  cor            TEXT,
  imagem_ref     TEXT,
  imagem_largura INTEGER,
  imagem_altura  INTEGER,
  imagem_tipo    TEXT,
  imagem_tamanho BIGINT,
  -- O personagem do Mundo que o token representa: a imagem dele vale quando o token não tem uma.
  personagem_id  TEXT REFERENCES public.personagens (id) ON DELETE SET NULL,
  -- map: parte do mapa, abaixo da grade; tokens: a camada de sempre; gm: só o Mestre vê.
  camada         TEXT NOT NULL DEFAULT 'tokens' CHECK (camada IN ('map', 'tokens', 'gm')),
  -- Visão (só conta na luz dinâmica). Alcances na unidade do tabuleiro; 0 é sem limite.
  visao          BOOLEAN NOT NULL DEFAULT false,
  visao_alcance  NUMERIC NOT NULL DEFAULT 0 CHECK (visao_alcance >= 0),
  -- Até onde enxerga sem luz.
  visao_escuro   NUMERIC NOT NULL DEFAULT 0 CHECK (visao_escuro >= 0),
  -- Luz que o token emite (uma tocha: forte 2, fraca 4), vista por todos os tokens.
  luz_forte      NUMERIC NOT NULL DEFAULT 0 CHECK (luz_forte >= 0),
  luz_fraca      NUMERIC NOT NULL DEFAULT 0 CHECK (luz_fraca >= 0),
  pv             INTEGER,
  pv_max         INTEGER CHECK (pv_max IS NULL OR pv_max >= 0),
  -- false: o nome aparece só para o Mestre e para quem controla o token.
  mostrar_nome   BOOLEAN NOT NULL DEFAULT true,
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- A versão anterior desta migration não tinha a direção: num banco com ela, a coluna entra aqui.
ALTER TABLE public.tabuleiro_tokens ADD COLUMN IF NOT EXISTS rotacao NUMERIC NOT NULL DEFAULT 0 CHECK (rotacao >= 0 AND rotacao < 360);
CREATE INDEX IF NOT EXISTS tabuleiro_tokens_tabuleiro_id_idx ON public.tabuleiro_tokens (tabuleiro_id);
CREATE INDEX IF NOT EXISTS tabuleiro_tokens_personagem_id_idx ON public.tabuleiro_tokens (personagem_id);

-- Contas que controlam o token (ownerIds): movem o token e, na luz dinâmica, veem pelos olhos dele.
CREATE TABLE IF NOT EXISTS public.tabuleiro_token_dono (
  token_id   TEXT NOT NULL REFERENCES public.tabuleiro_tokens (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (token_id, usuario_id)
);

-- Desenhos e textos sobre o tabuleiro (ferramentas Desenhar e Texto), um registro por desenho.
CREATE TABLE IF NOT EXISTS public.tabuleiro_desenhos (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  tabuleiro_id  TEXT NOT NULL REFERENCES public.tabuleiros (id) ON DELETE CASCADE,
  -- free: à mão livre; line: linha reta; rect: retângulo; ellipse: elipse; text: texto.
  tipo          TEXT NOT NULL CHECK (tipo IN ('free', 'line', 'rect', 'ellipse', 'text')),
  camada        TEXT NOT NULL DEFAULT 'tokens' CHECK (camada IN ('map', 'tokens', 'gm')),
  -- Os pontos em pixels da imagem, [x0, y0, x1, y1, ...]: o traço (free), as pontas (line), os cantos
  -- opostos (rect, ellipse) ou onde o texto começa (text).
  pontos        JSONB NOT NULL CHECK (jsonb_typeof(pontos) = 'array' AND jsonb_array_length(pontos) BETWEEN 2 AND 8000),
  cor_traco     TEXT NOT NULL DEFAULT '#000000',
  -- Preenchimento (ou o fundo do texto); nulo: transparente.
  cor_fundo     TEXT,
  espessura     NUMERIC NOT NULL DEFAULT 4 CHECK (espessura BETWEEN 0.5 AND 400),
  texto         TEXT CHECK (texto IS NULL OR length(texto) <= 500),
  -- sans, serif, mono ou hand (as fontes que js/tabs/tab-tabuleiros.js conhece).
  fonte         TEXT,
  tamanho_fonte NUMERIC CHECK (tamanho_fonte IS NULL OR tamanho_fonte BETWEEN 2 AND 2000),
  negrito       BOOLEAN NOT NULL DEFAULT false,
  italico       BOOLEAN NOT NULL DEFAULT false,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tabuleiro_desenhos_tabuleiro_id_idx ON public.tabuleiro_desenhos (tabuleiro_id);

-- ---------- triggers (os mesmos das outras tabelas, migration 2) ----------
DROP TRIGGER IF EXISTS tabuleiros_gravado_em ON public.tabuleiros;
CREATE TRIGGER tabuleiros_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiros
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
DROP TRIGGER IF EXISTS tabuleiro_tokens_gravado_em ON public.tabuleiro_tokens;
CREATE TRIGGER tabuleiro_tokens_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiro_tokens
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
DROP TRIGGER IF EXISTS tabuleiro_desenhos_gravado_em ON public.tabuleiro_desenhos;
CREATE TRIGGER tabuleiro_desenhos_gravado_em BEFORE INSERT OR UPDATE ON public.tabuleiro_desenhos
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao();
CREATE INDEX IF NOT EXISTS tabuleiro_compartilhamento_usuario_id_idx ON public.tabuleiro_compartilhamento (usuario_id);
DROP TRIGGER IF EXISTS tabuleiro_compartilhamento_dono ON public.tabuleiro_compartilhamento;
CREATE TRIGGER tabuleiro_compartilhamento_dono AFTER INSERT OR UPDATE OR DELETE ON public.tabuleiro_compartilhamento
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('tabuleiros', 'item_id');
CREATE INDEX IF NOT EXISTS tabuleiro_token_dono_usuario_id_idx ON public.tabuleiro_token_dono (usuario_id);
DROP TRIGGER IF EXISTS tabuleiro_token_dono_dono ON public.tabuleiro_token_dono;
CREATE TRIGGER tabuleiro_token_dono_dono AFTER INSERT OR UPDATE OR DELETE ON public.tabuleiro_token_dono
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('tabuleiro_tokens', 'token_id');

-- ---------- views de leitura ----------
CREATE OR REPLACE VIEW public.tabuleiros_doc WITH (security_invoker = true) AS
SELECT b.id, b.gravado_em AS updated_at,
  jsonb_build_object(
    'name', b.nome,
    'image', hounds_interno.imagem(b.imagem_ref, b.imagem_largura, b.imagem_altura, b.imagem_tipo, b.imagem_tamanho),
    'width', b.largura, 'height', b.altura, 'bg', b.cor_fundo,
    'gridType', b.grade_tipo, 'gridSize', b.grade_tamanho, 'gridX', b.grade_x, 'gridY', b.grade_y,
    'gridColor', b.grade_cor, 'gridOpacity', b.grade_opacidade, 'scale', b.escala, 'unit', b.unidade,
    'dynamicLight', b.luz_dinamica, 'globalLight', b.luz_global, 'explorer', b.explorar,
    'fog', b.nevoa, 'fogAreas', b.nevoa_areas, 'walls', b.paredes,
    'explored', b.explorado, 'exploredEpoch', b.explorado_versao,
    'visible', b.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.tabuleiro_compartilhamento c WHERE c.item_id = b.id), '[]'::jsonb),
    'createdBy', b.criado_por,
    'createdAt', hounds_interno.ms(b.criado_em),
    'updatedAt', hounds_interno.ms(b.atualizado_em)) AS data
FROM public.tabuleiros b;

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
    'hp', k.pv, 'hpMax', k.pv_max, 'showName', k.mostrar_nome,
    'createdBy', k.criado_por,
    'createdAt', hounds_interno.ms(k.criado_em),
    'updatedAt', hounds_interno.ms(k.atualizado_em)) AS data
FROM public.tabuleiro_tokens k;

CREATE OR REPLACE VIEW public.tabuleiro_desenhos_doc WITH (security_invoker = true) AS
SELECT d.id, d.gravado_em AS updated_at,
  jsonb_build_object(
    'boardId', d.tabuleiro_id, 'kind', d.tipo, 'layer', d.camada, 'points', d.pontos,
    'stroke', d.cor_traco, 'fill', d.cor_fundo, 'width', d.espessura,
    'text', d.texto, 'font', d.fonte, 'fontSize', d.tamanho_fonte, 'bold', d.negrito, 'italic', d.italico,
    'createdBy', d.criado_por,
    'createdAt', hounds_interno.ms(d.criado_em),
    'updatedAt', hounds_interno.ms(d.atualizado_em)) AS data
FROM public.tabuleiro_desenhos d;

-- ---------- gravação ----------
-- Uma cor #rrggbb, ou padrao.
CREATE OR REPLACE FUNCTION hounds_interno.cor(p JSONB, padrao TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN hounds_interno.texto(p) ~ '^#[0-9A-Fa-f]{6}$' THEN lower(hounds_interno.texto(p)) ELSE padrao END
$$;

CREATE OR REPLACE FUNCTION hounds_interno.salvar_tabuleiro(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
  v_paredes JSONB;
  v_areas JSONB;
  v_explorado TEXT := COALESCE(hounds_interno.texto(d -> 'explored'), '');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do tabuleiro.');
  -- Só os segmentos com as quatro coordenadas; porta e aberta são opcionais.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'x1', round(hounds_interno.numero(e -> 'x1'), 1), 'y1', round(hounds_interno.numero(e -> 'y1'), 1),
           'x2', round(hounds_interno.numero(e -> 'x2'), 1), 'y2', round(hounds_interno.numero(e -> 'y2'), 1),
           'door', COALESCE(hounds_interno.logico(e -> 'door'), false),
           'open', COALESCE(hounds_interno.logico(e -> 'door'), false) AND COALESCE(hounds_interno.logico(e -> 'open'), false)) ORDER BY w.n), '[]'::jsonb)
    INTO v_paredes
    FROM jsonb_array_elements(hounds_interno.lista(d -> 'walls')) WITH ORDINALITY AS w (e, n)
   WHERE hounds_interno.numero(e -> 'x1') IS NOT NULL AND hounds_interno.numero(e -> 'y1') IS NOT NULL
     AND hounds_interno.numero(e -> 'x2') IS NOT NULL AND hounds_interno.numero(e -> 'y2') IS NOT NULL;
  -- Só os retângulos com largura e altura.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'x', round(hounds_interno.numero(e -> 'x'), 1), 'y', round(hounds_interno.numero(e -> 'y'), 1),
           'w', round(hounds_interno.numero(e -> 'w'), 1), 'h', round(hounds_interno.numero(e -> 'h'), 1),
           'show', COALESCE(hounds_interno.logico(e -> 'show'), true)) ORDER BY a.n), '[]'::jsonb)
    INTO v_areas
    FROM jsonb_array_elements(hounds_interno.lista(d -> 'fogAreas')) WITH ORDINALITY AS a (e, n)
   WHERE hounds_interno.numero(e -> 'x') IS NOT NULL AND hounds_interno.numero(e -> 'y') IS NOT NULL
     AND hounds_interno.numero(e -> 'w') > 0 AND hounds_interno.numero(e -> 'h') > 0;
  IF v_explorado !~ '^[A-Za-z0-9+/=]*$' OR length(v_explorado) > 200000 THEN v_explorado := ''; END IF;
  INSERT INTO public.tabuleiros AS t (id, nome, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                      largura, altura, cor_fundo, grade_tipo, grade_tamanho, grade_x, grade_y, grade_cor, grade_opacidade,
                                      escala, unidade, luz_dinamica, luz_global, explorar, nevoa, nevoa_areas, paredes,
                                      explorado, explorado_versao, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, btrim(hounds_interno.texto(d -> 'name')),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          least(20000, greatest(100, COALESCE(hounds_interno.inteiro(d -> 'width'), hounds_interno.inteiro(img -> 'w'), 2100))),
          least(20000, greatest(100, COALESCE(hounds_interno.inteiro(d -> 'height'), hounds_interno.inteiro(img -> 'h'), 1400))),
          hounds_interno.cor(d -> 'bg', '#1e293b'),
          CASE WHEN hounds_interno.texto(d -> 'gridType') IN ('hex', 'hexc', 'square', 'none') THEN hounds_interno.texto(d -> 'gridType') ELSE 'hex' END,
          least(1000, greatest(8, COALESCE(hounds_interno.numero(d -> 'gridSize'), 70))),
          COALESCE(round(hounds_interno.numero(d -> 'gridX'), 2), 0), COALESCE(round(hounds_interno.numero(d -> 'gridY'), 2), 0),
          hounds_interno.cor(d -> 'gridColor', '#000000'),
          least(1, greatest(0, COALESCE(hounds_interno.numero(d -> 'gridOpacity'), 0.35))),
          CASE WHEN hounds_interno.numero(d -> 'scale') > 0 THEN hounds_interno.numero(d -> 'scale') ELSE 1 END,
          left(COALESCE(NULLIF(btrim(hounds_interno.texto(d -> 'unit')), ''), 'jd'), 12),
          hounds_interno.logico(d -> 'dynamicLight', false), hounds_interno.logico(d -> 'globalLight', true),
          hounds_interno.logico(d -> 'explorer', true), hounds_interno.logico(d -> 'fog', false),
          v_areas, v_paredes, v_explorado, COALESCE(hounds_interno.inteiro(d -> 'exploredEpoch'), 0),
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  largura, altura, cor_fundo, grade_tipo, grade_tamanho, grade_x, grade_y, grade_cor, grade_opacidade,
                                  escala, unidade, luz_dinamica, luz_global, explorar, nevoa, nevoa_areas, paredes,
                                  explorado, explorado_versao, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.imagem_ref, EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho,
         EXCLUDED.largura, EXCLUDED.altura, EXCLUDED.cor_fundo, EXCLUDED.grade_tipo, EXCLUDED.grade_tamanho, EXCLUDED.grade_x, EXCLUDED.grade_y,
         EXCLUDED.grade_cor, EXCLUDED.grade_opacidade, EXCLUDED.escala, EXCLUDED.unidade, EXCLUDED.luz_dinamica, EXCLUDED.luz_global,
         EXCLUDED.explorar, EXCLUDED.nevoa, EXCLUDED.nevoa_areas, EXCLUDED.paredes, EXCLUDED.explorado, EXCLUDED.explorado_versao,
         EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('tabuleiro_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;

CREATE OR REPLACE FUNCTION hounds_interno.salvar_tabuleiro_token(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(d -> 'image');
  v_tab TEXT := d ->> 'boardId';
  v_x NUMERIC := hounds_interno.numero(d -> 'x');
  v_y NUMERIC := hounds_interno.numero(d -> 'y');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tabuleiros b WHERE b.id = v_tab) THEN
    RAISE EXCEPTION 'Esse tabuleiro não existe mais.' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF v_x IS NULL OR v_y IS NULL OR abs(v_x) > 100000 OR abs(v_y) > 100000 THEN
    RAISE EXCEPTION 'O token precisa de uma posição no tabuleiro.' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.tabuleiro_tokens AS t (id, tabuleiro_id, nome, x, y, tamanho, rotacao, cor,
                                            imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                            personagem_id, camada, visao, visao_alcance, visao_escuro, luz_forte, luz_fraca,
                                            pv, pv_max, mostrar_nome, criado_por, criado_em, atualizado_em)
  VALUES (p_id, v_tab, left(COALESCE(btrim(hounds_interno.texto(d -> 'name')), ''), 80), round(v_x, 2), round(v_y, 2),
          least(20, greatest(0.25, COALESCE(hounds_interno.numero(d -> 'size'), 1))),
          -- Qualquer ângulo vira 0 a 359,9 (−90 é 270; 360 é 0).
          mod(mod(COALESCE(round(hounds_interno.numero(d -> 'rotation'), 1), 0), 360) + 360, 360),
          hounds_interno.cor(d -> 'color', NULL),
          img ->> 'ref', hounds_interno.inteiro(img -> 'w'), hounds_interno.inteiro(img -> 'h'), img ->> 'type', hounds_interno.numero(img -> 'size')::bigint,
          (SELECT p.id FROM public.personagens p WHERE p.id = d ->> 'characterId'),
          CASE WHEN hounds_interno.texto(d -> 'layer') IN ('map', 'tokens', 'gm') THEN hounds_interno.texto(d -> 'layer') ELSE 'tokens' END,
          hounds_interno.logico(d -> 'sight', false),
          greatest(0, COALESCE(hounds_interno.numero(d -> 'sightRange'), 0)), greatest(0, COALESCE(hounds_interno.numero(d -> 'darkvision'), 0)),
          greatest(0, COALESCE(hounds_interno.numero(d -> 'lightBright'), 0)), greatest(0, COALESCE(hounds_interno.numero(d -> 'lightDim'), 0)),
          hounds_interno.inteiro(d -> 'hp'),
          CASE WHEN hounds_interno.inteiro(d -> 'hpMax') >= 0 THEN hounds_interno.inteiro(d -> 'hpMax') END,
          hounds_interno.logico(d -> 'showName', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (tabuleiro_id, nome, x, y, tamanho, rotacao, cor, imagem_ref, imagem_largura, imagem_altura, imagem_tipo, imagem_tamanho,
                                  personagem_id, camada, visao, visao_alcance, visao_escuro, luz_forte, luz_fraca,
                                  pv, pv_max, mostrar_nome, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.tabuleiro_id, EXCLUDED.nome, EXCLUDED.x, EXCLUDED.y, EXCLUDED.tamanho, EXCLUDED.rotacao, EXCLUDED.cor, EXCLUDED.imagem_ref,
         EXCLUDED.imagem_largura, EXCLUDED.imagem_altura, EXCLUDED.imagem_tipo, EXCLUDED.imagem_tamanho, EXCLUDED.personagem_id,
         EXCLUDED.camada, EXCLUDED.visao, EXCLUDED.visao_alcance, EXCLUDED.visao_escuro, EXCLUDED.luz_forte, EXCLUDED.luz_fraca,
         EXCLUDED.pv, EXCLUDED.pv_max, EXCLUDED.mostrar_nome, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  PERFORM hounds_interno.gravar_vinculos('tabuleiro_token_dono', 'token_id', 'usuario_id', p_id, d -> 'ownerIds', 'usuarios');
END $$;

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
          CASE WHEN hounds_interno.texto(d -> 'layer') IN ('map', 'tokens', 'gm') THEN hounds_interno.texto(d -> 'layer') ELSE 'tokens' END,
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

-- ---------- coleção do site → tabela (migration 26, com boards, boardTokens e boardDrawings) ----------
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
      WHEN 'mesa' THEN 'mesa_estado' WHEN 'mesa_chunks' THEN 'mesa_partes'
    END
  END
$$;

-- Grava o item da coleção p_col (migration 26, com os tabuleiros e os tokens).
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
    WHEN 'mesa_estado' THEN PERFORM hounds_interno.salvar_mesa_estado(p_id, p_doc);
    WHEN 'mesa_partes' THEN PERFORM hounds_interno.salvar_mesa_parte(p_id, p_doc);
    ELSE RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value';
  END CASE;
END $$;

-- A mesma conferência da migration 26, com as regras dos tabuleiros e dos tokens para o Jogador.
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

  IF t IN ('magias', 'vantagens', 'desvantagens', 'pericias', 'tecnicas', 'estilos', 'armas', 'armaduras', 'itens',
           'melhoramentos', 'armadura_localizacoes') AND NOT mestre THEN
    RAISE EXCEPTION 'Só o Mestre pode alterar isto.' USING ERRCODE = 'insufficient_privilege';
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
  -- Token, pelo Jogador: só um token que ele controla, e só a posição, a direção e os PV.
  IF t = 'tabuleiro_tokens' AND NOT mestre THEN
    atual := hounds_interno.ler(p_col, p_id) -> 'data';
    IF atual IS NULL OR p_remover OR NOT COALESCE(atual -> 'ownerIds', '[]'::jsonb) ? u THEN
      RAISE EXCEPTION 'Só o Mestre e quem controla o token podem mexer nele.' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN atual || jsonb_strip_nulls(jsonb_build_object('x', p_doc -> 'x', 'y', p_doc -> 'y', 'rotation', p_doc -> 'rotation',
                                                         'hp', p_doc -> 'hp', 'updatedAt', p_doc -> 'updatedAt'));
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
  FOREACH t IN ARRAY ARRAY['tabuleiros', 'tabuleiro_compartilhamento', 'tabuleiro_tokens', 'tabuleiro_token_dono', 'tabuleiro_desenhos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Leitura com login" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
  REVOKE ALL ON public.tabuleiros_doc, public.tabuleiro_tokens_doc, public.tabuleiro_desenhos_doc FROM anon, authenticated;
  GRANT SELECT ON public.tabuleiros_doc, public.tabuleiro_tokens_doc, public.tabuleiro_desenhos_doc TO authenticated;
END $$;

-- As funções novas, como as outras internas: ninguém além do dono (as públicas rodam como ele).
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_token(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.salvar_tabuleiro_desenho(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION hounds_interno.autorizar(TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- ---------- Realtime: avisos de alteração das duas tabelas ----------
-- O tabuleiro aberto recebe o aviso de cada gravação (um token que andou, uma porta aberta) e
-- baixa só aquela linha (veja LIVE em js/store/supabase.js). Pode rodar de novo sem efeito.
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['tabuleiros', 'tabuleiro_tokens', 'tabuleiro_desenhos'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
