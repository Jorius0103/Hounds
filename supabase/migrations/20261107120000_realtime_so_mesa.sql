-- ============================================================
-- 30 · REALTIME SÓ DA MESA
-- Só a Mesa de Combate fica sincronizada entre os navegadores; o
-- resto do site é carregado quando ele abre (js/store/supabase.js,
-- LIVE). A publicação supabase_realtime fica só com mesa_estado, o
-- registro pequeno de cada gravação da Mesa. Sai também mesa_partes:
-- o estado em partes é lido só por quem não recebeu a revisão pelo
-- canal hounds-mesa (js/mesa-sync.js).
-- Tira da publicação toda tabela do schema public que não seja
-- mesa_estado, inclusive as que alguma migration futura tenha posto.
-- Pode rodar de novo sem efeito.
-- ============================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime não existe; Realtime não configurado.';
    RETURN;
  END IF;
  FOR t IN SELECT tablename FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename <> 'mesa_estado'
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mesa_estado') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mesa_estado;
  END IF;
END $$;
