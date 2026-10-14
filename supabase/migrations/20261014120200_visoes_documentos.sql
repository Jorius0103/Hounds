-- ============================================================
-- 3/6 · VIEWS DE LEITURA (<tabela>_doc)
-- O site trabalha com cada item como um objeto (o mapa com a lista
-- de quem pode ver, a organização com os membros, a ficha com as
-- perícias...). Cada view junta a tabela principal e os vínculos
-- dela e devolve esse objeto, com os nomes de campos que o site usa:
--   id          o id do item
--   data        o item montado (JSONB só na resposta; nada é gravado assim)
--   updated_at  gravado_em, para o site saber o que mudou
-- As views rodam com as permissões de quem consulta (security_invoker),
-- então valem as regras de RLS das tabelas.
-- ============================================================

-- Datas em milissegundos desde 1970, como o site guarda createdAt e updatedAt.
CREATE FUNCTION hounds_interno.ms(t TIMESTAMPTZ) RETURNS BIGINT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT (extract(epoch FROM t) * 1000)::bigint $$;

-- O objeto da imagem ({ ref, w, h, type, size }) ou null.
CREATE FUNCTION hounds_interno.imagem(ref TEXT, w INTEGER, h INTEGER, tipo TEXT, tamanho BIGINT) RETURNS JSONB
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN ref IS NULL THEN 'null'::jsonb
              ELSE jsonb_strip_nulls(jsonb_build_object('ref', ref, 'w', w, 'h', h, 'type', tipo, 'size', tamanho)) END
$$;

CREATE VIEW public.usuarios_doc WITH (security_invoker = true) AS
SELECT u.id, u.gravado_em AS updated_at,
  jsonb_build_object('name', u.nome, 'role', u.papel,
    'createdAt', hounds_interno.ms(u.criado_em), 'updatedAt', hounds_interno.ms(u.atualizado_em)) AS data
FROM public.usuarios u;

CREATE VIEW public.mapas_doc WITH (security_invoker = true) AS
SELECT m.id, m.gravado_em AS updated_at,
  jsonb_build_object(
    'name', m.nome,
    'parentId', m.mapa_pai_id,
    'image', hounds_interno.imagem(m.imagem_ref, m.imagem_largura, m.imagem_altura, m.imagem_tipo, m.imagem_tamanho),
    'visible', m.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.mapa_compartilhamento c WHERE c.item_id = m.id), '[]'::jsonb),
    'createdBy', m.criado_por,
    'createdAt', hounds_interno.ms(m.criado_em),
    'updatedAt', hounds_interno.ms(m.atualizado_em)) AS data
FROM public.mapas m;

CREATE VIEW public.marcadores_doc WITH (security_invoker = true) AS
SELECT k.id, k.mapa_id, k.gravado_em AS updated_at,
  jsonb_build_object(
    'x', k.x, 'y', k.y,
    'title', k.titulo,
    'description', k.descricao,
    'category', k.categoria,
    'locationId', k.local_id,
    'linkedMapId', k.mapa_vinculado_id,
    'visible', k.visivel,
    'createdBy', k.criado_por,
    'createdAt', hounds_interno.ms(k.criado_em),
    'updatedAt', hounds_interno.ms(k.atualizado_em)) AS data
FROM public.marcadores k;

CREATE VIEW public.locais_doc WITH (security_invoker = true) AS
SELECT l.id, l.gravado_em AS updated_at,
  jsonb_build_object(
    'name', l.nome,
    'description', l.descricao,
    'image', hounds_interno.imagem(l.imagem_ref, l.imagem_largura, l.imagem_altura, l.imagem_tipo, l.imagem_tamanho),
    'image2', hounds_interno.imagem(l.imagem2_ref, l.imagem2_largura, l.imagem2_altura, l.imagem2_tipo, l.imagem2_tamanho),
    'characterIds', COALESCE((SELECT jsonb_agg(v.personagem_id ORDER BY v.ordem) FROM public.local_personagem v WHERE v.local_id = l.id), '[]'::jsonb),
    'mapId', l.mapa_id,
    'parentId', l.local_pai_id,
    'visible', l.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.local_compartilhamento c WHERE c.item_id = l.id), '[]'::jsonb),
    'createdBy', l.criado_por,
    'createdAt', hounds_interno.ms(l.criado_em),
    'updatedAt', hounds_interno.ms(l.atualizado_em)) AS data
