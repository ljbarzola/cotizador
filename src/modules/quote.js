import supabase from '../lib/supabase.js';

let _templatesCache = null;
let _templatesLoading = false;

/* ─── Load from Supabase ─── */
async function fetchTemplates() {
  if (_templatesLoading) return _templatesCache || [];
  _templatesLoading = true;
  try {
    const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    _templatesCache = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      clientType: row.client_type || 'mediana',
      industry: row.industry || 'comercio',
      client: row.client || {},
      items: row.items || [],
      supplierMargins: row.supplier_margins || {},
      installMargin: row.install_margin ?? 35,
      isSample: row.is_sample ?? false,
      createdBy: row.created_by || null,
      createdByName: row.created_by_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (e) {
    console.warn('Error loading templates:', e.message);
    _templatesCache = [];
  }
  _templatesLoading = false;
  return _templatesCache || [];
}

/* ─── CRUD ─── */
async function getAllTemplates() {
  if (!_templatesCache) await fetchTemplates();
  return _templatesCache || [];
}

async function getTemplate(id) {
  const all = await getAllTemplates();
  return all.find(t => t.id === id) || null;
}

async function saveTemplate(tpl, session) {
  const now = new Date().toISOString();
  const payload = {
    name: tpl.name,
    description: tpl.description || '',
    client_type: tpl.clientType || 'mediana',
    industry: tpl.industry || 'comercio',
    client: tpl.client || {},
    items: tpl.items || [],
    supplier_margins: tpl.supplierMargins || {},
    install_margin: tpl.installMargin ?? 35,
    is_sample: tpl.isSample ?? false,
    updated_at: now,
  };

  if (tpl.id && !String(tpl.id).startsWith('tpl-')) {
    payload.id = tpl.id;
  }

  if (session) {
    payload.created_by = session.userId;
    payload.created_by_name = session.nombre || session.user || '';
  }

  if (tpl.id && !String(tpl.id).startsWith('tpl-')) {
    const { error } = await supabase.from('templates').update(payload).eq('id', tpl.id);
    if (error) throw error;
  } else {
    delete payload.id;
    if (!payload.created_by) delete payload.created_by;
    const { data, error } = await supabase.from('templates').insert(payload).select().single();
    if (error) throw error;
    tpl.id = data.id;
  }

  _templatesCache = null;
  return tpl;
}

async function deleteTemplate(id) {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw error;
  _templatesCache = null;
  return true;
}

/* ─── Convert template items → cart items ─── */
function resolveTemplateItems(templateItems, catalog) {
  const cart = [];
  const unmatched = [];
  for (const ti of templateItems) {
    const catIdx = catalog.findIndex(c => c.sourceId === ti.sourceId);
    if (catIdx >= 0) {
      cart.push({
        catalogIdx: catIdx,
        qty: ti.qty || 1,
        installActive: ti.installActive || false,
        techCost: ti.techCost || 0,
      });
    } else {
      unmatched.push(ti);
    }
  }
  return { cart, unmatched };
}

/* ─── Generate sample templates if none exist ─── */
async function generateDefaultTemplates(catalog) {
  const all = await getAllTemplates();
  if (all.length > 0 || !catalog || catalog.length === 0) return;

  function findItems(keywords, max) {
    const found = [];
    for (const item of catalog) {
      if (found.length >= max) break;
      const text = (
        (item.description || '') +
        ' ' +
        (item.sourceId || '') +
        ' ' +
        (item.category || '') +
        ' ' +
        (item.subcategory || '')
      ).toLowerCase();
      if (keywords.some(kw => text.includes(kw))) {
        found.push({ sourceId: item.sourceId, qty: 2, installActive: false, techCost: 0 });
      }
    }
    if (found.length < 2) {
      for (const item of catalog) {
        if (found.length >= max) break;
        if (!found.some(f => f.sourceId === item.sourceId)) {
          found.push({ sourceId: item.sourceId, qty: 2, installActive: false, techCost: 0 });
        }
      }
    }
    return found;
  }

  const sampleTemplates = [
    {
      name: 'Comercio Pequeño - Seguridad Básica',
      description: 'Cámaras de vigilancia, cable y grabación para tiendas y locales.',
      clientType: 'pequeña',
      industry: 'comercio',
      client: {
        name: 'Ejemplo Comercio S.A.',
        ruc: '0991234567001',
        address: 'Av. Principal y Secundaria',
        contact: 'Juan Pérez',
        phone: '0991234567',
        email: 'ejemplo@email.com',
      },
      items: findItems(['camara', 'cámara', 'cable', 'dvr', 'nvr', 'grabador', 'disco'], 4),
      supplierMargins: {},
      installMargin: 35,
      isSample: true,
    },
    {
      name: 'Oficina Mediana - Solución Integral',
      description: 'Cámaras IP, alarmas, control de acceso y cableado para oficinas.',
      clientType: 'mediana',
      industry: 'oficina',
      client: {
        name: 'Ejemplo Oficinas Corp.',
        ruc: '1790123456001',
        address: 'Av. Amazonas N36-52, Quito',
        contact: 'María García',
        phone: '022345678',
        email: 'oficina@ejemplo.com',
      },
      items: findItems(['camara', 'alarma', 'control de acceso', 'cable', 'nvr', 'dvr'], 6),
      supplierMargins: {},
      installMargin: 35,
      isSample: true,
    },
    {
      name: 'Banco - Seguridad Avanzada',
      description: 'Cámaras, alarmas, control de acceso, grabación y cableado para bancos.',
      clientType: 'grande',
      industry: 'banco',
      client: {
        name: 'Ejemplo Banco Nacional',
        ruc: '1790045678001',
        address: 'Av. 9 de Octubre 1225, Guayaquil',
        contact: 'Ing. Roberto Dávila',
        phone: '042345678',
        email: 'banco@ejemplo.com',
      },
      items: findItems(
        ['camara', 'alarma', 'control de acceso', 'cable', 'dvr', 'nvr', 'lector', 'sensor', 'grabador'],
        8
      ),
      supplierMargins: {},
      installMargin: 35,
      isSample: true,
    },
  ];

  for (const tpl of sampleTemplates) {
    try {
      await saveTemplate(tpl, null);
    } catch (e) {
      console.warn('Error creating sample template:', e.message);
    }
  }
  _templatesCache = null;
}

/* ─── Export ─── */
function initQuote() {
  window.getAllTemplates = getAllTemplates;
  window.getTemplate = getTemplate;
  window.saveTemplate = saveTemplate;
  window.deleteTemplate = deleteTemplate;
  window.resolveTemplateItems = resolveTemplateItems;
  window.generateDefaultTemplates = generateDefaultTemplates;
  window.refreshTemplates = () => {
    _templatesCache = null;
    return fetchTemplates();
  };
}

export {
  initQuote,
  getAllTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  resolveTemplateItems,
  generateDefaultTemplates,
};
