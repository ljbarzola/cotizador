-- MIGRACION v3.1: Fix tipos de columna
-- Primero DROP view, luego ALTER, luego recrear view

-- 0. Borrar vista que depende de ultima_act
DROP VIEW IF EXISTS public.all_products;

-- 1. EQUIPOS
ALTER TABLE public.equipos
  ALTER COLUMN ultima_act TYPE TEXT,
  ALTER COLUMN costo_unitario TYPE NUMERIC(15,4),
  ALTER COLUMN ganancia TYPE NUMERIC(15,4),
  ALTER COLUMN precio_con_ganancia TYPE NUMERIC(15,4),
  ALTER COLUMN iva TYPE NUMERIC(15,4),
  ALTER COLUMN total TYPE NUMERIC(15,4);

-- 2. MATERIALES
ALTER TABLE public.materiales
  ALTER COLUMN costo_unitario TYPE NUMERIC(15,4),
  ALTER COLUMN ganancia TYPE NUMERIC(15,4),
  ALTER COLUMN precio_con_ganancia TYPE NUMERIC(15,4),
  ALTER COLUMN iva TYPE NUMERIC(15,4),
  ALTER COLUMN total_unitario TYPE NUMERIC(15,4),
  ALTER COLUMN total TYPE NUMERIC(15,4);

-- 3. SERVICIOS
ALTER TABLE public.servicios
  ALTER COLUMN costo_mensual TYPE NUMERIC(15,4),
  ALTER COLUMN costo_anual TYPE NUMERIC(15,4),
  ALTER COLUMN iva TYPE NUMERIC(15,4),
  ALTER COLUMN total TYPE NUMERIC(15,4);

-- 4. Recrear vista
CREATE OR REPLACE VIEW public.all_products AS
SELECT
  'equipo' AS tipo, source_id, categoria AS category, subcategoria AS subcategory,
  modelo AS model, producto AS description, unidades AS unit,
  costo_unitario AS cost, precio_con_ganancia AS sale_price, total,
  proveedor AS supplier, ultima_act AS last_update, observaciones AS observations
FROM public.equipos
UNION ALL
SELECT
  'material' AS tipo, source_id, categoria AS category, subcategoria AS subcategory,
  '' AS model, producto AS description, unidades AS unit,
  costo_unitario AS cost, precio_con_ganancia AS sale_price, total,
  '' AS supplier, NULL AS last_update, observaciones AS observations
FROM public.materiales
UNION ALL
SELECT
  'servicio' AS tipo, source_id, categoria AS category, subcategoria AS subcategory,
  '' AS model, servicio AS description, 'servicio' AS unit,
  costo_mensual AS cost, costo_mensual AS sale_price, total,
  '' AS supplier, NULL AS last_update, descripcion AS observations
FROM public.servicios;
