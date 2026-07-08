const fs = require('fs');
const c = fs.readFileSync('src/app.js', 'utf8');
const lines = c.split('\n');
const rest = lines.slice(5).join('\n');

const header = `import { doLogin, validateSession, logout } from './modules/auth.js';
import supabase from './lib/supabase.js';

// === CATÁLOGO === (cargado desde Supabase, con fallback en localStorage)
const CATALOG = [];

async function loadCatalogFromDB() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category');
    if (error) throw error;
    if (data && data.length > 0) {
      CATALOG.length = 0;
      data.forEach(row => {
        CATALOG.push({
          code: row.code || '',
          category: row.category,
          description: row.description,
          cost: row.cost || 0,
          pvp35: row.pvp35 || 0,
          pvp15: row.pvp15 || 0,
          lastUpdate: row.last_update || null,
          daysOld: row.days_old,
          supplier: row.supplier || '',
          isService: row.is_service || false,
          unit: row.unit || '',
        });
      });
      return true;
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo desde DB:', e.message);
  }
  return false;
}

`;

fs.writeFileSync('src/app.js', header + rest, 'utf8');
console.log('File rewritten OK. Lines:', (header + rest).split('\n').length);
