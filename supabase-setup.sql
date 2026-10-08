-- ============================================================
-- SCRIPT DE CONFIGURAÇÃO DO SUPABASE PARA O HOUNDS
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/cjjhlorfnjspikjhsanx/sql
-- ============================================================

-- 1. Cria a tabela de documentos do Hounds (mapas, locais, personagens, etc.)
CREATE TABLE IF NOT EXISTS public.hounds_docs (
    col TEXT NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (col, id)
);

-- 2. Índices para consultas rápidas por coleção e data
CREATE INDEX IF NOT EXISTS idx_hounds_docs_col ON public.hounds_docs (col);
CREATE INDEX IF NOT EXISTS idx_hounds_docs_updated ON public.hounds_docs (updated_at DESC);

-- 3. Habilita Realtime para que todos os jogadores vejam alterações instantaneamente
ALTER TABLE public.hounds_docs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hounds_docs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hounds_docs;
  END IF;
END $$;

-- 4. Habilita Row Level Security (RLS) com acesso para leitura e gravação
ALTER TABLE public.hounds_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso público hounds_docs" ON public.hounds_docs;
CREATE POLICY "Acesso público hounds_docs"
ON public.hounds_docs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Função RPC para mesclar atualizações (patch) de documentos JSONB
CREATE OR REPLACE FUNCTION patch_hounds_doc(p_col TEXT, p_id TEXT, p_patch JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.hounds_docs (col, id, data, updated_at)
  VALUES (p_col, p_id, p_patch, timezone('utc'::text, now()))
  ON CONFLICT (col, id) DO UPDATE
  SET data = public.hounds_docs.data || p_patch,
      updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION patch_hounds_doc(TEXT, TEXT, JSONB) TO anon, authenticated;

-- 6. Cria o bucket público de imagens 'hounds-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('hounds-images', 'hounds-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de segurança para o bucket de imagens
DROP POLICY IF EXISTS "Imagens públicas para leitura" ON storage.objects;
CREATE POLICY "Imagens públicas para leitura"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'hounds-images');

DROP POLICY IF EXISTS "Permitir upload de imagens" ON storage.objects;
CREATE POLICY "Permitir upload de imagens"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'hounds-images');

DROP POLICY IF EXISTS "Permitir atualização de imagens" ON storage.objects;
CREATE POLICY "Permitir atualização de imagens"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'hounds-images');

DROP POLICY IF EXISTS "Permitir exclusão de imagens" ON storage.objects;
CREATE POLICY "Permitir exclusão de imagens"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'hounds-images');

