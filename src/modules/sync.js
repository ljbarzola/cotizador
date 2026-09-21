import supabase from '../lib/supabase.js';

function num(v) {
  if (!v || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  if (isNaN(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

// ---- Lectura unificada ----
// Los precios se calculan en tiempo real en app.js, aquí solo leemos datos crudos

export function normalizeCategory(cat, table) {
  const c = String(cat || '')
    .trim()
    .toUpperCase();
  if (c.includes('EQUIPOS DE SEGURIDAD') || c.includes('EQUIPOS DE SEGURIDAD ELECTRONICA')) return 'EQUIPOS';
  if (c === 'EQUIPOS' || c === 'MATERIALES' || c === 'SERVICIOS') return c;

  if (table === 'equipos') return 'EQUIPOS';
  if (table === 'materiales') return 'MATERIALES';
  if (table === 'servicios' || table === 'instalaciones') return 'SERVICIOS';

  return 'EQUIPOS';
}

export async function loadAllProducts() {
  const catalog = [];
  const [eqRes, mtRes, svRes] = await Promise.all([
    supabase.from('equipos').select('*'),
    supabase.from('materiales').select('*'),
    supabase.from('servicios').select('*'),
  ]);

  if (eqRes.error) {
    console.error('Error leyendo equipos:', eqRes.error.message);
    toast('⚠️ Error leyendo equipos: ' + eqRes.error.message, 'warning');
  }
  if (mtRes.error) {
    console.error('Error leyendo materiales:', mtRes.error.message);
    toast('⚠️ Error leyendo materiales: ' + mtRes.error.message, 'warning');
  }
  if (svRes.error) {
    console.error('Error leyendo servicios:', svRes.error.message);
    toast('⚠️ Error leyendo servicios: ' + svRes.error.message, 'warning');
  }

  if (eqRes.data && eqRes.data.length > 0) {
    const legacyEq = eqRes.data.filter(r => r.categoria && r.categoria.toUpperCase().includes('EQUIPOS DE SEGURIDAD'));
    if (legacyEq.length > 0) {
      supabase
        .from('equipos')
        .update({ categoria: 'EQUIPOS' })
        .in(
          'id',
          legacyEq.map(r => r.id)
        )
        .then(() => {})
        .catch(() => {});
    }
    for (const r of eqRes.data) {
      catalog.push({
        _table: 'equipos',
        _id: r.id,
        sourceId: r.source_id || '',
        category: normalizeCategory(r.categoria, 'equipos'),
        subcategory: r.subcategoria || '',
        model: r.modelo || '',
        description: r.producto || r.servicio || r.nombre || '',
        unit: r.unidades || '',
        cantidadDefault: r.cantidad_default || 1,
        cost: r.costo_unitario || 0,
        costoTotal: r.costo_total || 0,
        hasGanancia: !!(r.ganancia_flag ?? r.ganancia ?? r.pct_ganancia > 0),
        hasInstalacion: !!(r.instalacion_flag ?? r.instalacion ?? r.pct_instalacion > 0),
        lastUpdate: r.ultima_act || null,
        supplier: r.proveedor || '',
        observations: r.observaciones || '',
        isService: false,
        monthlyCost: null,
        annualCost: null,
      });
    }
  }
  if (mtRes.data) {
    for (const r of mtRes.data) {
      catalog.push({
        _table: 'materiales',
        _id: r.id,
        sourceId: r.source_id || '',
        category: normalizeCategory(r.categoria, 'materiales'),
        subcategory: r.subcategoria || '',
        model: r.modelo || '',
        description: r.producto || r.servicio || r.nombre || '',
        descriptionExtended: '',
        unit: r.unidades || '',
        cantidadDefault: r.cantidad_default || 1,
        cost: r.costo_unitario || 0,
        costoTotal: r.costo_total || 0,
        hasGanancia: !!(r.ganancia_flag ?? r.ganancia ?? r.pct_ganancia > 0),
        hasInstalacion: !!(r.instalacion_flag ?? r.instalacion ?? r.pct_instalacion > 0),
        lastUpdate: null,
        supplier: '',
        observations: r.observaciones || '',
        isService: false,
        monthlyCost: null,
        annualCost: null,
      });
    }
  }
  if (svRes.data) {
    for (const r of svRes.data) {
      const mensual = num(r.costo_mensual);
      const anual = num(r.costo_anual);
      const unitario = num(r.costo_unitario);
      const effectiveCost =
        mensual > 0 ? mensual : anual > 0 ? Math.round((anual / 12) * 100) / 100 : unitario > 0 ? unitario : 0;
      catalog.push({
        _table: 'servicios',
        _id: r.id,
        sourceId: r.source_id || '',
        category: normalizeCategory(r.categoria, 'servicios'),
        subcategory: r.subcategoria || '',
        model: '',
        description: r.servicio || '',
        descriptionExtended: r.descripcion || '',
        unit: 'servicio',
        cost: effectiveCost,
        hasGanancia: false,
        hasInstalacion: false,
        lastUpdate: null,
        supplier: '',
        observations: r.observaciones || '',
        isService: true,
        monthlyCost: mensual,
        annualCost: anual,
      });
      if (effectiveCost === 0 && (mensual > 0 || anual > 0 || unitario > 0)) {
        toast('⚠️ Servicio ' + r.source_id + ' con costo inválido', 'warning');
      }
    }
  }

  catalog.sort((a, b) => {
    const sa = a.sourceId || '';
    const sb = b.sourceId || '';
    const prefixA = sa.replace(/\d+.*$/, '');
    const prefixB = sb.replace(/\d+.*$/, '');
    if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
    const numA = parseInt(sa.replace(/^\D+/, '')) || 0;
    const numB = parseInt(sb.replace(/^\D+/, '')) || 0;
    return numA - numB;
  });

  return catalog;
}

export function getCategoryHierarchy(catalog) {
  const map = {};
  for (const p of catalog) {
    const cat = p.category || '(sin categoría)';
    if (!map[cat]) map[cat] = { subcategories: new Set(), count: 0 };
    if (p.subcategory) map[cat].subcategories.add(p.subcategory);
    map[cat].count++;
  }
  const result = {};
  for (const [cat, info] of Object.entries(map)) {
    result[cat] = { subcategories: [...info.subcategories].sort(), count: info.count };
  }
  return result;
}

// ---- Installation services catalog ----

export async function loadAllInstalaciones() {
  const { data, error } = await supabase.from('instalaciones').select('*').order('servicio');
  if (error) throw error;

  // Filter out any header row saved in DB
  const validRows = (data || []).filter(r => {
    const s = String(r.servicio || '')
      .toLowerCase()
      .trim();
    return s !== 'servicio' && s !== 'instalacion' && s !== 'instalación' && s !== 'descripcion';
  });

  // Auto-migrate legacy installation category names in Supabase to 'SERVICIOS'
  const legacyInst = validRows.filter(
    r =>
      !['EQUIPOS', 'MATERIALES', 'SERVICIOS'].includes(
        String(r.categoria || '')
          .trim()
          .toUpperCase()
      )
  );
  if (legacyInst.length > 0) {
    supabase
      .from('instalaciones')
      .update({ categoria: 'SERVICIOS' })
      .in(
        'id',
        legacyInst.map(r => r.id)
      )
      .then(() => {})
      .catch(e => console.warn('[CATALOG] Error migrating legacy installations categories:', e.message));
  }

  return validRows.map(r => ({
    _id: r.id,
    id: r.id,
    sourceId: r.source_id || '',
    category: normalizeCategory(r.categoria, 'instalaciones'),
    subcategory: r.subcategoria || '',
    description: r.servicio || '',
    cost: num(r.costo_unitario),
    observations: r.observaciones || '',
  }));
}
