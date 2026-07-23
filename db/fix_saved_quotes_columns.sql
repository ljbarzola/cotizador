-- ============================================================
-- MIGRATION: Add missing columns to saved_quotes
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'install_margin') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN install_margin NUMERIC(5,2) DEFAULT 35;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'supplier_margins') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN supplier_margins JSONB DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_quotes' AND column_name = 'installation_enabled') THEN
    ALTER TABLE public.saved_quotes ADD COLUMN installation_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verificar columnas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'saved_quotes' AND table_schema = 'public'
ORDER BY ordinal_position;
