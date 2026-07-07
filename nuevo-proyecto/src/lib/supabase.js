import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
    'Crea un archivo .env en la raíz del proyecto nuevo-proyecto/ con:\n' +
    'VITE_SUPABASE_URL=tu_url\n' +
    'VITE_SUPABASE_ANON_KEY=tu_clave'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
