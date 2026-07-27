-- Migración: Agregar columnas Cant. y Costo a equipos y materiales
-- Fecha: 2026-07-27

-- Equipos: agregar cantidad_default y costo_total
ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS cantidad_default NUMERIC(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS costo_total NUMERIC(15,4) DEFAULT 0;

-- Materiales: agregar cantidad_default y costo_total
ALTER TABLE public.materiales
  ADD COLUMN IF NOT EXISTS cantidad_default NUMERIC(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS costo_total NUMERIC(15,4) DEFAULT 0;
