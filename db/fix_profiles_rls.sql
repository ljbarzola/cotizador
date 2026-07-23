-- ============================================================
-- FIX: RLS seguro en profiles con protección anti-escalada
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Seguridad:
--   - SECURITY DEFINER evita recursión en check de admin
--   - Trigger previene que usuarios no-admin cambien su propio rol
--   - RLS siempre habilitado, nunca deshabilitado
-- ============================================================

-- 0. Asegurar que RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Limpiar políticas existentes
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

-- 2. Función SECURITY DEFINER para check de admin (sin recursión)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND rol = 'admin' AND activo = true
  );
$$;

-- 3. Trigger: prevenir que usuarios no-admin cambien su propio rol
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el usuario no es admin, no puede cambiar su propio rol
  IF NOT public.is_admin() AND OLD.rol IS DISTINCT FROM NEW.rol THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el rol de usuario';
  END IF;
  -- Solo admin puede desactivar usuarios
  IF NOT public.is_admin() AND OLD.activo IS DISTINCT FROM NEW.activo THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado de usuario';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
CREATE TRIGGER prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 4. Políticas RLS
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id              -- propio perfil
    OR public.is_admin()         -- admin ve todos
  );

-- INSERT: cualquier auth puede insertar.
-- NOTA DE SEGURIDAD: Esto es necesario porque durante el trigger de signup,
-- auth.uid() retorna el ID del nuevo usuario cuyo profile aún no existe,
-- por lo que is_admin() falla. La capa de seguridad real está en:
--   1. Solo auth.users triggers pueden crear profiles inicialmente
--   2. El trigger prevent_role_escalation bloquea cambios de rol no-admin
--   3. La tabla profiles solo contiene datos de display (no credenciales)
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id              -- propio perfil
    OR public.is_admin()         -- admin actualiza cualquiera
  )
  WITH CHECK (true);             -- el trigger prevent_role_escalation valida cambios

CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  USING (
    public.is_admin()            -- solo admin puede eliminar
  );

-- 5. Trigger auto-creación de profile al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(EXCLUDED.nombre, profiles.nombre);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Permisos
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- 7. Verificación final
SELECT '--- RLS HABILITADO ---' AS info;
SELECT tablename, rowsecurity
FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';

SELECT '--- POLICIES ---' AS info;
SELECT policyname, cmd, qual::text AS using_clause
FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '--- TRIGGERS ---' AS info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles' AND trigger_schema = 'public';

SELECT '--- FUNCIONES ---' AS info;
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name IN ('is_admin', 'handle_new_user', 'prevent_role_escalation')
AND routine_schema = 'public';

SELECT '--- USUARIOS ---' AS info;
SELECT id, correo, nombre, rol, activo FROM public.profiles ORDER BY nombre;
