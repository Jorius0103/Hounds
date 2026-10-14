-- ============================================================
-- 7 · AUTENTICAÇÃO E PERMISSÕES POR PAPEL
-- Cada pessoa entra com email e senha (Supabase Auth, provedor Email).
-- A conta é criada pelo Mestre no painel do Supabase (Authentication ›
-- Users › Add user, com "Auto Confirm User") e é ligada ao usuário do
-- Hounds pelo email, que o Mestre põe na aba Usuários.
--
-- A partir daqui:
--   * só quem entrou com uma conta ligada a um usuário lê ou grava
--     (a chave pública sozinha não lê mais nada);
--   * o banco garante as permissões de cada papel, as mesmas do site:
--       Mestre   tudo: usuários, catálogos de GURPS, visibilidade e
--                compartilhamento de qualquer item;
--       Jogador  cria e altera os itens que vê (mapas, locais,
--                personagens, fichas, organizações, eventos,
--                marcadores, anotações e a Mesa); muda a visibilidade
--                só do que ele criou; não mexe em usuários, catálogos
--                nem em com quem um item é compartilhado;
--   * quem criou um item é sempre a conta que gravou (createdBy), e não
--     muda depois;
--   * envio de imagens só com login (a leitura continua pública pelo
--     endereço, que é aleatório);
--   * as mensagens diretas da Mesa vão por um canal privado.
-- Itens ocultos continuam chegando aos jogadores logados, e o site os
-- esconde, como antes.
--
-- Logo depois de rodar, ainda no SQL Editor, ponha o email do Mestre
-- (o mesmo da conta criada no painel), senão ninguém consegue entrar:
--   INSERT INTO public.usuario_email (usuario_id, email) VALUES ('user-leandro', 'email-do-mestre@exemplo.com');
-- Os outros emails o Mestre põe pela aba Usuários do site. Veja SUPABASE.md.
-- ============================================================

-- ---------- email de cada usuário (só o Mestre vê) ----------
CREATE TABLE public.usuario_email (
  usuario_id TEXT PRIMARY KEY REFERENCES public.usuarios (id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND email LIKE '_%@_%')
);
COMMENT ON TABLE public.usuario_email IS 'Email da conta do Supabase Auth de cada usuário do Hounds. Só o Mestre lê.';

-- ---------- quem está usando ----------
-- O usuário do Hounds da conta logada: o que tem o email (confirmado) dela. Nulo sem login,
-- com email não confirmado ou sem usuário com esse email.
CREATE FUNCTION hounds_interno.usuario_atual() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT e.usuario_id
  FROM public.usuario_email e
  JOIN auth.users a ON lower(a.email) = e.email
  WHERE a.id = auth.uid() AND a.email_confirmed_at IS NOT NULL
$$;

CREATE FUNCTION hounds_interno.eh_mestre() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = hounds_interno.usuario_atual() AND u.papel = 'mestre')
$$;

-- Chave service_role (scripts de tools/, nunca o site): sem as regras de papel.
CREATE FUNCTION hounds_interno.servico() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', current_setting('request.jwt.claim.role', true)) = 'service_role'
$$;

-- O usuário do Hounds desta conta ({ id, name, role }), ou null. O site chama depois do login.
CREATE FUNCTION public.hounds_eu() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id', u.id, 'name', u.nome, 'role', u.papel)
  FROM public.usuarios u WHERE u.id = hounds_interno.usuario_atual()
$$;

-- O item (no formato do site) pode ser visto por u: visível para todos, criado por u ou
-- compartilhado com u (a mesma regra de pub(), em mundo.js).
CREATE FUNCTION hounds_interno.pode_ver(d JSONB, u TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(d ->> 'visible', 'true') <> 'false' OR d ->> 'createdBy' = u OR COALESCE(d -> 'sharedWith', '[]'::jsonb) ? u
$$;

-- Confere se a conta logada pode gravar (ou, com p_remover, excluir) o item p_id de p_col e
-- devolve o item como deve ser gravado: o dono (createdBy) é quem criou, e só o Mestre muda
-- com quem um item é compartilhado. Recusa com uma mensagem para quem usa o site.
CREATE FUNCTION hounds_interno.autorizar(p_col TEXT, p_id TEXT, p_doc JSONB, p_remover BOOLEAN DEFAULT false) RETURNS JSONB
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  u TEXT;
  mestre BOOLEAN;
  atual JSONB;
BEGIN
  IF hounds_interno.servico() THEN RETURN p_doc; END IF;
  u := hounds_interno.usuario_atual();
  IF u IS NULL THEN
    RAISE EXCEPTION 'Entre com a sua conta para salvar. Se já entrou, recarregue a página.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  mestre := hounds_interno.eh_mestre();
  IF t IN ('usuarios', 'magias', 'vantagens', 'pericias', 'tecnicas', 'estilos') AND NOT mestre THEN
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

-- Depois de mudar usuários: precisa sobrar um Mestre com quem entrar.
CREATE FUNCTION hounds_interno.checar_mestres() RETURNS VOID
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE papel = 'mestre') THEN
    RAISE EXCEPTION 'É preciso manter pelo menos um Mestre.' USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- ---------- usuários: o email vai junto ----------
