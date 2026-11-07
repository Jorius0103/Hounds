-- ============================================================
-- 59 · RPCs DO SITE: SECURITY DEFINER FORA DA API
-- O Security Advisor do Supabase acusa cada função SECURITY DEFINER
-- do public que uma conta logada executa (hounds_limpar_chat, ...).
-- Nas RPCs do site isso é de propósito: as tabelas são só leitura
-- para as contas, e elas gravam depois de conferir as permissões. A
-- saída que o aviso aponta é tirá-las do schema exposto pela API:
--   - a função de verdade (SECURITY DEFINER, o mesmo corpo, as mesmas
--     permissões) vai para hounds_interno, que a API não expõe;
--   - no public fica uma casca SECURITY INVOKER com o mesmo nome e os
--     mesmos parâmetros, que só a chama. O site, a Edge Function
--     contas e tools/importar-supabase.mjs continuam chamando as
--     mesmas RPCs, com os mesmos argumentos.
-- Para quem usa o site nada muda, e a segurança fica a mesma: quem
-- podia chamar continua podendo. O service_role (a Edge Function e
-- as ferramentas) ganha o USAGE de hounds_interno para passar pela
-- casca.
-- Ao mudar uma destas funções, mude a de hounds_interno
-- (hounds_interno.hounds_put...). Uma migration que recriar a do
-- public como SECURITY DEFINER (rodar a 7, a 34 ou a 54 de novo)
-- funciona, mas traz o aviso de volta: rode esta depois, que ela
-- passa a nova versão para hounds_interno. Pode rodar a qualquer
-- momento, e de novo sem efeito.
-- ============================================================

-- ---------- 1. as funções de verdade vão para hounds_interno ----------
DO $$
DECLARE
  f TEXT;
  pub REGPROCEDURE;
BEGIN
  FOREACH f IN ARRAY ARRAY['hounds_put(text, text, jsonb)', 'hounds_patch(text, text, jsonb)', 'hounds_remove(text, text)',
                           'hounds_remove_many(text, text[])', 'hounds_trocar_imagem_mapa(text, jsonb, boolean, bigint)',
                           'hounds_limpar_chat()', 'hounds_registrar_rolagem(jsonb)', 'hounds_limpar_mesa_rolagens()']
  LOOP
    pub := to_regprocedure('public.' || f);
    -- Só a SECURITY DEFINER: rodando de novo, a do public já é a casca. Se uma versão nova foi
    -- recriada no public, ela substitui a que está em hounds_interno.
    IF pub IS NOT NULL AND (SELECT p.prosecdef FROM pg_catalog.pg_proc p WHERE p.oid = pub) THEN
      IF to_regprocedure('hounds_interno.' || f) IS NOT NULL THEN
        EXECUTE format('DROP FUNCTION %s', to_regprocedure('hounds_interno.' || f));
      END IF;
      EXECUTE format('ALTER FUNCTION %s SET SCHEMA hounds_interno', pub);
    END IF;
  END LOOP;
END $$;

-- ---------- 2. no public, as cascas ----------
-- Em plpgsql como as de verdade, para responder igual (as VOID devolvem vazio, e não null).
CREATE OR REPLACE FUNCTION public.hounds_put(p_col TEXT, p_id TEXT, p_doc JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN RETURN hounds_interno.hounds_put(p_col, p_id, p_doc); END $$;

CREATE OR REPLACE FUNCTION public.hounds_patch(p_col TEXT, p_id TEXT, p_patch JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN RETURN hounds_interno.hounds_patch(p_col, p_id, p_patch); END $$;

CREATE OR REPLACE FUNCTION public.hounds_remove(p_col TEXT, p_id TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN PERFORM hounds_interno.hounds_remove(p_col, p_id); END $$;

CREATE OR REPLACE FUNCTION public.hounds_remove_many(p_col TEXT, p_ids TEXT[]) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN PERFORM hounds_interno.hounds_remove_many(p_col, p_ids); END $$;

CREATE OR REPLACE FUNCTION public.hounds_trocar_imagem_mapa(p_mapa_id TEXT, p_imagem JSONB, p_confirmado BOOLEAN, p_atualizado_em BIGINT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN RETURN hounds_interno.hounds_trocar_imagem_mapa(p_mapa_id, p_imagem, p_confirmado, p_atualizado_em); END $$;

CREATE OR REPLACE FUNCTION public.hounds_limpar_chat() RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN PERFORM hounds_interno.hounds_limpar_chat(); END $$;

CREATE OR REPLACE FUNCTION public.hounds_registrar_rolagem(p_rolagem JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN RETURN hounds_interno.hounds_registrar_rolagem(p_rolagem); END $$;

CREATE OR REPLACE FUNCTION public.hounds_limpar_mesa_rolagens() RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$ BEGIN RETURN hounds_interno.hounds_limpar_mesa_rolagens(); END $$;

-- ---------- 3. permissões ----------
-- As de antes: as contas logadas e o service_role chamam; a chave pública, não.
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['hounds_put(text, text, jsonb)', 'hounds_patch(text, text, jsonb)', 'hounds_remove(text, text)',
                           'hounds_remove_many(text, text[])', 'hounds_trocar_imagem_mapa(text, jsonb, boolean, bigint)',
                           'hounds_limpar_chat()', 'hounds_registrar_rolagem(jsonb)', 'hounds_limpar_mesa_rolagens()']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s, hounds_interno.%s FROM PUBLIC, anon', f, f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s, hounds_interno.%s TO authenticated, service_role', f, f);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA hounds_interno TO service_role;

-- A API relê as funções.
NOTIFY pgrst, 'reload schema';
