import supabase from '../lib/supabase.js';

let _templatesCache = null;
let _templatesLoading = false;

/* ─── Load from Supabase ─── */
async function fetchTemplates() {
  if (_templatesLoading) return _templatesCache || [];
  _templatesLoading = true;
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
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
      installationEnabled: row.installation_enabled ?? false,
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
    installation_enabled: tpl.installationEnabled ?? false,
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

/* ─── Export ─── */
function initQuote() {
  window.getAllTemplates = getAllTemplates;
  window.getTemplate = getTemplate;
  window.saveTemplate = saveTemplate;
  window.deleteTemplate = deleteTemplate;
  window.resolveTemplateItems = resolveTemplateItems;
  window.refreshTemplates = () => { _templatesCache = null; return fetchTemplates(); };
}

export { initQuote, getAllTemplates, getTemplate, saveTemplate, deleteTemplate, resolveTemplateItems };
