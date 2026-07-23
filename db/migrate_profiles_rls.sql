-- ============================================================
-- MIGRATION: Fix profiles RLS + trigger for user management
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Asegurar que la tabla profiles tiene las columnas necesarias
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS correo TEXT;
UPDATE public.profiles SET correo = email WHERE correo IS NULL;

-- 2. Eliminar políticas RLS existentes en profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 3. Crear políticas RLS correctas
-- Cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin puede leer todos los perfiles (usando subquery para evitar recursión)
CREATE POLICY "Admin read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  );

-- Cualquier usuario autenticado puede insertar (para trigger y admin create)
CREATE POLICY "Authenticated insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admin puede actualizar cualquier perfil
CREATE POLICY "Admin update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin'
    )
  )
  WITH CHECK (true);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Asegurar que el trigger existe para auto-crear profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente y recrear
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar
SELECT 'Políticas RLS de profiles:' AS info;
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT 'Trigger on_auth_user_created:' AS info;
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

SELECT 'Usuarios en profiles:' AS info;
SELECT id, email, nombre, rol, activo FROM public.profiles;
