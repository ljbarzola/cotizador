import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let realClient = null;

// Lazy init: la validación ocurre recién al usar el cliente, no al importar
// el módulo. Así, archivos que importan (transitivamente) este módulo pero
// nunca llaman a Supabase -como tests de funciones puras- no explotan por
// falta de un .env.
function getClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables de entorno de Supabase. ' +
        'Crea un archivo .env en la raíz del proyecto nuevo-proyecto/ con:\n' +
        'VITE_SUPABASE_URL=tu_url\n' +
        'VITE_SUPABASE_ANON_KEY=tu_clave'
    );
  }
  if (!realClient) {
    realClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return realClient;
}

const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

export default supabase;
