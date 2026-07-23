-- ============================================================
-- VERIFY: Check trigger status
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. ¿Existe el trigger?
SELECT '--- TRIGGERS EN AUTH.USERS ---' AS info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table = 'users';

-- 2. ¿Existe la función?
SELECT '--- FUNCIÓN handle_new_user ---' AS info;
SELECT routine_name, security_type, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 3. ¿Qué usuarios de auth NO tienen perfil?
SELECT '--- AUTH SIN PERFIL ---' AS info;
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 4. Todos los profiles
SELECT '--- TODOS LOS PROFILES ---' AS info;
SELECT id, email, nombre, rol, activo FROM public.profiles ORDER BY nombre;
