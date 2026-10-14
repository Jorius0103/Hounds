-- ============================================================
-- 10 · FICHA › EQUIPAMENTOS
-- A seção Equipamentos da ficha (js/tabs/ficha-equipamentos.js):
-- sheet.equip = [{ name, qty, weight, cost, carried, notes }], na
-- ordem em que a ficha mostra. Peso (lbs) e custo ($) são de uma
-- unidade; carried = false é o que fica guardado, fora da carga.
-- A view fichas_doc e a função salvar_ficha são as das migrations
-- 3 e 4 com a lista nova; o resto delas não muda.
-- ============================================================

CREATE TABLE public.ficha_equipamento (
  ficha_id    TEXT NOT NULL REFERENCES public.fichas (id) ON DELETE CASCADE,
  ordem       SMALLINT NOT NULL,
  nome        TEXT NOT NULL CHECK (btrim(nome) <> ''),
  quantidade  INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  peso        NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (peso >= 0),
  custo       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
  carregado   BOOLEAN NOT NULL DEFAULT true,
  notas       TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (ficha_id, ordem)
);

-- Leitura só para contas ligadas a um usuário; escrita só pelas funções (como as outras ficha_*).
ALTER TABLE public.ficha_equipamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura com login" ON public.ficha_equipamento FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL);
REVOKE ALL ON public.ficha_equipamento FROM anon, authenticated;
GRANT SELECT ON public.ficha_equipamento TO authenticated;

CREATE OR REPLACE VIEW public.fichas_doc WITH (security_invoker = true) AS
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
    'equip', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', e.nome, 'qty', e.quantidade, 'weight', e.peso, 'cost', e.custo,
                         'carried', e.carregado, 'notes', e.notas) ORDER BY e.ordem)
                       FROM public.ficha_equipamento e WHERE e.ficha_id = f.id), '[]'::jsonb),
    'visible', f.visivel,
    'sharedWith', COALESCE((SELECT jsonb_agg(c.usuario_id ORDER BY c.ordem) FROM public.ficha_compartilhamento c WHERE c.item_id = f.id), '[]'::jsonb),
    'createdBy', f.criado_por,
    'createdAt', hounds_interno.ms(f.criado_em),
    'updatedAt', hounds_interno.ms(f.atualizado_em)) AS data
FROM public.fichas f;

