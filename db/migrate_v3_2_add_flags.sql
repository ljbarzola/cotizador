-- MIGRACION v3.2: Agregar columnas ganancia_flag e instalacion_flag
-- Estas columnas indican si el item aplica ganancia de proveedor o instalacion
-- El CSV tiene "Gan. Prov." y "Gan. Inst." con valores 1/0

-- 1. EQUIPOS: agregar flags
ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS ganancia_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalacion_flag BOOLEAN DEFAULT false;

-- 2. MATERIALES: agregar flags
ALTER TABLE public.materiales
  ADD COLUMN IF NOT EXISTS ganancia_flag BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instalacion_flag BOOLEAN DEFAULT false;

-- 3. SERVICIOS: agregar costo_unitario por si acaso (fallback)
ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(15,4) DEFAULT 0;

-- 4. Verificar columnas agregadas
SELECT 'equipos' as tabla, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'equipos' AND column_name IN ('ganancia_flag', 'instalacion_flag')
UNION ALL
SELECT 'materiales' as tabla, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'materiales' AND column_name IN ('ganancia_flag', 'instalacion_flag')
UNION ALL
SELECT 'servicios' as tabla, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'servicios' AND column_name = 'costo_unitario';
