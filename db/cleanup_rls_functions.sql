-- ============================================================
-- CLEANUP: Eliminar funciones de RLS que ya no se necesitan
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar funciones que causaban problemas
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.get_user_role();

-- Verificar que solo quedan las funciones necesarias
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