-- "email" no item: texto grava, vazio ou null tira; sem o campo, fica como está.
CREATE OR REPLACE FUNCTION hounds_interno.salvar_usuario(p_id TEXT, d JSONB) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_email TEXT := lower(btrim(COALESCE(hounds_interno.texto(d -> 'email'), '')));
BEGIN
  PERFORM hounds_interno.exigir_nome(d -> 'name', 'Informe o nome do usuário.');
  INSERT INTO public.usuarios AS t (id, nome, papel, criado_em, atualizado_em)
  VALUES (p_id, hounds_interno.texto(d -> 'name'), COALESCE(hounds_interno.texto(d -> 'role'), 'jogador'),
          COALESCE(hounds_interno.ts(d -> 'createdAt'), now()), COALESCE(hounds_interno.ts(d -> 'updatedAt'), now()))
  ON CONFLICT (id) DO UPDATE SET (nome, papel, criado_em, atualizado_em) =
    ROW (EXCLUDED.nome, EXCLUDED.papel, EXCLUDED.criado_em, EXCLUDED.atualizado_em);
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

-- Com o email, que só o Mestre recebe (RLS de usuario_email).
CREATE OR REPLACE VIEW public.usuarios_doc WITH (security_invoker = true) AS
SELECT u.id, u.gravado_em AS updated_at,
  jsonb_build_object('name', u.nome, 'role', u.papel,
    'email', (SELECT e.email FROM public.usuario_email e WHERE e.usuario_id = u.id),
    'createdAt', hounds_interno.ms(u.criado_em), 'updatedAt', hounds_interno.ms(u.atualizado_em)) AS data
FROM public.usuarios u;

-- O email mudou: o usuário também (o aviso do Realtime vem pela tabela usuarios).
CREATE TRIGGER usuario_email_dono AFTER INSERT OR UPDATE OR DELETE ON public.usuario_email
  FOR EACH ROW EXECUTE FUNCTION hounds_interno.tocar_dono('usuarios', 'usuario_id');

