-- ============================================================
-- MIGRACIÓN v3: 3 tablas separadas que reflejan el Google Sheet
-- PRECIOS EQUIPOS BD | PRECIOS MATERIALES BD | PRECIOS SERVICIOS BD
-- ============================================================

-- 0. Eliminar tabla vieja y vista
DROP VIEW IF EXISTS public.all_products CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- ============================================================
-- 1. TABLA: equipos
-- Fuente: PRECIOS EQUIPOS BD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  unidades TEXT NOT NULL DEFAULT '',
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  pct_ganancia NUMERIC(6,4) DEFAULT 0,
  ganancia NUMERIC(15,4) DEFAULT 0,
  precio_con_ganancia NUMERIC(15,4) DEFAULT 0,
  pct_iva NUMERIC(6,4) DEFAULT 0,
  iva NUMERIC(15,4) DEFAULT 0,
  total NUMERIC(15,4) DEFAULT 0,
  ultima_act TEXT,
  proveedor TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read equipos" ON public.equipos;
DROP POLICY IF EXISTS "Authenticated can manage equipos" ON public.equipos;
CREATE POLICY "Anyone can read equipos" ON public.equipos FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage equipos" ON public.equipos FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_equipos_categoria ON public.equipos(categoria);
CREATE INDEX IF NOT EXISTS idx_equipos_subcategoria ON public.equipos(subcategoria);
CREATE INDEX IF NOT EXISTS idx_equipos_source_id ON public.equipos(source_id);

-- ============================================================
-- 2. TABLA: materiales
-- Fuente: PRECIOS MATERIALES BD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  producto TEXT NOT NULL DEFAULT '',
  unidades TEXT NOT NULL DEFAULT '',
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  pct_ganancia NUMERIC(6,4) DEFAULT 0,
  ganancia NUMERIC(15,4) DEFAULT 0,
  precio_con_ganancia NUMERIC(15,4) DEFAULT 0,
  pct_iva NUMERIC(6,4) DEFAULT 0,
  iva NUMERIC(15,4) DEFAULT 0,
  total_unitario NUMERIC(15,4) DEFAULT 0,
  total NUMERIC(15,4) DEFAULT 0,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read materiales" ON public.materiales;
DROP POLICY IF EXISTS "Authenticated can manage materiales" ON public.materiales;
CREATE POLICY "Anyone can read materiales" ON public.materiales FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage materiales" ON public.materiales FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON public.materiales(categoria);
CREATE INDEX IF NOT EXISTS idx_materiales_subcategoria ON public.materiales(subcategoria);
CREATE INDEX IF NOT EXISTS idx_materiales_source_id ON public.materiales(source_id);

-- ============================================================
-- 3. TABLA: servicios
-- Fuente: PRECIOS SERVICIOS BD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT '',
  subcategoria TEXT NOT NULL DEFAULT '',
  servicio TEXT NOT NULL DEFAULT '',
  descripcion TEXT DEFAULT '',
  costo_mensual NUMERIC(15,4) DEFAULT 0,
  costo_anual NUMERIC(15,4) DEFAULT 0,
  pct_iva NUMERIC(6,4) DEFAULT 0,
  iva NUMERIC(15,4) DEFAULT 0,
  total NUMERIC(15,4) DEFAULT 0,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read servicios" ON public.servicios;
DROP POLICY IF EXISTS "Authenticated can manage servicios" ON public.servicios;
CREATE POLICY "Anyone can read servicios" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage servicios" ON public.servicios FOR ALL USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_servicios_categoria ON public.servicios(categoria);
CREATE INDEX IF NOT EXISTS idx_servicios_subcategoria ON public.servicios(subcategoria);
CREATE INDEX IF NOT EXISTS idx_servicios_source_id ON public.servicios(source_id);

-- ============================================================
-- 4. Vista unificada para consulta (no para escritura)
-- ============================================================
CREATE OR REPLACE VIEW public.all_products AS
SELECT
  'equipo' AS tipo,
  source_id,
  categoria AS category,
  subcategoria AS subcategory,
  modelo AS model,
  producto AS description,
  unidades AS unit,
  costo_unitario AS cost,
  precio_con_ganancia AS sale_price,
  total,
  proveedor AS supplier,
  ultima_act::text AS last_update,
  observaciones AS observations
FROM public.equipos
UNION ALL
SELECT
  'material' AS tipo,
  source_id,
  categoria AS category,
  subcategoria AS subcategory,
  '' AS model,
  producto AS description,
  unidades AS unit,
  costo_unitario AS cost,
  precio_con_ganancia AS sale_price,
  total,
  '' AS supplier,
  NULL AS last_update,
  observaciones AS observations
FROM public.materiales
UNION ALL
SELECT
  'servicio' AS tipo,
  source_id,
  categoria AS category,
  subcategoria AS subcategory,
  '' AS model,
  servicio AS description,
  'servicio' AS unit,
  costo_mensual AS cost,
  costo_mensual AS sale_price,
  total,
  '' AS supplier,
  NULL AS last_update,
  descripcion AS observations
FROM public.servicios;