FROM public.locais l;

CREATE VIEW public.personagens_doc WITH (security_invoker = true) AS
SELECT p.id, p.gravado_em AS updated_at,
  jsonb_build_object(
    'name', p.nome,
    'description', p.descricao,
    'race', p.raca,
    'organization', p.organizacao_antiga,
    'mapIds', COALESCE((SELECT jsonb_agg(v.mapa_id ORDER BY v.ordem) FROM public.personagem_mapa v WHERE v.personagem_id = p.id), '[]'::jsonb),
    'relations', COALESCE((SELECT jsonb_agg(jsonb_build_object('charId', r.relacionado_id, 'type', r.tipo) ORDER BY r.ordem)
                           FROM public.personagem_relacao r WHERE r.personagem_id = p.id), '[]'::jsonb),
    'sheetId', p.ficha_id,
    'image', hounds_interno.imagem(p.imagem_ref, p.imagem_largura, p.imagem_altura, p.imagem_tipo, p.imagem_tamanho),
    'source', p.origem,
    'mesaId', p.mesa_id,
    'visible', p.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.personagem_compartilhamento c WHERE c.item_id = p.id), '[]'::jsonb),
    'createdBy', p.criado_por,
    'createdAt', hounds_interno.ms(p.criado_em),
    'updatedAt', hounds_interno.ms(p.atualizado_em)) AS data
FROM public.personagens p;

CREATE VIEW public.organizacoes_doc WITH (security_invoker = true) AS
SELECT o.id, o.gravado_em AS updated_at,
  jsonb_build_object(
    'name', o.nome,
    'description', o.descricao,
    'reputation', o.reputacao,
    'members', COALESCE((SELECT jsonb_agg(jsonb_build_object('charId', v.personagem_id, 'rank', v.cargo) ORDER BY v.ordem)
                         FROM public.personagem_organizacao v WHERE v.organizacao_id = o.id), '[]'::jsonb),
    'locationIds', COALESCE((SELECT jsonb_agg(v.local_id ORDER BY v.ordem) FROM public.organizacao_local v WHERE v.organizacao_id = o.id), '[]'::jsonb),
    'mapIds', COALESCE((SELECT jsonb_agg(v.mapa_id ORDER BY v.ordem) FROM public.organizacao_mapa v WHERE v.organizacao_id = o.id), '[]'::jsonb),
    'image', hounds_interno.imagem(o.imagem_ref, o.imagem_largura, o.imagem_altura, o.imagem_tipo, o.imagem_tamanho),
    'visible', o.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.organizacao_compartilhamento c WHERE c.item_id = o.id), '[]'::jsonb),
    'createdBy', o.criado_por,
    'createdAt', hounds_interno.ms(o.criado_em),
    'updatedAt', hounds_interno.ms(o.atualizado_em)) AS data
FROM public.organizacoes o;

CREATE VIEW public.eventos_doc WITH (security_invoker = true) AS
SELECT e.id, e.gravado_em AS updated_at,
  jsonb_build_object(
    'name', e.nome,
    'date', e.data_texto,
    'description', e.descricao,
    'locationId', e.local_id,
    'characterIds', COALESCE((SELECT jsonb_agg(v.personagem_id ORDER BY v.ordem) FROM public.evento_personagem v WHERE v.evento_id = e.id), '[]'::jsonb),
    'image', hounds_interno.imagem(e.imagem_ref, e.imagem_largura, e.imagem_altura, e.imagem_tipo, e.imagem_tamanho),
    'visible', e.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.evento_compartilhamento c WHERE c.item_id = e.id), '[]'::jsonb),
    'createdBy', e.criado_por,
    'createdAt', hounds_interno.ms(e.criado_em),
    'updatedAt', hounds_interno.ms(e.atualizado_em)) AS data
FROM public.eventos e;

