-- ============================================================
-- 25 · VANTAGENS: EFEITOS NA FICHA
-- O que uma vantagem soma ou tira na ficha de quem a tem
-- (js/tabs/ficha-efeitos.js), cadastrado pelo Mestre no formulário
-- da vantagem. Vale igual para as vantagens dos livros (o documento
-- que o Mestre grava por cima da entrada) e para as criadas por ele.
--   vantagem_efeito  um efeito por linha, na ordem do formulário:
--     alvo       attr (atributo), def (defesa ativa), skill (perícias
--                pelo nome), skillAttr (perícias de um atributo),
--                skillAll (todas as perícias), spell (magias pelo
--                nome), college (magias de uma escola), spellAll
--                (todas as magias)
--     campo      o atributo, a defesa ou o atributo das perícias;
--                vazio nos outros alvos
--     nomes      as perícias, magias ou escolas (só nesses alvos);
--                um nome terminado em * pega os que começam assim
--     operacao   add ou sub; valor 0 a 99
--     por_nivel  o valor vale para cada nível da vantagem na ficha
--     maximo     o máximo que o efeito dá (nulo: sem limite)
--     acumula    false: entre os que não acumulam no mesmo campo, só
--                o maior vale
--     condicao   quando vale; com condição, o efeito é mostrado na
--                ficha e não somado
-- Nada é gravado nas fichas: o site soma os efeitos ao desenhar, a
-- partir das vantagens da ficha (ficha_vantagem) e dos valores-base,
-- então mudar ou remover uma vantagem, ou os efeitos dela, muda a
-- ficha sem somar duas vezes.
-- A view vantagens_doc e a função salvar_vantagem são as da migration
-- 3 com os efeitos; o resto delas não muda.
-- ============================================================

