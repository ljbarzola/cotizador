-- 1. Tabla saved_quotes
CREATE TABLE IF NOT EXISTS public.saved_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cot_num TEXT,
  cot_date DATE,
  client JSONB DEFAULT '{}',
  margin NUMERIC DEFAULT 35,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'borrador',
  saved_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT saved_quotes_status_check CHECK (status IN ('borrador','enviada','vista','aceptada','rechazada','vencida'))
);

-- 2. RLS
ALTER TABLE public.saved_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quotes"
  ON public.saved_quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all quotes"
  ON public.saved_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Users insert own quotes"
  ON public.saved_quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own quotes"
  ON public.saved_quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin updates all quotes"
  ON public.saved_quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Users delete own quotes"
  ON public.saved_quotes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_saved_quotes_user ON public.saved_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_cot_num ON public.saved_quotes(cot_num);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_status ON public.saved_quotes(status);
