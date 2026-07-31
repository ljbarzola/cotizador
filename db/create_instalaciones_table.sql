-- Tabla de servicios de instalación (sincronizada desde hoja "INSTALACIÓN BD" del Google Sheet)
CREATE TABLE public.instalaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE,
  categoria TEXT NOT NULL DEFAULT 'INSTALACIONES',
  subcategoria TEXT NOT NULL DEFAULT '',
  servicio TEXT NOT NULL DEFAULT '',
  costo_unitario NUMERIC(15,4) DEFAULT 0,
  observaciones TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.instalaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read instalaciones" ON public.instalaciones FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage instalaciones" ON public.instalaciones FOR ALL USING (auth.role() = 'authenticated');

-- Limpiar datos viejos de instalaciones en cotizaciones guardadas (reset installActive/techCost)
UPDATE public.saved_quotes
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN item ? 'isInstallService' THEN item
      ELSE item - 'installActive' - 'techCost' || '{"installActive": false, "techCost": 0}'::jsonb
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL AND jsonb_array_length(items) > 0;
