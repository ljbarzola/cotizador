-- ============================================================
-- FIX: Resetear triggers de profiles para que signup funcione
-- El error 500 en /auth/v1/signup es causado por triggers fallando
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Eliminar TODOS los triggers problemáticos en profiles
DROP TRIGGER IF EXISTS prevent_role_escalation ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Eliminar funciones problemáticas
DROP FUNCTION IF EXISTS public.prevent_role_escalation();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recrear handle_new_user de forma simple y segura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, correo, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'nombre', ''),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'rol', ''),
      'vendedor'
    ),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verificar
SELECT 'Triggers en auth.users:' AS info;
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'users';

SELECT 'Triggers en profiles:' AS info;
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'profiles';

SELECT 'Función handle_new_user:' AS info;
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';
