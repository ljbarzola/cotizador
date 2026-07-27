-- Tabla de kits compartidos entre usuarios
CREATE TABLE IF NOT EXISTS public.kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  components JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read kits" ON public.kits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert kits" ON public.kits FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update kits" ON public.kits FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can delete kits" ON public.kits FOR DELETE USING (auth.role() = 'authenticated');
