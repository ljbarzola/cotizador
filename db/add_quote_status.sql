-- Agregar columna status a saved_quotes
ALTER TABLE public.saved_quotes
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'borrador';

-- Comentarios de referencia:
-- Estados: borrador | enviada | vista | aceptada | rechazada | vencida

-- Actualizar cotizaciones existentes sin status
UPDATE public.saved_quotes SET status = 'borrador' WHERE status IS NULL;

-- Constraint para valores validos
DO $$ BEGIN
  ALTER TABLE public.saved_quotes
    ADD CONSTRAINT saved_quotes_status_check
    CHECK (status IN ('borrador','enviada','vista','aceptada','rechazada','vencida'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index para filtros
CREATE INDEX IF NOT EXISTS idx_saved_quotes_status ON public.saved_quotes(status);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_user_status ON public.saved_quotes(user_id, status);

-- Vista para admin: ver todas las cotizaciones con info del usuario
CREATE OR REPLACE VIEW public.all_quotes AS
SELECT
  sq.*,
  au.email AS user_email,
  p.nombre AS vendor_name,
  p.rol AS vendor_role
FROM public.saved_quotes sq
JOIN auth.users au ON sq.user_id = au.id
LEFT JOIN public.profiles p ON sq.user_id = p.id;

-- RLS para la vista (admin ve todo, vendedor solo lo suyo)
-- La vista hereda RLS de saved_quotes, pero necesitamos policy adicional para admin
DROP POLICY IF EXISTS "Admin reads all quotes" ON public.saved_quotes;
CREATE POLICY "Admin reads all quotes"
  ON public.saved_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );
