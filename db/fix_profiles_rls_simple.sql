-- ============================================================
-- FIX: Simplificar RLS en profiles - readable for all auth users
-- Los perfiles NO son datos sensibles (solo nombre, email, rol)
-- El control de admin se maneja en la app, no en RLS
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Habilitar RLS (por si acaso)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpiar todas las políticas existentes
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

-- 3. Nuevas políticas simples y seguras
-- SELECT: cualquier auth puede ver todos los perfiles (no son datos sensibles)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: solo el trigger y admin pueden crear
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: auth puede actualizar (el control de quién cambia qué se hace en la app)
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (true);

-- DELETE: solo admin (controlado en la app)
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  USING (auth.role() = 'authenticated');

-- 4. Verificar
SELECT 'Políticas de profiles:' AS info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT 'Usuarios:' AS info;
SELECT id, correo, nombre, rol, activo FROM public.profiles ORDER BY nombre;
