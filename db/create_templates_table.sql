-- ============================================================
-- TABLA: templates - Plantillas compartidas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  client_type TEXT DEFAULT 'mediana',
  industry TEXT DEFAULT 'comercio',
  client JSONB DEFAULT '{}',
  items JSONB DEFAULT '[]',
  supplier_margins JSONB DEFAULT '{}',
  install_margin NUMERIC(5,2) DEFAULT 35,
  installation_enabled BOOLEAN DEFAULT false,
  is_sample BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- SELECT: todos los autenticados pueden ver todas las plantillas
CREATE POLICY "templates_select"
  ON public.templates FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: cualquier autenticado puede crear
CREATE POLICY "templates_insert"
  ON public.templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: solo el creador o admin pueden editar
CREATE POLICY "templates_update"
  ON public.templates FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (true);

-- DELETE: solo el creador o admin pueden eliminar
CREATE POLICY "templates_delete"
  ON public.templates FOR DELETE
  USING (auth.role() = 'authenticated');

-- Insertar las 3 plantillas de ejemplo
INSERT INTO public.templates (id, name, description, client_type, industry, client, items, supplier_margins, install_margin, installation_enabled, is_sample, created_by_name)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Comercio Pequeño - Alarma Básica', 'Sistema de alarma para tiendas y comercios pequeños. Incluye panel central, sensores de puerta y movimiento.', 'pequeña', 'comercio',
   '{"name":"Mini Market San José","ruc":"0992345678001","address":"Av. 25 de Julio Mz. 15 Lt. 8, Guayaquil","contact":"María López - Propietaria","phone":"0991234567","email":"minimarket.sanjose@email.com"}',
   '[{"sourceId":"DS-2CE70DF0T-MFS","qty":4,"installActive":true,"techCost":15},{"sourceId":"DS-2CE10DF0T-FS","qty":2,"installActive":true,"techCost":15},{"sourceId":"DS-2CE76U1T-ITPF","qty":1,"installActive":false,"techCost":0},{"sourceId":"SV-0005","qty":1,"installActive":false,"techCost":0}]',
   '{}', 35, true, true, 'Sistema'),

  ('550e8400-e29b-41d4-a716-446655440002', 'Oficina Mediana - Cámaras + Alarma', 'Solución de seguridad para oficinas con cámaras Hikvision, DVR y sistema de alarma.', 'mediana', 'oficina',
   '{"name":"Constructora Horizonte S.A.","ruc":"1790123456001","address":"Av. Amazonas N36-52 y Naciones Unidas, Quito","contact":"Carlos Mendoza - Jefe de Seguridad","phone":"022345678","email":"cmendoza@horizonte.com"}',
   '[{"sourceId":"DS-2CE70DF0T-MFS","qty":4,"installActive":true,"techCost":15},{"sourceId":"DS-2CE10DF0T-FS","qty":4,"installActive":true,"techCost":15},{"sourceId":"DS-2CE16K0T-EXLF","qty":2,"installActive":true,"techCost":15},{"sourceId":"EQ-0157","qty":1,"installActive":true,"techCost":30},{"sourceId":"EQ-0160","qty":1,"installActive":false,"techCost":0},{"sourceId":"MT-0001","qty":2,"installActive":false,"techCost":0},{"sourceId":"SV-0005","qty":1,"installActive":false,"techCost":0}]',
   '{}', 35, true, true, 'Sistema'),

  ('550e8400-e29b-41d4-a716-446655440003', 'Banco - Sistema Integral de Seguridad', 'Solución completa para sucursales bancarias: cámaras IP, control de acceso y alarma perimetral.', 'grande', 'banco',
   '{"name":"Banco Pacífico S.A.","ruc":"1790045678001","address":"Av. 9 de Octubre 1225 y Larga, Guayaquil","contact":"Ing. Roberto Dávila - Gerente de Operaciones","phone":"042345678","email":"rdavila@bancopacifico.com"}',
   '[{"sourceId":"DS-2CE76U1T-ITPF","qty":8,"installActive":true,"techCost":20},{"sourceId":"DS-2CE12KF3TP-DLS","qty":4,"installActive":true,"techCost":20},{"sourceId":"DS-2CE72DF0T-F","qty":6,"installActive":true,"techCost":15},{"sourceId":"DS-2CE10DF0T-FS","qty":4,"installActive":true,"techCost":15},{"sourceId":"EQ-0358","qty":1,"installActive":true,"techCost":50},{"sourceId":"EQ-0160","qty":2,"installActive":false,"techCost":0},{"sourceId":"MT-0001","qty":3,"installActive":false,"techCost":0},{"sourceId":"MT-0002","qty":2,"installActive":false,"techCost":0},{"sourceId":"SV-0005","qty":1,"installActive":false,"techCost":0}]',
   '{}', 35, true, true, 'Sistema')
ON CONFLICT (id) DO NOTHING;

-- Verificar
SELECT 'Templates creados:' AS info;
SELECT id, name, created_by_name, is_sample FROM public.templates ORDER BY name;