CREATE OR REPLACE FUNCTION hounds_interno.salvar_ficha(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_attrs JSONB := CASE WHEN jsonb_typeof(d -> 'attrs') = 'object' THEN d -> 'attrs' ELSE '{}'::jsonb END;
  v_combat JSONB := CASE WHEN jsonb_typeof(d -> 'combat') = 'object' THEN d -> 'combat' ELSE '{}'::jsonb END;
  v_def JSONB;
  v_iq INTEGER;
  v_per INTEGER;
  v_vontade INTEGER;
  n_estilos INTEGER;
  estilo RECORD;
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome da ficha.');
  v_def := CASE WHEN jsonb_typeof(v_combat -> 'def') = 'object' THEN v_combat -> 'def' ELSE '{}'::jsonb END;
  v_iq := hounds_interno.inteiro(v_attrs -> 'iq', 10);
  v_per := hounds_interno.inteiro(v_attrs -> 'per', 0);
  v_vontade := hounds_interno.inteiro(v_attrs -> 'will', 0);
  -- Fichas de antes das bases de Percepção e Vontade contavam a partir de IQ: guardam o valor
  -- que mostravam, agora sobre a base 10 (a mesma regra de sheetAttrs, em tab-fichas.js).
  IF v_attrs ? 'per' AND NOT v_attrs ? 'perBase' THEN v_per := least(greatest(v_iq + v_per - 10, -50), 50); END IF;
  IF v_attrs ? 'will' AND NOT v_attrs ? 'willBase' THEN v_vontade := least(greatest(v_iq + v_vontade - 10, -50), 50); END IF;
  SELECT count(*) INTO n_estilos FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'styles')) AS s (v) WHERE jsonb_typeof(s.v) = 'object';

  INSERT INTO public.fichas AS t (id, nome, descricao, st, dx, iq, ht, per, vontade, per_base, vontade_base, pv, pf, velocidade, deslocamento,
                                  carga, metal, penalidade_magia, posicao_gerais, aparar, aparar_bonus, bloqueio, bloqueio_bonus, esquiva_bonus,
                                  bonus_defesa, visivel, criado_por, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'description'), ''),
          hounds_interno.inteiro(v_attrs -> 'st', 10), hounds_interno.inteiro(v_attrs -> 'dx', 10), v_iq, hounds_interno.inteiro(v_attrs -> 'ht', 10),
          v_per, v_vontade, hounds_interno.inteiro(v_attrs -> 'perBase', 10), hounds_interno.inteiro(v_attrs -> 'willBase', 10),
          hounds_interno.inteiro(v_attrs -> 'hp', 0), hounds_interno.inteiro(v_attrs -> 'fp', 0),
          round(COALESCE(hounds_interno.numero(v_attrs -> 'speed'), 0) * 4) / 4, hounds_interno.inteiro(v_attrs -> 'move', 0),
          least(greatest(hounds_interno.inteiro(v_attrs -> 'enc', 0), 0), 4), greatest(round(COALESCE(hounds_interno.numero(v_attrs -> 'metal'), 0), 2), 0),
          hounds_interno.inteiro(v_attrs -> 'spellPenalty', 0),
          least(greatest(hounds_interno.inteiro(v_combat -> 'generalPos', n_estilos), 0), n_estilos),
          COALESCE(hounds_interno.texto(v_def -> 'parry'), ''), hounds_interno.inteiro(v_def -> 'parryBonus', 0),
          COALESCE(hounds_interno.texto(v_def -> 'block'), ''), hounds_interno.inteiro(v_def -> 'blockBonus', 0),
          hounds_interno.inteiro(v_def -> 'dodgeBonus', 0), hounds_interno.inteiro(v_def -> 'db', 0),
          hounds_interno.logico(d -> 'visible', true), hounds_interno.usuario(d ->> 'createdBy'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, descricao, st, dx, iq, ht, per, vontade, per_base, vontade_base, pv, pf, velocidade, deslocamento,
                                  carga, metal, penalidade_magia, posicao_gerais, aparar, aparar_bonus, bloqueio, bloqueio_bonus, esquiva_bonus,
                                  bonus_defesa, visivel, criado_por, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.descricao, EXCLUDED.st, EXCLUDED.dx, EXCLUDED.iq, EXCLUDED.ht, EXCLUDED.per, EXCLUDED.vontade,
         EXCLUDED.per_base, EXCLUDED.vontade_base, EXCLUDED.pv, EXCLUDED.pf, EXCLUDED.velocidade, EXCLUDED.deslocamento, EXCLUDED.carga,
         EXCLUDED.metal, EXCLUDED.penalidade_magia, EXCLUDED.posicao_gerais, EXCLUDED.aparar, EXCLUDED.aparar_bonus, EXCLUDED.bloqueio,
         EXCLUDED.bloqueio_bonus, EXCLUDED.esquiva_bonus, EXCLUDED.bonus_defesa, EXCLUDED.visivel, EXCLUDED.criado_por,
         EXCLUDED.criado_em, EXCLUDED.atualizado_em);

  -- As listas da ficha são regravadas inteiras, na ordem recebida.
  DELETE FROM public.ficha_pericia WHERE ficha_id = p_id;
  DELETE FROM public.ficha_cultura WHERE ficha_id = p_id;
  DELETE FROM public.ficha_vantagem WHERE ficha_id = p_id;
  DELETE FROM public.ficha_item_combate WHERE ficha_id = p_id;
  DELETE FROM public.ficha_estilo WHERE ficha_id = p_id;
  DELETE FROM public.ficha_arma WHERE ficha_id = p_id;
  DELETE FROM public.ficha_equipamento WHERE ficha_id = p_id;

  -- Perícias (cleanSkill): sem nome não entra.
  INSERT INTO public.ficha_pericia (ficha_id, ordem, nome, atributo, dificuldade, pontos, bonus, pericia_id)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name',
         CASE WHEN e.v ->> 'attr' IN ('ST', 'DX', 'IQ', 'HT', 'Per', 'Will') THEN e.v ->> 'attr' ELSE 'IQ' END,
         CASE WHEN e.v ->> 'diff' IN ('E', 'A', 'H', 'VH') THEN e.v ->> 'diff' ELSE 'A' END,
         greatest(hounds_interno.inteiro(e.v -> 'pts', 1), 0), hounds_interno.inteiro(e.v -> 'bonus', 0), NULLIF(e.v ->> 'skillId', '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'skills')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  -- Familiaridades culturais (cleanCulture).
  INSERT INTO public.ficha_cultura (ficha_id, ordem, nome, pontos)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name', greatest(hounds_interno.inteiro(e.v -> 'pts', 1), 0)
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'cultures')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  -- Vantagens (cleanAdv): num talento, o tamanho define o custo e há pelo menos um nível.
  INSERT INTO public.ficha_vantagem (ficha_id, ordem, nome, vantagem_id, custo, niveis, modificador, notas, tamanho)
  SELECT p_id, e.ordem, e.v ->> 'name', NULLIF(e.v ->> 'advId', ''),
         CASE e.tam WHEN 'S' THEN 5 WHEN 'M' THEN 10 WHEN 'L' THEN 15 ELSE greatest(hounds_interno.inteiro(e.v -> 'cost', 0), 0) END,
         greatest(hounds_interno.inteiro(e.v -> 'levels', 0), CASE WHEN e.tam IS NULL THEN 0 ELSE 1 END),
         hounds_interno.inteiro(e.v -> 'mod', 0), COALESCE(e.v ->> 'notes', ''), e.tam
  FROM (SELECT v, (row_number() OVER (ORDER BY n) - 1)::smallint AS ordem,
               CASE WHEN v ->> 'size' IN ('S', 'M', 'L') THEN v ->> 'size' END AS tam
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'advs')) WITH ORDINALITY AS x (v, n)
        WHERE jsonb_typeof(v) = 'object' AND COALESCE(btrim(v ->> 'name'), '') <> '') e;

  INSERT INTO public.ficha_vantagem_pericia (ficha_id, vantagem_ordem, ordem, nome)
  SELECT p_id, va.ordem, (k.n - 1)::smallint, k.v #>> '{}'
  FROM public.ficha_vantagem va
  JOIN (SELECT v, (row_number() OVER (ORDER BY n) - 1)::smallint AS ordem
        FROM jsonb_array_elements(hounds_interno.lista(d -> 'advs')) WITH ORDINALITY AS x (v, n)
        WHERE jsonb_typeof(v) = 'object' AND COALESCE(btrim(v ->> 'name'), '') <> '') e ON e.ordem = va.ordem
  CROSS JOIN LATERAL jsonb_array_elements(hounds_interno.lista(e.v -> 'skills')) WITH ORDINALITY AS k (v, n)
  WHERE va.ficha_id = p_id AND va.tamanho IS NOT NULL AND jsonb_typeof(k.v) = 'string' AND btrim(k.v #>> '{}') <> '';

  -- Seção Combate (cleanCombat): estilos com seus itens, itens gerais, armas.
  FOR estilo IN
    SELECT s.v, (s.n - 1)::smallint AS ordem
    FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'styles')) WITH ORDINALITY AS s (v, n)
    WHERE jsonb_typeof(s.v) = 'object'
  LOOP
    INSERT INTO public.ficha_estilo (ficha_id, ordem, nome, estilo_id)
    VALUES (p_id, estilo.ordem, COALESCE(estilo.v ->> 'name', ''), NULLIF(estilo.v ->> 'styleId', ''));
    PERFORM hounds_interno.inserir_itens_combate(p_id, estilo.ordem, estilo.v -> 'items');
  END LOOP;
  PERFORM hounds_interno.inserir_itens_combate(p_id, NULL, v_combat -> 'general');

  INSERT INTO public.ficha_arma (ficha_id, ordem, nome, modo, modificador, tipo_dano)
  SELECT p_id, (w.n - 1)::smallint, COALESCE(w.v ->> 'name', ''),
         CASE WHEN w.v ->> 'mode' IN ('sw', 'thr', 'fixed') THEN w.v ->> 'mode' ELSE 'sw' END,
         COALESCE(w.v ->> 'mod', ''),
         CASE WHEN w.v ->> 'type' IN ('cut', 'imp', 'cr', 'pi-', 'pi', 'pi+', 'pi++', 'burn', 'cor', 'tox', 'fat', 'spec') THEN w.v ->> 'type' ELSE 'cr' END
  FROM jsonb_array_elements(hounds_interno.lista(v_combat -> 'weapons')) WITH ORDINALITY AS w (v, n)
  WHERE jsonb_typeof(w.v) = 'object';

  -- Equipamentos (cleanEquip): sem nome não entra; peso e custo de uma unidade, com centavos.
  INSERT INTO public.ficha_equipamento (ficha_id, ordem, nome, quantidade, peso, custo, carregado, notas)
  SELECT p_id, (row_number() OVER (ORDER BY e.n) - 1)::smallint, e.v ->> 'name',
         least(greatest(hounds_interno.inteiro(e.v -> 'qty', 1), 0), 9999),
         least(greatest(round(COALESCE(hounds_interno.numero(e.v -> 'weight'), 0), 2), 0), 99999),
         least(greatest(round(COALESCE(hounds_interno.numero(e.v -> 'cost'), 0), 2), 0), 9999999),
         hounds_interno.logico(e.v -> 'carried', true), COALESCE(e.v ->> 'notes', '')
  FROM jsonb_array_elements(hounds_interno.lista(d -> 'equip')) WITH ORDINALITY AS e (v, n)
  WHERE jsonb_typeof(e.v) = 'object' AND COALESCE(btrim(e.v ->> 'name'), '') <> '';

  PERFORM hounds_interno.gravar_vinculos('ficha_compartilhamento', 'item_id', 'usuario_id', p_id, d -> 'sharedWith', 'usuarios');
END $$;
