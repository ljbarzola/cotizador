-- Migración v2: Optimización del esquema de products
-- Agrega: subcategory, model, monthly_cost, annual_cost, observations
-- Fuente de datos: Google Sheet (3 hojas: EQUIPOS, MATERIALES, SERVICIOS)

-- 1. Agregar columnas faltantes
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS annual_cost NUMERIC(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'equipment';

-- 2. Constraint único en source_id para upserts
ALTER TABLE public.products ADD CONSTRAINT products_source_id_unique UNIQUE (source_id);

-- 3. Índices para filtros de categoría y subcategoría
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON public.products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

-- 4. Vista jerárquica categoría → subcategorías (para filtros en cascada)
CREATE OR REPLACE VIEW public.category_hierarchy AS
SELECT
  category,
  subcategory,
  product_type,
  COUNT(*) as product_count
FROM public.products
WHERE category IS NOT NULL
GROUP BY category, subcategory, product_type
ORDER BY category, subcategory;

-- 5. Comentarios en columnas
COMMENT ON COLUMN public.products.subcategory IS 'Subcategoría del producto (ej: Cámaras análogas, Monitoreo)';
COMMENT ON COLUMN public.products.model IS 'Modelo del equipo (solo equipos)';
COMMENT ON COLUMN public.products.monthly_cost IS 'Costo mensual del servicio (solo servicios)';
COMMENT ON COLUMN public.products.annual_cost IS 'Costo anual del servicio (solo servicios)';
COMMENT ON COLUMN public.products.observations NOT NULL IS 'Observaciones adicionales';
COMMENT ON COLUMN public.products.source_id IS 'ID único de la hoja de cálculo (EQ-0001, MT-0001, SV-0001)';
COMMENT ON COLUMN public.products.product_type IS 'Tipo: equipment, material, service';
