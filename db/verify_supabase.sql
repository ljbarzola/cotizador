-- ============================================================
-- VERIFICACION COMPLETA DE SUPABASE
-- Ejecutar este archivo en el SQL Editor de Supabase
-- para verificar que toda la estructura esta correcta.
-- ============================================================

-- 1. VERIFICAR TABLA profiles
SELECT '--- TABLA profiles ---' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. VERIFICAR TABLA products
SELECT '--- TABLA products ---' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 3. VERIFICAR TABLA saved_quotes
SELECT '--- TABLA saved_quotes ---' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'saved_quotes'
ORDER BY ordinal_position;

-- 4. VERIFICAR RLS HABILITADO
SELECT '--- RLS STATUS ---' AS info;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'saved_quotes');

-- 5. VERIFICAR POLITICAS RLS
SELECT '--- POLITICAS RLS ---' AS info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'saved_quotes')
ORDER BY tablename, policyname;

-- 6. VERIFICAR TRIGGER auto-create profile
SELECT '--- TRIGGERS ---' AS info;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 7. VERIFICAR FUNCION handle_new_user
SELECT '--- FUNCION handle_new_user ---' AS info;
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- 8. CONTAR PRODUCTOS
SELECT '--- CONTEO DE PRODUCTOS ---' AS info;
SELECT COUNT(*) AS total_productos FROM products;

-- 9. VERIFICAR CATEGORIAS DE PRODUCTOS
SELECT '--- CATEGORIAS ---' AS info;
SELECT category, COUNT(*) AS cantidad
FROM products
GROUP BY category
ORDER BY category;

-- 10. VERIFICAR USUARIOS REGISTRADOS
SELECT '--- USUARIOS EN profiles ---' AS info;
SELECT id, email, nombre, rol FROM profiles;

-- 11. VERIFICAR COTIZACIONES GUARDADAS
SELECT '--- COTIZACIONES ---' AS info;
SELECT COUNT(*) AS total_cotizaciones FROM saved_quotes;

-- 12. VERIFICAR ESTADOS DE COTIZACION
SELECT '--- ESTADOS USADOS ---' AS info;
SELECT status, COUNT(*) AS cantidad
FROM saved_quotes
GROUP BY status;

-- 13. VERIFICAR COLUMNAS CRITICAS DE saved_quotes
SELECT '--- COLUMNAS saved_quotes ---' AS info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'saved_quotes'
AND column_name IN ('status', 'client', 'items', 'margin', 'user_id');

-- ============================================================
-- SI TODO ESTA BIEN, DEBERIAS VER:
-- - 3 tablas (profiles, products, saved_quotes) con RLS habilitado
-- - Politicas RLS para cada tabla
-- - Trigger en auth.users para auto-crear profiles
-- - Funcion handle_new_user
-- - ~400 productos en products
-- - 2 usuarios en profiles (admin + vendedor)
-- - Cotizaciones en saved_quotes (si ya guardaste alguna)
-- ============================================================
