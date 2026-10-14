-- ============================================================
-- 2/6 · TABELAS RELACIONAIS
-- Uma tabela por entidade do Hounds, com colunas tipadas, chaves
-- estrangeiras e tabelas de vínculo no lugar das listas de ids que
-- ficavam dentro do JSON de hounds_docs.
--
-- Os ids continuam TEXT: são os mesmos ids do JSON (gerados pelo
-- site, como "mv58icckbqo12bsi", "user-leandro" ou "spell_..."),
-- preservados na migração e usados pela Mesa e pelos links do site.
--
-- Colunas comuns:
--   criado_em, atualizado_em  createdAt e updatedAt do site (o que a
--                             página mostra como "atualizado em").
--   gravado_em                quando a linha mudou no banco. O site
--                             usa para saber o que baixar de novo; um
--                             vínculo alterado também atualiza o
--                             gravado_em do item a que ele pertence.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS hounds_interno;
COMMENT ON SCHEMA hounds_interno IS 'Funções internas do Hounds. Não é exposto pela API do Supabase.';

-- ---------- usuários ----------
CREATE TABLE public.usuarios (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT NOT NULL CHECK (btrim(nome) <> ''),
  papel         TEXT NOT NULL DEFAULT 'jogador' CHECK (papel IN ('mestre', 'jogador', 'visualizador')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.usuarios IS 'Contas do hub (coleção users). papel visualizador = Espectador.';

-- ---------- mapas (hierarquia sem limite de níveis) ----------
CREATE TABLE public.mapas (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  nome           TEXT NOT NULL CHECK (btrim(nome) <> ''),
  mapa_pai_id    TEXT REFERENCES public.mapas (id) ON DELETE SET NULL,
  -- A imagem fica no Supabase Storage (bucket hounds-images); aqui só o caminho e os dados dela.
  imagem_ref     TEXT CHECK (imagem_ref <> ''),
  imagem_largura INTEGER CHECK (imagem_largura > 0),
  imagem_altura  INTEGER CHECK (imagem_altura > 0),
  imagem_tipo    TEXT,
  imagem_tamanho BIGINT CHECK (imagem_tamanho >= 0),
  visivel        BOOLEAN NOT NULL DEFAULT true,
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mapa_pai_id <> id)
);
CREATE INDEX mapas_mapa_pai_id_idx ON public.mapas (mapa_pai_id);
COMMENT ON COLUMN public.mapas.imagem_ref IS 'Caminho do arquivo no bucket hounds-images.';

-- ---------- locais (hierarquia: uma taverna dentro de uma cidade) ----------
CREATE TABLE public.locais (
  id              TEXT PRIMARY KEY CHECK (id <> ''),
  nome            TEXT NOT NULL CHECK (btrim(nome) <> ''),
  descricao       TEXT NOT NULL DEFAULT '',
  mapa_id         TEXT REFERENCES public.mapas (id) ON DELETE SET NULL,
  local_pai_id    TEXT REFERENCES public.locais (id) ON DELETE SET NULL,
  imagem_ref      TEXT CHECK (imagem_ref <> ''),
  imagem_largura  INTEGER CHECK (imagem_largura > 0),
  imagem_altura   INTEGER CHECK (imagem_altura > 0),
  imagem_tipo     TEXT,
  imagem_tamanho  BIGINT CHECK (imagem_tamanho >= 0),
  imagem2_ref     TEXT CHECK (imagem2_ref <> ''),
  imagem2_largura INTEGER CHECK (imagem2_largura > 0),
  imagem2_altura  INTEGER CHECK (imagem2_altura > 0),
  imagem2_tipo    TEXT,
  imagem2_tamanho BIGINT CHECK (imagem2_tamanho >= 0),
  visivel         BOOLEAN NOT NULL DEFAULT true,
  criado_por      TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (local_pai_id <> id)
);
CREATE INDEX locais_mapa_id_idx ON public.locais (mapa_id);
CREATE INDEX locais_local_pai_id_idx ON public.locais (local_pai_id);

-- ---------- fichas (GURPS) ----------
-- Atributos e defesas em colunas; perícias, culturas, vantagens, estilos, itens de combate e
-- armas em tabelas próprias (ficha_*), na ordem em que a ficha mostra.
CREATE TABLE public.fichas (
  id               TEXT PRIMARY KEY CHECK (id <> ''),
  nome             TEXT NOT NULL CHECK (btrim(nome) <> ''),
  descricao        TEXT NOT NULL DEFAULT '',
  -- attrs: st, dx, iq e ht são valores; os outros são ajustes sobre a base (veja types/dados.d.ts).
  st               SMALLINT NOT NULL DEFAULT 10,
  dx               SMALLINT NOT NULL DEFAULT 10,
  iq               SMALLINT NOT NULL DEFAULT 10,
  ht               SMALLINT NOT NULL DEFAULT 10,
  per              SMALLINT NOT NULL DEFAULT 0,
  vontade          SMALLINT NOT NULL DEFAULT 0,
  per_base         SMALLINT NOT NULL DEFAULT 10,
  vontade_base     SMALLINT NOT NULL DEFAULT 10,
  pv               SMALLINT NOT NULL DEFAULT 0,
  pf               SMALLINT NOT NULL DEFAULT 0,
  velocidade       NUMERIC(6, 2) NOT NULL DEFAULT 0,
  deslocamento     SMALLINT NOT NULL DEFAULT 0,
  carga            SMALLINT NOT NULL DEFAULT 0 CHECK (carga BETWEEN 0 AND 4),
  metal            NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (metal >= 0),
  penalidade_magia SMALLINT NOT NULL DEFAULT 0,
  -- combat.generalPos: posição do grupo "Gerais" entre os estilos.
  posicao_gerais   SMALLINT NOT NULL DEFAULT 0 CHECK (posicao_gerais >= 0),
  -- combat.def
  aparar           TEXT NOT NULL DEFAULT '',
  aparar_bonus     SMALLINT NOT NULL DEFAULT 0,
  bloqueio         TEXT NOT NULL DEFAULT '',
  bloqueio_bonus   SMALLINT NOT NULL DEFAULT 0,
  esquiva_bonus    SMALLINT NOT NULL DEFAULT 0,
  bonus_defesa     SMALLINT NOT NULL DEFAULT 0,
  visivel          BOOLEAN NOT NULL DEFAULT true,
  criado_por       TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ficha_pericia (
  ficha_id    TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem       SMALLINT NOT NULL,
  nome        TEXT NOT NULL CHECK (btrim(nome) <> ''),
  atributo    TEXT NOT NULL CHECK (atributo IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will')),
  dificuldade TEXT NOT NULL CHECK (dificuldade IN ('E', 'A', 'H', 'VH')),
  pontos      SMALLINT NOT NULL DEFAULT 1 CHECK (pontos >= 0),
  bonus       SMALLINT NOT NULL DEFAULT 0,
  -- Entrada do catálogo de perícias (ids skill_* vêm dos livros, em dados/pericias.json, e não estão no banco).
  pericia_id  TEXT,
  PRIMARY KEY (ficha_id, ordem)
);

-- Familiaridade cultural.
CREATE TABLE public.ficha_cultura (
  ficha_id TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem    SMALLINT NOT NULL,
  nome     TEXT NOT NULL CHECK (btrim(nome) <> ''),
  pontos   SMALLINT NOT NULL DEFAULT 1 CHECK (pontos >= 0),
  PRIMARY KEY (ficha_id, ordem)
);

CREATE TABLE public.ficha_vantagem (
  ficha_id     TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem        SMALLINT NOT NULL,
  nome         TEXT NOT NULL CHECK (btrim(nome) <> ''),
  vantagem_id  TEXT,
  custo        INTEGER NOT NULL DEFAULT 0 CHECK (custo >= 0),
  niveis       SMALLINT NOT NULL DEFAULT 0 CHECK (niveis >= 0),
  modificador  INTEGER NOT NULL DEFAULT 0,
  notas        TEXT NOT NULL DEFAULT '',
  -- Só talentos: S, M ou L. As perícias do talento ficam em ficha_vantagem_pericia.
  tamanho      TEXT CHECK (tamanho IN ('S', 'M', 'L')),
  PRIMARY KEY (ficha_id, ordem)
);

CREATE TABLE public.ficha_vantagem_pericia (
  ficha_id        TEXT NOT NULL,
  vantagem_ordem  SMALLINT NOT NULL,
  ordem           SMALLINT NOT NULL,
  nome            TEXT NOT NULL CHECK (btrim(nome) <> ''),
  PRIMARY KEY (ficha_id, vantagem_ordem, ordem),
  FOREIGN KEY (ficha_id, vantagem_ordem) REFERENCES public.ficha_vantagem (ficha_id, ordem) ON DELETE CASCADE
);

CREATE TABLE public.ficha_estilo (
  ficha_id  TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem     SMALLINT NOT NULL,
  nome      TEXT NOT NULL DEFAULT '',
  estilo_id TEXT,
  PRIMARY KEY (ficha_id, ordem)
);

-- Perícia, técnica ou perk/vantagem da seção Combate: dentro de um estilo (estilo_ordem) ou
-- no grupo "Gerais" (estilo_ordem nulo).
CREATE TABLE public.ficha_item_combate (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ficha_id      TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  estilo_ordem  SMALLINT,
  ordem         SMALLINT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('skill', 'tech', 'trait')),
  nome          TEXT NOT NULL DEFAULT '',
  pontos        SMALLINT NOT NULL DEFAULT 0 CHECK (pontos >= 0),
  bonus         SMALLINT,
  atributo      TEXT CHECK (atributo IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will')),
  dificuldade   TEXT CHECK (dificuldade IN ('E', 'A', 'H', 'VH')),
  pericia_id    TEXT,
  -- Só técnicas: perícia-base, padrão e limite em relação a ela (nulo: sem limite).
  pericia_base  TEXT,
  padrao        SMALLINT,
  limite        SMALLINT,
  tecnica_id    TEXT,
  FOREIGN KEY (ficha_id, estilo_ordem) REFERENCES public.ficha_estilo (ficha_id, ordem) ON DELETE CASCADE,
  UNIQUE NULLS NOT DISTINCT (ficha_id, estilo_ordem, ordem)
);

CREATE TABLE public.ficha_arma (
  ficha_id    TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem       SMALLINT NOT NULL,
  nome        TEXT NOT NULL DEFAULT '',
  modo        TEXT NOT NULL DEFAULT 'sw' CHECK (modo IN ('sw', 'thr', 'fixed')),
  modificador TEXT NOT NULL DEFAULT '',
  tipo_dano   TEXT NOT NULL DEFAULT 'cr' CHECK (tipo_dano IN ('cut', 'imp', 'cr', 'pi-', 'pi', 'pi+', 'pi++', 'burn', 'cor', 'tox', 'fat', 'spec')),
  PRIMARY KEY (ficha_id, ordem)
);

-- ---------- personagens ----------
CREATE TABLE public.personagens (
  id                 TEXT PRIMARY KEY CHECK (id <> ''),
  nome               TEXT NOT NULL CHECK (btrim(nome) <> ''),
  descricao          TEXT NOT NULL DEFAULT '',
  raca               TEXT NOT NULL DEFAULT '',
  -- Texto livre antigo de organização; o site o converte em vínculos com organizações.
  organizacao_antiga TEXT NOT NULL DEFAULT '',
  -- No máximo uma ficha por personagem (uma coluna só) e cada ficha em no máximo um personagem (UNIQUE).
  ficha_id           TEXT UNIQUE REFERENCES public.fichas (id) ON DELETE SET NULL,
  imagem_ref         TEXT CHECK (imagem_ref <> ''),
  imagem_largura     INTEGER CHECK (imagem_largura > 0),
  imagem_altura      INTEGER CHECK (imagem_altura > 0),
  imagem_tipo        TEXT,
  imagem_tamanho     BIGINT CHECK (imagem_tamanho >= 0),
  origem             TEXT NOT NULL DEFAULT 'manual',
  -- Personagem da Mesa de Combate de onde este veio (id dentro do estado da Mesa).
  mesa_id            TEXT,
  visivel            BOOLEAN NOT NULL DEFAULT true,
  criado_por         TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mapas onde o personagem aparece.
CREATE TABLE public.personagem_mapa (
  personagem_id TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  mapa_id       TEXT NOT NULL REFERENCES public.mapas (id) ON DELETE CASCADE,
  ordem         SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (personagem_id, mapa_id)
);
CREATE INDEX personagem_mapa_mapa_id_idx ON public.personagem_mapa (mapa_id);

-- Relação declarada por um personagem com outro ("tipo" é como ele vê o outro).
CREATE TABLE public.personagem_relacao (
  personagem_id  TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  relacionado_id TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL DEFAULT '',
  ordem          SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (personagem_id, relacionado_id),
  CHECK (personagem_id <> relacionado_id)
);
CREATE INDEX personagem_relacao_relacionado_id_idx ON public.personagem_relacao (relacionado_id);

-- Personagens que vivem ou costumam estar num local.
CREATE TABLE public.local_personagem (
  local_id      TEXT NOT NULL REFERENCES public.locais (id) ON DELETE CASCADE,
  personagem_id TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  ordem         SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (local_id, personagem_id)
);
CREATE INDEX local_personagem_personagem_id_idx ON public.local_personagem (personagem_id);

-- ---------- organizações ----------
CREATE TABLE public.organizacoes (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  nome           TEXT NOT NULL CHECK (btrim(nome) <> ''),
  descricao      TEXT NOT NULL DEFAULT '',
  reputacao      TEXT NOT NULL DEFAULT '',
  imagem_ref     TEXT CHECK (imagem_ref <> ''),
  imagem_largura INTEGER CHECK (imagem_largura > 0),
  imagem_altura  INTEGER CHECK (imagem_altura > 0),
  imagem_tipo    TEXT,
  imagem_tamanho BIGINT CHECK (imagem_tamanho >= 0),
  visivel        BOOLEAN NOT NULL DEFAULT true,
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Membros: um personagem em várias organizações, cada vínculo uma vez, com o cargo.
CREATE TABLE public.personagem_organizacao (
  organizacao_id TEXT NOT NULL REFERENCES public.organizacoes (id) ON DELETE CASCADE,
  personagem_id  TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  cargo          TEXT NOT NULL DEFAULT '',
  ordem          SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (organizacao_id, personagem_id)
);
CREATE INDEX personagem_organizacao_personagem_id_idx ON public.personagem_organizacao (personagem_id);

CREATE TABLE public.organizacao_local (
  organizacao_id TEXT NOT NULL REFERENCES public.organizacoes (id) ON DELETE CASCADE,
  local_id       TEXT NOT NULL REFERENCES public.locais (id) ON DELETE CASCADE,
  ordem          SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (organizacao_id, local_id)
);
CREATE INDEX organizacao_local_local_id_idx ON public.organizacao_local (local_id);

CREATE TABLE public.organizacao_mapa (
  organizacao_id TEXT NOT NULL REFERENCES public.organizacoes (id) ON DELETE CASCADE,
  mapa_id        TEXT NOT NULL REFERENCES public.mapas (id) ON DELETE CASCADE,
  ordem          SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (organizacao_id, mapa_id)
);
CREATE INDEX organizacao_mapa_mapa_id_idx ON public.organizacao_mapa (mapa_id);

-- ---------- eventos ----------
CREATE TABLE public.eventos (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  nome           TEXT NOT NULL CHECK (btrim(nome) <> ''),
  -- Texto livre: a campanha tem calendário próprio, então não é DATE.
  data_texto     TEXT NOT NULL DEFAULT '',
  descricao      TEXT NOT NULL DEFAULT '',
  local_id       TEXT REFERENCES public.locais (id) ON DELETE SET NULL,
  imagem_ref     TEXT CHECK (imagem_ref <> ''),
  imagem_largura INTEGER CHECK (imagem_largura > 0),
  imagem_altura  INTEGER CHECK (imagem_altura > 0),
  imagem_tipo    TEXT,
  imagem_tamanho BIGINT CHECK (imagem_tamanho >= 0),
  visivel        BOOLEAN NOT NULL DEFAULT true,
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eventos_local_id_idx ON public.eventos (local_id);

CREATE TABLE public.evento_personagem (
  evento_id     TEXT NOT NULL REFERENCES public.eventos (id) ON DELETE CASCADE,
  personagem_id TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  ordem         SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (evento_id, personagem_id)
);
CREATE INDEX evento_personagem_personagem_id_idx ON public.evento_personagem (personagem_id);

-- ---------- marcadores dos mapas ----------
CREATE TABLE public.marcadores (
  id                TEXT PRIMARY KEY CHECK (id <> ''),
  mapa_id           TEXT NOT NULL REFERENCES public.mapas (id) ON DELETE CASCADE,
  -- Posição de 0 a 1 sobre a imagem do mapa: só vale para a imagem atual.
  x                 DOUBLE PRECISION NOT NULL CHECK (x BETWEEN 0 AND 1),
  y                 DOUBLE PRECISION NOT NULL CHECK (y BETWEEN 0 AND 1),
  titulo            TEXT NOT NULL DEFAULT '',
  descricao         TEXT NOT NULL DEFAULT '',
  categoria         TEXT,
  local_id          TEXT REFERENCES public.locais (id) ON DELETE SET NULL,
  -- Outro mapa ao qual o marcador leva (a cidade num marcador do reino).
  mapa_vinculado_id TEXT REFERENCES public.mapas (id) ON DELETE SET NULL,
  visivel           BOOLEAN NOT NULL DEFAULT true,
  criado_por        TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX marcadores_mapa_id_idx ON public.marcadores (mapa_id);
CREATE INDEX marcadores_local_id_idx ON public.marcadores (local_id);
CREATE INDEX marcadores_mapa_vinculado_id_idx ON public.marcadores (mapa_vinculado_id);

-- ---------- anotações ----------
CREATE TABLE public.cadernos (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT NOT NULL CHECK (btrim(nome) <> ''),
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.cadernos IS 'Títulos da seção Anotações (coleção notebooks).';

CREATE TABLE public.anotacoes (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  caderno_id    TEXT NOT NULL REFERENCES public.cadernos (id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL DEFAULT '',
  corpo         TEXT NOT NULL DEFAULT '',
  -- 'html' para texto formatado; nulo para texto simples.
  formato       TEXT,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX anotacoes_caderno_id_idx ON public.anotacoes (caderno_id);

-- ---------- catálogos de GURPS ----------
-- As entradas dos livros ficam nos arquivos dados/*.json, não no banco. Uma linha aqui é uma
-- entrada criada pelo Mestre (id aleatório) ou o que ele mudou numa entrada dos livros (mesmo
-- id do livro: spell_*, adv_*, skill_*, tech_*, style_*). Numa entrada dos livros, uma coluna
-- nula é um campo que segue o livro; excluida marca a entrada que o Mestre excluiu.
CREATE TABLE public.magias (
  id                TEXT PRIMARY KEY CHECK (id <> ''),
  nome              TEXT,
  dificuldade       TEXT,
  classe            TEXT,
  escola            TEXT,
  tempo_conjuracao  TEXT,
  duracao           TEXT,
  custo_inicial     TEXT,
  custo_manutencao  TEXT,
  prerequisitos     TEXT,
  descricao         TEXT,
  item              TEXT,
  pagina            TEXT,
  fonte             TEXT,
  excluida          BOOLEAN NOT NULL DEFAULT false,
  visivel           BOOLEAN NOT NULL DEFAULT true,
  criado_por        TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vantagens (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  custo         TEXT,
  tipo          TEXT,
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

CREATE TABLE public.pericias (
  id             TEXT PRIMARY KEY CHECK (id <> ''),
  nome           TEXT,
  tipo           TEXT,
  atributo       TEXT,
  dificuldade    TEXT,
  especializacao BOOLEAN,
  cinematica     BOOLEAN,
  padroes        TEXT,
  prerequisitos  TEXT,
  descricao      TEXT,
  modificadores  TEXT,
  livro          TEXT,
  pagina         TEXT,
  excluida       BOOLEAN NOT NULL DEFAULT false,
  visivel        BOOLEAN NOT NULL DEFAULT true,
  criado_por     TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tecnicas (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  nome          TEXT,
  dificuldade   TEXT,
  cinematica    BOOLEAN,
  padroes       TEXT,
  prerequisitos TEXT,
  descricao     TEXT,
  modificadores TEXT,
  livro         TEXT,
  pagina        TEXT,
  excluida      BOOLEAN NOT NULL DEFAULT false,
  visivel       BOOLEAN NOT NULL DEFAULT true,
  criado_por    TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- As listas de um estilo ficam como no livro, com os itens separados por "; ".
CREATE TABLE public.estilos (
  id                     TEXT PRIMARY KEY CHECK (id <> ''),
  nome                   TEXT,
  custo                  TEXT,
  descricao              TEXT,
  pericias               TEXT,
  tecnicas               TEXT,
  pericias_cinematicas   TEXT,
  tecnicas_cinematicas   TEXT,
  perks                  TEXT,
  vantagens_opcionais    TEXT,
  desvantagens_opcionais TEXT,
  pericias_opcionais     TEXT,
  tecnicas_opcionais     TEXT,
  perks_opcionais        TEXT,
  livro                  TEXT,
  pagina                 TEXT,
  excluida               BOOLEAN NOT NULL DEFAULT false,
  visivel                BOOLEAN NOT NULL DEFAULT true,
  criado_por             TEXT REFERENCES public.usuarios (id) ON DELETE SET NULL,
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- compartilhamento de itens ocultos ----------
-- Contas que veem um item com visivel = false (sharedWith), uma tabela por entidade para
-- que cada uma tenha chave estrangeira de verdade.
CREATE TABLE public.mapa_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.mapas (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.local_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.locais (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.personagem_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.personagens (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.organizacao_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.organizacoes (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.ficha_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.evento_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.eventos (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.magia_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.magias (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.vantagem_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.vantagens (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.pericia_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.pericias (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.tecnica_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.tecnicas (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);
CREATE TABLE public.estilo_compartilhamento (
  item_id    TEXT NOT NULL REFERENCES public.estilos (id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, usuario_id)
);

-- ---------- Mesa de Combate ----------
-- O estado da Mesa (combates, NPCs, personagens salvos, condições e log) é o estado do app da
-- Mesa, lido e gravado inteiro por ele, e fica num registro só. Normalizá-lo é uma etapa à parte.
CREATE TABLE public.mesa_estado (
  id            TEXT PRIMARY KEY CHECK (id <> ''),
  -- Revisão gravada, quem gravou e em quantas partes (0: o estado está em "estado").
  rev           TEXT,
  partes        INTEGER NOT NULL DEFAULT 0 CHECK (partes >= 0),
  autor         TEXT,
  estado        JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Estado grande demais para um registro, dividido em pedaços de texto.
CREATE TABLE public.mesa_partes (
  id         TEXT PRIMARY KEY CHECK (id <> ''),
  rev        TEXT NOT NULL,
  indice     INTEGER NOT NULL CHECK (indice >= 0),
  parte      TEXT NOT NULL DEFAULT '',
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  gravado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rev, indice)
);

-- ============================================================
-- Triggers
-- ============================================================

-- gravado_em de toda linha gravada (inclusive pelas ações das chaves estrangeiras, como
-- ON DELETE SET NULL), para que o site perceba a mudança.
CREATE FUNCTION hounds_interno.marcar_gravacao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.gravado_em := now();
  RETURN NEW;
END $$;

-- Um vínculo mudou: o item a que ele pertence (TG_ARGV[0], pela coluna TG_ARGV[1]) também
-- mudou. Numa gravação do próprio item, que já marcou gravado_em = now(), não faz nada; quando
-- o vínculo some por outro motivo (o personagem foi excluído e saiu da organização), o item
-- fica como atualizado agora, como o site fazia ao tirar o id da lista.
CREATE FUNCTION hounds_interno.tocar_dono() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN ids := ids || (to_jsonb(NEW) ->> TG_ARGV[1]); END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN ids := ids || (to_jsonb(OLD) ->> TG_ARGV[1]); END IF;
  EXECUTE format('UPDATE public.%I SET atualizado_em = now() WHERE id = ANY ($1) AND gravado_em IS DISTINCT FROM now()', TG_ARGV[0])
    USING ids;
  RETURN NULL;
END $$;

-- Um mapa não pode ficar dentro dele mesmo nem de um mapa que está dentro dele.
CREATE FUNCTION hounds_interno.checar_ciclo_mapa() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mapa_pai_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE acima (id) AS (
      SELECT NEW.mapa_pai_id
      UNION
      SELECT m.mapa_pai_id FROM public.mapas m JOIN acima a ON m.id = a.id WHERE m.mapa_pai_id IS NOT NULL
    )
    SELECT 1 FROM acima WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Esse mapa pai criaria um ciclo na hierarquia. Escolha outro.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION hounds_interno.checar_ciclo_local() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.local_pai_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE acima (id) AS (
      SELECT NEW.local_pai_id
      UNION
      SELECT l.local_pai_id FROM public.locais l JOIN acima a ON l.id = a.id WHERE l.local_pai_id IS NOT NULL
    )
    SELECT 1 FROM acima WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Um local não pode ficar dentro dele mesmo nem de um local que está dentro dele. Escolha outro.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER mapas_ciclo BEFORE INSERT OR UPDATE OF mapa_pai_id ON public.mapas
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.checar_ciclo_mapa();
CREATE TRIGGER locais_ciclo BEFORE INSERT OR UPDATE OF local_pai_id ON public.locais
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.checar_ciclo_local();

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['usuarios', 'mapas', 'locais', 'fichas', 'personagens', 'organizacoes', 'eventos', 'marcadores',
                           'cadernos', 'anotacoes', 'magias', 'vantagens', 'pericias', 'tecnicas', 'estilos', 'mesa_estado', 'mesa_partes']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION hounds_interno.marcar_gravacao()', t || '_gravado_em', t);
  END LOOP;
END $$;

-- Vínculo → item a que ele pertence (o documento do site onde a lista ficava).
CREATE TRIGGER personagem_mapa_dono AFTER INSERT OR UPDATE OR DELETE ON public.personagem_mapa
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('personagens', 'personagem_id');
CREATE TRIGGER personagem_relacao_dono AFTER INSERT OR UPDATE OR DELETE ON public.personagem_relacao
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('personagens', 'personagem_id');
CREATE TRIGGER local_personagem_dono AFTER INSERT OR UPDATE OR DELETE ON public.local_personagem
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('locais', 'local_id');
CREATE TRIGGER personagem_organizacao_dono AFTER INSERT OR UPDATE OR DELETE ON public.personagem_organizacao
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('organizacoes', 'organizacao_id');
CREATE TRIGGER organizacao_local_dono AFTER INSERT OR UPDATE OR DELETE ON public.organizacao_local
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('organizacoes', 'organizacao_id');
CREATE TRIGGER organizacao_mapa_dono AFTER INSERT OR UPDATE OR DELETE ON public.organizacao_mapa
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('organizacoes', 'organizacao_id');
CREATE TRIGGER evento_personagem_dono AFTER INSERT OR UPDATE OR DELETE ON public.evento_personagem
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('eventos', 'evento_id');

DO $$
DECLARE
  par TEXT[];
BEGIN
  FOREACH par SLICE 1 IN ARRAY ARRAY[
    ['mapa_compartilhamento', 'mapas'], ['local_compartilhamento', 'locais'], ['personagem_compartilhamento', 'personagens'],
    ['organizacao_compartilhamento', 'organizacoes'], ['ficha_compartilhamento', 'fichas'], ['evento_compartilhamento', 'eventos'],
    ['magia_compartilhamento', 'magias'], ['vantagem_compartilhamento', 'vantagens'], ['pericia_compartilhamento', 'pericias'],
    ['tecnica_compartilhamento', 'tecnicas'], ['estilo_compartilhamento', 'estilos']]
  LOOP
    EXECUTE format('CREATE INDEX %I ON public.%I (usuario_id)', par[1] || '_usuario_id_idx', par[1]);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono(%L, %L)',
      par[1] || '_dono', par[1], par[2], 'item_id');
  END LOOP;
END $$;

-- ============================================================
-- Realtime: avisos de alteração das tabelas principais. Os vínculos não precisam: mudar um
-- vínculo marca o item a que ele pertence (tocar_dono), e o aviso vem pela tabela dele.
-- REPLICA IDENTITY DEFAULT (o padrão): numa exclusão o aviso leva só o id.
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['usuarios', 'mapas', 'locais', 'fichas', 'personagens', 'organizacoes', 'eventos', 'marcadores',
                           'cadernos', 'anotacoes', 'magias', 'vantagens', 'pericias', 'tecnicas', 'estilos', 'mesa_estado', 'mesa_partes']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
