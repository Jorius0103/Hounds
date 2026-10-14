-- ============================================================
-- 9 · PERFIL ADMIN
-- Admin é um Jogador que também gerencia os usuários: cria, edita e
-- exclui usuários e contas de login, define senhas e vê os emails.
-- O Admin não cria Mestre, não dá o perfil de Mestre a ninguém e não
-- edita nem exclui um Mestre; a senha de um Mestre ele pode definir
-- (isso é feito pela função "contas", fora do banco). No resto (itens,
-- catálogos, visibilidade, Mesa) vale tudo o que vale para o Jogador.
-- ============================================================

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_papel_check CHECK (papel IN ('mestre', 'admin', 'jogador', 'visualizador'));

-- O perfil da conta logada (mestre, admin, jogador...), ou nulo.
CREATE FUNCTION hounds_interno.papel_atual() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.papel FROM public.usuarios u WHERE u.id = hounds_interno.usuario_atual()
$$;

-- Pode gerenciar usuários: o Mestre e o Admin.
CREATE FUNCTION hounds_interno.gerencia_usuarios() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(hounds_interno.papel_atual() IN ('mestre', 'admin'), false)
$$;

-- A mesma conferência da 7, com os usuários abertos também ao Admin (sem mexer em Mestre).
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

  IF t IN ('magias', 'vantagens', 'pericias', 'tecnicas', 'estilos') AND NOT mestre THEN
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

-- Os emails: o Mestre e o Admin veem.
DROP POLICY IF EXISTS "Só o Mestre" ON public.usuario_email;
DROP POLICY IF EXISTS "Mestre e Admin" ON public.usuario_email;
CREATE POLICY "Mestre e Admin" ON public.usuario_email FOR SELECT TO authenticated USING ((SELECT hounds_interno.gerencia_usuarios()));

REVOKE ALL ON FUNCTION hounds_interno.papel_atual() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION hounds_interno.gerencia_usuarios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION hounds_interno.autorizar(TEXT, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.papel_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.gerencia_usuarios() TO authenticated;

-- A função "contas" (service_role) confere o perfil do usuário-alvo antes de deixar o Admin agir.
GRANT SELECT ON public.usuarios TO service_role;