CREATE TABLE public.vantagem_efeito (
  vantagem_id TEXT NOT NULL REFERENCES public.vantagens (id) ON DELETE CASCADE,
  ordem       SMALLINT NOT NULL,
  alvo        TEXT NOT NULL CHECK (alvo IN ('attr', 'def', 'skill', 'skillAttr', 'skillAll', 'spell', 'college', 'spellAll')),
  campo       TEXT NOT NULL DEFAULT '',
  nomes       TEXT[] NOT NULL DEFAULT '{}',
  operacao    TEXT NOT NULL DEFAULT 'add' CHECK (operacao IN ('add', 'sub')),
  valor       SMALLINT NOT NULL DEFAULT 1 CHECK (valor BETWEEN 0 AND 99),
  por_nivel   BOOLEAN NOT NULL DEFAULT false,
  maximo      SMALLINT CHECK (maximo BETWEEN 0 AND 99),
  acumula     BOOLEAN NOT NULL DEFAULT true,
  condicao    TEXT NOT NULL DEFAULT '',
  descricao   TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (vantagem_id, ordem),
  -- Cada alvo com o seu campo, e nomes só (e sempre) nos alvos por nome.
  CONSTRAINT vantagem_efeito_campo_check CHECK (
    (alvo = 'attr' AND campo IN ('st', 'dx', 'iq', 'ht', 'per', 'will', 'hp', 'fp', 'speed', 'move') AND cardinality(nomes) = 0) OR
    (alvo = 'def' AND campo IN ('dodge', 'parry', 'block', 'all') AND cardinality(nomes) = 0) OR
    (alvo = 'skillAttr' AND campo IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') AND cardinality(nomes) = 0) OR
    (alvo IN ('skill', 'spell', 'college') AND campo = '' AND cardinality(nomes) BETWEEN 1 AND 30) OR
    (alvo IN ('skillAll', 'spellAll') AND campo = '' AND cardinality(nomes) = 0))
);

-- ---------- permissões (as mesmas de vantagens) ----------
-- Leitura só para contas ligadas a um usuário; escrita só pelas funções.
ALTER TABLE public.vantagem_efeito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura com login" ON public.vantagem_efeito FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL);
REVOKE ALL ON public.vantagem_efeito FROM anon, authenticated;
GRANT SELECT ON public.vantagem_efeito TO authenticated;

-- ---------- view de leitura (com os efeitos) ----------
CREATE OR REPLACE VIEW public.vantagens_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'cost', x.custo, 'type', x.tipo, 'book', x.livro, 'page', x.pagina, 'description', x.descricao,
    'effects', COALESCE((SELECT jsonb_agg(jsonb_build_object('target', e.alvo, 'key', e.campo, 'names', to_jsonb(e.nomes), 'op', e.operacao,
                           'value', e.valor, 'perLevel', e.por_nivel, 'max', e.maximo, 'stacks', e.acumula, 'cond', e.condicao,
                           'note', e.descricao) ORDER BY e.ordem)
                         FROM public.vantagem_efeito e WHERE e.vantagem_id = x.id), '[]'::jsonb),
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.vantagem_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.vantagens x;

-- ---------- gravação da vantagem (com os efeitos) ----------
CREATE OR REPLACE FUNCTION hounds_interno.salvar_vantagem(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  INSERT INTO public.vantagens AS t (id, nome, custo, tipo, livro, pagina, descricao, excluida, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), hounds_interno.texto(d -> 'cost'), hounds_interno.texto(d -> 'type'),
          hounds_interno.texto(d -> 'book'), hounds_interno.texto(d -> 'page'), hounds_interno.texto(d -> 'description'),
          hounds_interno.logico(d -> 'deleted', false), hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, custo, tipo, livro, pagina, descricao, excluida, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.custo, EXCLUDED.tipo, EXCLUDED.livro, EXCLUDED.pagina, EXCLUDED.descricao, EXCLUDED.excluida,
         EXCLUDED.visivel, EXCLUDED.criado_por, EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- Efeitos (cleanAdvEffect): regravados inteiros, na ordem recebida. Um alvo desconhecido não
  -- entra; um campo fora da lista vira o primeiro dela; um alvo por nomes sem nomes não entra.
  DELETE FROM public.vantagem_efeito WHERE vantagem_id = p_id;
  INSERT INTO public.vantagem_efeito (vantagem_id, ordem, alvo, campo, nomes, operacao, valor, por_nivel, maximo, acumula, condicao, descricao)
  SELECT p_id, (row_number() OVER (ORDER BY x.n) - 1)::smallint, x.alvo,
         CASE x.alvo
           WHEN 'attr' THEN CASE WHEN x.campo IN ('st', 'dx', 'iq', 'ht', 'per', 'will', 'hp', 'fp', 'speed', 'move') THEN x.campo ELSE 'st' END
           WHEN 'def' THEN CASE WHEN x.campo IN ('dodge', 'parry', 'block', 'all') THEN x.campo ELSE 'dodge' END
           WHEN 'skillAttr' THEN CASE WHEN x.campo IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN x.campo ELSE 'ST' END
           ELSE '' END,
         CASE WHEN x.alvo IN ('skill', 'spell', 'college') THEN x.nomes ELSE '{}'::text[] END,
         CASE WHEN x.v ->> 'op' = 'sub' THEN 'sub' ELSE 'add' END,
         least(greatest(hounds_interno.inteiro(x.v -> 'value', 1), 0), 99),
         hounds_interno.logico(x.v -> 'perLevel', false),
         CASE WHEN jsonb_typeof(x.v -> 'max') = 'number' THEN least(greatest(hounds_interno.inteiro(x.v -> 'max', 0), 0), 99) END,
         hounds_interno.logico(x.v -> 'stacks', true),
         left(btrim(COALESCE(x.v ->> 'cond', '')), 200), left(btrim(COALESCE(x.v ->> 'note', '')), 300)
  FROM (SELECT e.v, e.n, e.v ->> 'target' AS alvo, COALESCE(e.v ->> 'key', '') AS campo,
               ARRAY(SELECT left(btrim(m.v #>> '{}'), 100)
                     FROM jsonb_array_elements(hounds_interno.lista(e.v -> 'names')) WITH ORDINALITY AS m (v, k)
                     WHERE jsonb_typeof(m.v) = 'string' AND btrim(m.v #>> '{}') <> ''
                     ORDER BY m.k LIMIT 30) AS nomes
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'effects')) WITH ORDINALITY AS e (v, n)
        WHERE jsonb_typeof(e.v) = 'object') x
  WHERE x.alvo IN ('attr', 'def', 'skill', 'skillAttr', 'skillAll', 'spell', 'college', 'spellAll')
    AND (x.alvo NOT IN ('skill', 'spell', 'college') OR cardinality(x.nomes) > 0);

  PERFORM hounds_interno.gravar_vinculos('vantagem_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;