-- ---------- funções de gravação com as permissões ----------
CREATE OR REPLACE FUNCTION public.hounds_put(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF jsonb_typeof(p_doc) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Dados inválidos para %.', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  PERFORM hounds_interno.gravar(p_col, p_id, hounds_interno.autorizar(p_col, p_id, p_doc));
  IF hounds_interno.tabela(p_col) = 'usuarios' THEN PERFORM hounds_interno.checar_mestres(); END IF;
  RETURN hounds_interno.ler(p_col, p_id, p_col NOT IN ('mesa', 'mesa_chunks'));
END $$;

CREATE OR REPLACE FUNCTION public.hounds_patch(p_col TEXT, p_id TEXT, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  t TEXT := hounds_interno.tabela(p_col);
  atual JSONB;
BEGIN
  IF t IS NULL THEN RAISE EXCEPTION 'Coleção desconhecida: %', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Dados inválidos para %.', p_col USING ERRCODE = 'invalid_parameter_value'; END IF;
  -- Duas mudanças ao mesmo tempo no mesmo item esperam uma pela outra, e nenhuma se perde.
  EXECUTE format('SELECT 1 FROM public.%I WHERE id = $1 FOR UPDATE', t) USING p_id;
  atual := hounds_interno.ler(p_col, p_id) -> 'data';
  IF atual IS NULL THEN
    RAISE EXCEPTION 'Esse item não existe mais. Recarregue a página.' USING ERRCODE = 'no_data_found';
  END IF;
  PERFORM hounds_interno.gravar(p_col, p_id, hounds_interno.autorizar(p_col, p_id, atual || p_patch));
  IF t = 'usuarios' THEN PERFORM hounds_interno.checar_mestres(); END IF;
  RETURN hounds_interno.ler(p_col, p_id, p_col NOT IN ('mesa', 'mesa_chunks'));
END $$;

CREATE OR REPLACE FUNCTION public.hounds_remove(p_col TEXT, p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM hounds_interno.autorizar(p_col, p_id, '{}'::jsonb, true);
  PERFORM hounds_interno.remover(p_col, p_id);
  IF hounds_interno.tabela(p_col) = 'usuarios' THEN PERFORM hounds_interno.checar_mestres(); END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hounds_remove_many(p_col TEXT, p_ids TEXT[]) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  i TEXT;
BEGIN
  FOREACH i IN ARRAY COALESCE(p_ids, ARRAY[]::TEXT[]) LOOP
    PERFORM hounds_interno.autorizar(p_col, i, '{}'::jsonb, true);
    PERFORM hounds_interno.remover(p_col, i);
  END LOOP;
  IF hounds_interno.tabela(p_col) = 'usuarios' THEN PERFORM hounds_interno.checar_mestres(); END IF;
END $$;

-- Mesmo corpo da 4/6, com a conferência de quem pode alterar o mapa no começo.
CREATE OR REPLACE FUNCTION public.hounds_trocar_imagem_mapa(p_mapa_id TEXT, p_imagem JSONB, p_confirmado BOOLEAN, p_atualizado_em BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  img JSONB := hounds_interno.objeto_imagem(p_imagem);
  anterior TEXT;
  n INTEGER;
BEGIN
  SELECT m.imagem_ref INTO anterior FROM public.mapas m WHERE m.id = p_mapa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esse mapa não existe mais.' USING ERRCODE = 'no_data_found'; END IF;
  PERFORM hounds_interno.autorizar('maps', p_mapa_id, '{}'::jsonb, true);
  IF img IS NULL THEN RAISE EXCEPTION 'Selecione a nova imagem do mapa.' USING ERRCODE = 'invalid_parameter_value'; END IF;
  SELECT count(*) INTO n FROM public.marcadores k WHERE k.mapa_id = p_mapa_id;
  IF n > 0 AND p_confirmado IS NOT TRUE THEN
    RAISE EXCEPTION 'Este mapa tem % %. Confirme a troca da imagem, que exclui todos eles.', n, CASE WHEN n = 1 THEN 'marcador' ELSE 'marcadores' END
      USING ERRCODE = 'check_violation', HINT = 'markers_exist', DETAIL = n::text;
  END IF;
  DELETE FROM public.marcadores WHERE mapa_id = p_mapa_id;
  UPDATE public.mapas SET imagem_ref = img ->> 'ref', imagem_largura = hounds_interno.inteiro(img -> 'w'), imagem_altura = hounds_interno.inteiro(img -> 'h'),
         imagem_tipo = img ->> 'type', imagem_tamanho = hounds_interno.numero(img -> 'size')::bigint,
         atualizado_em = COALESCE(hounds_interno.ts(to_jsonb(p_atualizado_em)), now())
   WHERE id = p_mapa_id;
  RETURN jsonb_build_object('removidos', n, 'imagemAnterior', anterior);
END $$;

-- ============================================================
-- RLS: leitura só para contas ligadas a um usuário
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios', 'mapas', 'locais', 'fichas', 'ficha_pericia', 'ficha_cultura', 'ficha_vantagem', 'ficha_vantagem_pericia',
    'ficha_estilo', 'ficha_item_combate', 'ficha_arma', 'personagens', 'personagem_mapa', 'personagem_relacao', 'local_personagem',
    'organizacoes', 'personagem_organizacao', 'organizacao_local', 'organizacao_mapa', 'eventos', 'evento_personagem',
    'marcadores', 'cadernos', 'anotacoes', 'magias', 'vantagens', 'pericias', 'tecnicas', 'estilos',
    'mapa_compartilhamento', 'local_compartilhamento', 'personagem_compartilhamento', 'organizacao_compartilhamento',
    'ficha_compartilhamento', 'evento_compartilhamento', 'magia_compartilhamento', 'vantagem_compartilhamento',
    'pericia_compartilhamento', 'tecnica_compartilhamento', 'estilo_compartilhamento', 'mesa_estado', 'mesa_partes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Leitura pública" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Leitura com login" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Leitura com login" ON public.%I FOR SELECT TO authenticated USING ((SELECT hounds_interno.usuario_atual()) IS NOT NULL)', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'usuarios_doc', 'mapas_doc', 'marcadores_doc', 'locais_doc', 'personagens_doc', 'organizacoes_doc', 'eventos_doc', 'fichas_doc',
    'cadernos_doc', 'anotacoes_doc', 'magias_doc', 'vantagens_doc', 'pericias_doc', 'tecnicas_doc', 'estilos_doc',
    'mesa_estado_doc', 'mesa_partes_doc']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  END LOOP;
END $$;

ALTER TABLE public.usuario_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Só o Mestre" ON public.usuario_email FOR SELECT TO authenticated USING ((SELECT hounds_interno.eh_mestre()));
REVOKE ALL ON public.usuario_email FROM anon, authenticated;
GRANT SELECT ON public.usuario_email TO authenticated;

-- A cópia antiga (hounds_docs) não fica mais aberta para a chave pública.
DROP POLICY IF EXISTS "Leitura pública hounds_docs" ON public.hounds_docs;
REVOKE ALL ON public.hounds_docs FROM anon, authenticated;

-- ---------- funções ----------
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hounds_interno FROM PUBLIC, anon, authenticated;
REVOKE USAGE ON SCHEMA hounds_interno FROM anon;
GRANT EXECUTE ON FUNCTION hounds_interno.ms(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.imagem(TEXT, INTEGER, INTEGER, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.itens_combate(TEXT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.usuario_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION hounds_interno.eh_mestre() TO authenticated;

DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['hounds_put(TEXT, TEXT, JSONB)', 'hounds_patch(TEXT, TEXT, JSONB)', 'hounds_remove(TEXT, TEXT)',
                           'hounds_remove_many(TEXT, TEXT[])', 'hounds_trocar_imagem_mapa(TEXT, JSONB, BOOLEAN, BIGINT)', 'hounds_eu()']
  LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION public.' || f || ' FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || f || ' TO authenticated, service_role';
  END LOOP;
END $$;

-- ============================================================
-- Imagens: enviar, trocar e apagar só com login. A leitura segue pública pelo endereço.
-- ============================================================
DROP POLICY IF EXISTS "Permitir upload de imagens" ON storage.objects;
CREATE POLICY "Permitir upload de imagens" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
DROP POLICY IF EXISTS "Permitir atualização de imagens" ON storage.objects;
CREATE POLICY "Permitir atualização de imagens" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);
DROP POLICY IF EXISTS "Permitir exclusão de imagens" ON storage.objects;
CREATE POLICY "Permitir exclusão de imagens" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hounds-images' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL);

-- ============================================================
-- Realtime: as mensagens diretas da Mesa vão pelo canal privado "hounds-mesa", só para
-- contas ligadas a um usuário. (Os avisos das tabelas seguem o RLS de cada tabela.)
-- ============================================================
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NULL THEN
    RAISE NOTICE 'realtime.messages não existe; canal privado da Mesa não configurado.';
    RETURN;
  END IF;
  EXECUTE 'DROP POLICY IF EXISTS "Hounds: ler canal da Mesa" ON realtime.messages';
  EXECUTE 'CREATE POLICY "Hounds: ler canal da Mesa" ON realtime.messages FOR SELECT TO authenticated
           USING (realtime.topic() = ''hounds-mesa'' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL)';
  EXECUTE 'DROP POLICY IF EXISTS "Hounds: enviar no canal da Mesa" ON realtime.messages';
  EXECUTE 'CREATE POLICY "Hounds: enviar no canal da Mesa" ON realtime.messages FOR INSERT TO authenticated
           WITH CHECK (realtime.topic() = ''hounds-mesa'' AND (SELECT hounds_interno.usuario_atual()) IS NOT NULL)';
END $$;

-- Quem já pode entrar (deve listar pelo menos o Mestre):
SELECT u.nome, u.papel, e.email FROM public.usuarios u LEFT JOIN public.usuario_email e ON e.usuario_id = u.id ORDER BY u.papel, u.nome;
