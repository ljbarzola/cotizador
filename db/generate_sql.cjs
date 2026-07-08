const fs = require('fs');
const path = require('path');

const c = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
const m = c.match(/const CATALOG = (\[[\s\S]*?\]);/);
const arr = JSON.parse(m[1]);

let sql = `-- 1. Tabla products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  cost NUMERIC(10,2) DEFAULT 0,
  pvp35 NUMERIC(10,2) DEFAULT 0,
  pvp15 NUMERIC(10,2) DEFAULT 0,
  last_update DATE,
  days_old INTEGER,
  supplier TEXT DEFAULT '',
  is_service BOOLEAN DEFAULT false,
  unit TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 4. Insertar catalogo (${arr.length} items)\n`;

arr.forEach(item => {
  const esc = s => (s || '').replace(/'/g, "''");
  const code = esc(item.code);
  const cat = esc(item.category);
  const desc = esc(item.description);
  const cost = item.cost || 0;
  const p35 = item.pvp35 || 0;
  const p15 = item.pvp15 || 0;
  const lu = item.lastUpdate ? `'${item.lastUpdate}'` : 'NULL';
  const doo = item.daysOld != null ? item.daysOld : 'NULL';
  const sup = esc(item.supplier);
  const isS = item.isService ? 'true' : 'false';
  const unit = esc(item.unit || '');

  sql += `INSERT INTO public.products (code,category,description,cost,pvp35,pvp15,last_update,days_old,supplier,is_service,unit) VALUES ('${code}','${cat}','${desc}',${cost},${p35},${p15},${lu},${doo},'${sup}',${isS},'${unit}') ON CONFLICT DO NOTHING;\n`;
});

fs.writeFileSync(path.join(__dirname, 'migrate_catalog.sql'), sql, 'utf8');
console.log('Created migrate_catalog.sql with', arr.length, 'items');
