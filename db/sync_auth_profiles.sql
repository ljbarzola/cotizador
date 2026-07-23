-- ============================================================
-- FIX: Sincronizar auth.users → profiles
-- Los usuarios creados con el trigger roto no tienen perfil
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Verificar qué usuarios de auth NO tienen perfil
SELECT '--- USUARIOS SIN PERFIL ---' AS info;
SELECT au.id, au.email, au.raw_user_meta_data->>'nombre' AS nombre_meta,
       au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 2. Insertar perfiles faltantes
INSERT INTO public.profiles (id, email, nombre, rol, activo)
SELECT
  au.id,
  au.email,
  COALESCE(NULLIF(au.raw_user_meta_data->>'nombre', ''), split_part(au.email, '@', 1)),
  COALESCE(NULLIF(au.raw_user_meta_data->>'rol', ''), 'vendedor'),
  true
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Verificar resultado
SELECT '--- TODOS LOS PERFILES ---' AS info;
SELECT id, email, nombre, rol, activo FROM public.profiles ORDER BY nombre;

SELECT '--- CONTEO ---' AS info;
SELECT
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles;