-- Itens da seção Combate de uma ficha: os de um estilo, ou os "Gerais" (estilo nulo).
CREATE FUNCTION hounds_interno.itens_combate(p_ficha TEXT, p_estilo SMALLINT) RETURNS JSONB
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT COALESCE(jsonb_agg(
    CASE i.tipo
      WHEN 'trait' THEN jsonb_build_object('kind', 'trait', 'name', i.nome, 'pts', i.pontos)
      WHEN 'skill' THEN jsonb_strip_nulls(jsonb_build_object('kind', 'skill', 'name', i.nome, 'pts', i.pontos, 'bonus', i.bonus,
                          'attr', i.atributo, 'diff', i.dificuldade, 'skillId', i.pericia_id))
      ELSE jsonb_strip_nulls(jsonb_build_object('kind', 'tech', 'name', i.nome, 'pts', i.pontos, 'bonus', i.bonus,
             'base', i.pericia_base, 'diff', i.dificuldade, 'def', i.padrao, 'techId', i.tecnica_id))
           || jsonb_build_object('max', i.limite)   -- null: técnica sem limite
    END ORDER BY i.ordem), '[]'::jsonb)
  FROM public.ficha_item_combate i
  WHERE i.ficha_id = p_ficha AND i.estilo_ordem IS NOT DISTINCT FROM p_estilo
$$;

CREATE VIEW public.fichas_doc WITH (security_invoker = true) AS
SELECT f.id, f.gravado_em AS updated_at,
  jsonb_build_object(
    'name', f.nome,
    'description', f.descricao,
    'attrs', jsonb_build_object('st', f.st, 'dx', f.dx, 'iq', f.iq, 'ht', f.ht, 'per', f.per, 'will', f.vontade,
      'perBase', f.per_base, 'willBase', f.vontade_base, 'hp', f.pv, 'fp', f.pf, 'speed', f.velocidade, 'move', f.deslocamento,
      'enc', f.carga, 'metal', f.metal, 'spellPenalty', f.penalidade_magia),
    'skills', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', k.nome, 'attr', k.atributo, 'diff', k.dificuldade,
                          'pts', k.pontos, 'bonus', k.bonus, 'skillId', k.pericia_id)) ORDER BY k.ordem)
                        FROM public.ficha_pericia k WHERE k.ficha_id = f.id), '[]'::jsonb),
    'cultures', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', c.nome, 'pts', c.pontos) ORDER BY c.ordem)
                          FROM public.ficha_cultura c WHERE c.ficha_id = f.id), '[]'::jsonb),
    'advs', COALESCE((SELECT jsonb_agg(
               jsonb_strip_nulls(jsonb_build_object('name', a.nome, 'advId', a.vantagem_id, 'cost', a.custo, 'levels', a.niveis,
                 'mod', a.modificador, 'notes', a.notas, 'size', a.tamanho))
               || CASE WHEN a.tamanho IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('skills',
                    COALESCE((SELECT jsonb_agg(t.nome ORDER BY t.ordem) FROM public.ficha_vantagem_pericia t
                              WHERE t.ficha_id = a.ficha_id AND t.vantagem_ordem = a.ordem), '[]'::jsonb)) END
               ORDER BY a.ordem)
             FROM public.ficha_vantagem a WHERE a.ficha_id = f.id), '[]'::jsonb),
    'combat', jsonb_build_object(
      'generalPos', f.posicao_gerais,
      'styles', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name', s.nome, 'styleId', s.estilo_id))
                            || jsonb_build_object('items', hounds_interno.itens_combate(f.id, s.ordem)) ORDER BY s.ordem)
                          FROM public.ficha_estilo s WHERE s.ficha_id = f.id), '[]'::jsonb),
      'general', hounds_interno.itens_combate(f.id, NULL),
      'weapons', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', w.nome, 'mode', w.modo, 'mod', w.modificador, 'type', w.tipo_dano) ORDER BY w.ordem)
                           FROM public.ficha_arma w WHERE w.ficha_id = f.id), '[]'::jsonb),
      'def', jsonb_build_object('parry', f.aparar, 'parryBonus', f.aparar_bonus, 'block', f.bloqueio, 'blockBonus', f.bloqueio_bonus,
        'dodgeBonus', f.esquiva_bonus, 'db', f.bonus_defesa)),
    'visible', f.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.ficha_compartilhamento c WHERE c.item_id = f.id), '[]'::jsonb),
    'createdBy', f.criado_por,
    'createdAt', hounds_interno.ms(f.criado_em),
    'updatedAt', hounds_interno.ms(f.atualizado_em)) AS data
FROM public.fichas f;

