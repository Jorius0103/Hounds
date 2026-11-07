-- ============================================================
-- 60 · TABELAS DA CÓPIA DE hounds_docs: SEM ACESSO, POR ESCRITO
-- O Security Advisor do Supabase acusa hounds_interno.migracao: RLS
-- ligado e nenhuma policy. Ela e hounds_interno.migracao_erros são da
-- cópia única de hounds_docs para as tabelas (a 6): a data em que a
-- cópia rodou (migrar_documentos a confere para não copiar de novo) e
-- os documentos que deram erro. A 6 tirou todo o acesso de anon e
-- authenticated; só o dono (as migrations, migrar_documentos) e o
-- service_role as usam, e os dois passam por cima do RLS. RLS ligado
-- sem policy é exatamente isso, mas o aviso pede que fique escrito:
-- cada uma fica com RLS e com uma policy que nega tudo a anon e
-- authenticated. Nada muda. Pode rodar a qualquer momento, e de novo
-- sem efeito.
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['migracao', 'migracao_erros']
  LOOP
    IF to_regclass('hounds_interno.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE hounds_interno.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Sem acesso pelo site" ON hounds_interno.%I', t);
      EXECUTE format('CREATE POLICY "Sem acesso pelo site" ON hounds_interno.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
      EXECUTE format('REVOKE ALL ON hounds_interno.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
