-- ============================================================
-- 36 · CONTA VINCULADA À FICHA
-- O Mestre vincula uma conta a uma ficha principal (botão Vincular
-- conta na ficha e o campo Conta vinculada no formulário da ficha;
-- js/tabs/tab-fichas.js). Cada conta tem no máximo uma ficha e cada
-- ficha no máximo uma conta. O site também põe a conta em sharedWith
-- da ficha, para ela ver a ficha mesmo oculta.
--   usuarios.ficha_id   a ficha da conta (nulo: nenhuma)
-- A view usuarios_doc e a função salvar_usuario são as da migration 7
-- com o sheetId; o resto delas não muda. Um usuário gravado sem o
-- campo sheetId (a Edge Function contas, por exemplo) fica com a
-- ficha que tinha.
-- ============================================================

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ficha_id TEXT REFERENCES public.fichas (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_ficha_id_key ON public.usuarios (ficha_id);
COMMENT ON COLUMN public.usuarios.ficha_id IS 'Ficha principal vinculada à conta (uma por conta e uma conta por ficha).';

-- ---------- view de leitura (com o sheetId) ----------
CREATE OR REPLACE VIEW public.usuarios_doc WITH (security_invoker = true) AS
SELECT u.id, u.gravado_em AS updated_at,
  jsonb_build_object('name', u.nome, 'role', u.papel,
    'email', (SELECT e.email FROM public.usuario_email e WHERE e.usuario_id = u.id),
    'sheetId', u.ficha_id,
    'createdAt', hounds_interno.ms(u.criado_em), 'updatedAt', hounds_interno.ms(u.atualizado_em)) AS data
FROM public.usuarios u;

-- ---------- gravação (com o sheetId) ----------
-- Uma ficha que não existe mais fica nula; um aliado ou uma ficha de outra conta é recusado.
CREATE OR REPLACE FUNCTION hounds_interno.salvar_usuario(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(hounds_interno.texto(d -> 'email'), '')));
  v_ficha TEXT := (SELECT f.id FROM public.fichas f WHERE f.id = d ->> 'sheetId');
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do usuário.');
  IF v_ficha IS NOT NULL THEN
    IF (SELECT f.tipo FROM public.fichas f WHERE f.id = v_ficha) <> 'principal' THEN
      RAISE EXCEPTION 'Só a ficha principal pode ser vinculada a uma conta.' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.usuarios u WHERE u.ficha_id = v_ficha AND u.id <> p_id) THEN
      RAISE EXCEPTION 'Essa ficha já está vinculada a outra conta.' USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  INSERT INTO public.usuarios AS t (id, nome, papel, ficha_id, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'role'), 'jogador'), v_ficha,
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, papel, ficha_id, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.papel, CASE WHEN d ? 'sheetId' THEN EXCLUDED.ficha_id ELSE t.ficha_id END, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
  IF d ? 'email' THEN
    IF v_email = '' THEN
      DELETE FROM public.usuario_email WHERE usuario_id = p_id;
    ELSIF v_email NOT LIKE '_%@_%' THEN
      RAISE EXCEPTION 'Esse email não parece válido.' USING ERRCODE = 'check_violation';
    ELSIF EXISTS (SELECT 1 FROM public.usuario_email e WHERE e.email = v_email AND e.usuario_id <> p_id) THEN
      RAISE EXCEPTION 'Esse email já é de outro usuário.' USING ERRCODE = 'unique_violation';
    ELSE
      INSERT INTO public.usuario_email AS e (usuario_id, email) VALUES (p_id, v_email)
      ON CONFLICT (usuario_id) DO UPDATE SET email = EXCLUDED.email;
    END IF;
  END IF;
END $$;