CREATE VIEW public.cadernos_doc WITH (security_invoker = true) AS
SELECT n.id, n.gravado_em AS updated_at,
  jsonb_build_object('name', n.nome, 'visible', n.visivel, 'createdBy', n.criado_por,
    'createdAt', hounds_interno.ms(n.criado_em), 'updatedAt', hounds_interno.ms(n.atualizado_em)) AS data
FROM public.cadernos n;

CREATE VIEW public.anotacoes_doc WITH (security_invoker = true) AS
SELECT a.id, a.gravado_em AS updated_at,
  jsonb_build_object('notebookId', a.caderno_id, 'title', a.titulo, 'body', a.corpo, 'format', a.formato, 'visible', a.visivel,
    'createdBy', a.criado_por, 'createdAt', hounds_interno.ms(a.criado_em), 'updatedAt', hounds_interno.ms(a.atualizado_em)) AS data
FROM public.anotacoes a;

-- Catálogos: campos nulos (que seguem o livro) ficam fora do objeto, para não apagar o texto do livro.
CREATE VIEW public.magias_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'difficulty', x.dificuldade, 'class', x.classe, 'college', x.escola, 'timeToCast', x.tempo_conjuracao,
    'duration', x.duracao, 'initialCost', x.custo_inicial, 'maintenanceCost', x.custo_manutencao, 'prerequisites', x.prerequisitos,
    'description', x.descricao, 'item', x.item, 'page', x.pagina, 'source', x.fonte,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.magia_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.magias x;

CREATE VIEW public.vantagens_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'cost', x.custo, 'type', x.tipo, 'book', x.livro, 'page', x.pagina, 'description', x.descricao,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.vantagem_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.vantagens x;

CREATE VIEW public.pericias_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'type', x.tipo, 'attribute', x.atributo, 'difficulty', x.dificuldade, 'specialty', x.especializacao,
    'cinematic', x.cinematica, 'defaults', x.padroes, 'prerequisites', x.prerequisitos, 'description', x.descricao,
    'modifiers', x.modificadores, 'book', x.livro, 'page', x.pagina,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.pericia_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.pericias x;

CREATE VIEW public.tecnicas_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'difficulty', x.dificuldade, 'cinematic', x.cinematica, 'defaults', x.padroes, 'prerequisites', x.prerequisitos,
    'description', x.descricao, 'modifiers', x.modificadores, 'book', x.livro, 'page', x.pagina,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.tecnica_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.tecnicas x;

CREATE VIEW public.estilos_doc WITH (security_invoker = true) AS
SELECT x.id, x.gravado_em AS updated_at,
  jsonb_strip_nulls(jsonb_build_object(
    'name', x.nome, 'cost', x.custo, 'description', x.descricao, 'skills', x.pericias, 'techniques', x.tecnicas,
    'cinematicSkills', x.pericias_cinematicas, 'cinematicTechniques', x.tecnicas_cinematicas, 'perks', x.perks,
    'optAdvantages', x.vantagens_opcionais, 'optDisadvantages', x.desvantagens_opcionais, 'optSkills', x.pericias_opcionais,
    'optTechniques', x.tecnicas_opcionais, 'optPerks', x.perks_opcionais, 'book', x.livro, 'page', x.pagina,
    'deleted', x.excluida, 'visible', x.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.estilo_compartilhamento c WHERE c.item_id = x.id), '[]'::jsonb),
    'createdBy', x.criado_por, 'createdAt', hounds_interno.ms(x.criado_em), 'updatedAt', hounds_interno.ms(x.atualizado_em))) AS data
FROM public.estilos x;

CREATE VIEW public.mesa_estado_doc WITH (security_invoker = true) AS
SELECT s.id, s.gravado_em AS updated_at,
  s.estado || jsonb_build_object('rev', s.rev, 'n', s.partes, 'by', s.autor,
    'createdAt', hounds_interno.ms(s.criado_em), 'updatedAt', hounds_interno.ms(s.atualizado_em)) AS data
FROM public.mesa_estado s;

CREATE VIEW public.mesa_partes_doc WITH (security_invoker = true) AS
SELECT p.id, p.gravado_em AS updated_at,
  jsonb_build_object('rev', p.rev, 'i', p.indice, 'part', p.parte, 'createdAt', hounds_interno.ms(p.criado_em)) AS data
FROM public.mesa_partes p;
