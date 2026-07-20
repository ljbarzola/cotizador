-- ============================================================
-- RESET COMPLETO: Borrar y recrear las 3 tablas con schema correcto
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 0. Borrar todo
DROP VIEW IF EXISTS public.all_products CASCADE;
DROP TABLE IF EXISTS public.equipos CASCADE;
DROP TABLE IF EXISTS public.materiales CASCADE;
DROP TABLE IF EXISTS public.servicios CASCADE;

-- ============================================================
-- 1. TABLA: equipos
-- ============================================================
CREATE TABLE public.equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  unidades TEXT NOT NULL DEFAULT '',
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  ganancia_flag BOOLEAN DEFAULT false,
  instalacion_flag BOOLEAN DEFAULT false,
  ultima_act TEXT,
  proveedor TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read equipos" ON public.equipos FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage equipos" ON public.equipos FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_equipos_categoria ON public.equipos(categoria);
CREATE INDEX IF NOT EXISTS idx_equipos_subcategoria ON public.equipos(subcategoria);
CREATE INDEX IF NOT EXISTS idx_equipos_source_id ON public.equipos(source_id);

-- ============================================================
-- 2. TABLA: materiales
-- ============================================================
CREATE TABLE public.materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  unidades TEXT NOT NULL DEFAULT '',
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  ganancia_flag BOOLEAN DEFAULT false,
  instalacion_flag BOOLEAN DEFAULT false,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read materiales" ON public.materiales FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage materiales" ON public.materiales FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON public.materiales(categoria);
CREATE INDEX IF NOT EXISTS idx_materiales_subcategoria ON public.materiales(subcategoria);
CREATE INDEX IF NOT EXISTS idx_materiales_source_id ON public.materiales(source_id);

-- ============================================================
-- 3. TABLA: servicios
-- ============================================================
CREATE TABLE public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  servicio TEXT NOT NULL DEFAULT '',
  descripcion TEXT DEFAULT '',
  costo_mensual NUMERIC(15,4) DEFAULT 0,
  costo_anual NUMERIC(15,4) DEFAULT 0,
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read servicios" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage servicios" ON public.servicios FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON public.servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_subcategoria ON public.servicios(subcategoria);
CREATE INDEX IF NOT EXISTS idx_servicios_source_id ON public.servicios(source_id);

-- ============================================================
-- 4. Verificar
-- ============================================================
SELECT 'equipos' as tabla, column_name, data_type
FROM information_schema.columns WHERE table_name = 'equipos' AND table_schema = 'public'
UNION ALL
SELECT 'materiales', column_name, data_type
FROM information_schema.columns WHERE table_name = 'materiales' AND table_schema = 'public'
UNION ALL
SELECT 'servicios', column_name, data_type
FROM information_schema.columns WHERE table_name = 'servicios' AND table_schema = 'public'
ORDER BY tabla, column_name;
