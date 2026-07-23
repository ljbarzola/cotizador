-- ============================================================
-- FIX: Simplificar RLS en profiles para que admin vea todos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Simplemente deshabilitar RLS en profiles
-- (los perfiles no son datos sensibles, y el control de acceso lo hacemos en la app)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 'RLS profiles:' AS info,
  CASE WHEN rowsecurity THEN 'HABILITADO (problema!)' ELSE 'DESHABILITADO (correcto)' END AS estado
FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';

SELECT 'Usuarios en profiles:' AS info;
SELECT id, email, nombre, rol, activo FROM public.profiles ORDER BY nombre;
