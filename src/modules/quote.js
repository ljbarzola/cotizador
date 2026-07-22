const STORAGE_KEY = 'quote_templates';

/* ─── Sample Templates (3 with real sourceIds from catalog) ─── */
function getSampleTemplates() {
  return [
    {
      id: 'tpl-small-retail',
      name: 'Comercio Pequeño - Alarma Básica',
      description: 'Sistema de alarma para tiendas y comercios pequeños. Incluye panel central, sensores de puerta y movimiento.',
      clientType: 'pequeña',
      industry: 'comercio',
      client: {
        name: 'Mini Market San José',
        ruc: '0992345678001',
        address: 'Av. 25 de Julio Mz. 15 Lt. 8, Guayaquil',
        contact: 'María López - Propietaria',
        phone: '0991234567',
        email: 'minimarket.sanjose@email.com',
      },
      items: [
        { sourceId: 'DS-2CE70DF0T-MFS', qty: 4, installActive: true, techCost: 15 },
        { sourceId: 'DS-2CE10DF0T-FS', qty: 2, installActive: true, techCost: 15 },
        { sourceId: 'DS-2CE76U1T-ITPF', qty: 1, installActive: false, techCost: 0 },
        { sourceId: 'SV-0005', qty: 1, installActive: false, techCost: 0 },
      ],
      supplierMargins: {},
      installMargin: 35,
      installationEnabled: true,
      isTemplate: true,
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z',
    },
    {
      id: 'tpl-medium-office',
      name: 'Oficina Mediana - Cámaras + Alarma',
      description: 'Solución de seguridad para oficinas con cámaras Hikvision, DVR y sistema de alarma.',
      clientType: 'mediana',
      industry: 'oficina',
      client: {
        name: 'Constructora Horizonte S.A.',
        ruc: '1790123456001',
        address: 'Av. Amazonas N36-52 y Naciones Unidas, Quito',
        contact: 'Carlos Mendoza - Jefe de Seguridad',
        phone: '022345678',
        email: 'cmendoza@horizonte.com',
      },
      items: [
        { sourceId: 'DS-2CE70DF0T-MFS', qty: 4, installActive: true, techCost: 15 },
        { sourceId: 'DS-2CE10DF0T-FS', qty: 4, installActive: true, techCost: 15 },
        { sourceId: 'DS-2CE16K0T-EXLF', qty: 2, installActive: true, techCost: 15 },
        { sourceId: 'EQ-0157', qty: 1, installActive: true, techCost: 30 },
        { sourceId: 'EQ-0160', qty: 1, installActive: false, techCost: 0 },
        { sourceId: 'MT-0001', qty: 2, installActive: false, techCost: 0 },
        { sourceId: 'SV-0005', qty: 1, installActive: false, techCost: 0 },
      ],
      supplierMargins: {},
      installMargin: 35,
      installationEnabled: true,
      isTemplate: true,
      createdAt: '2025-02-10T14:30:00Z',
      updatedAt: '2025-02-10T14:30:00Z',
    },
    {
      id: 'tpl-large-bank',
      name: 'Banco - Sistema Integral de Seguridad',
      description: 'Solución completa para sucursales bancarias: cámaras IP, control de acceso y alarma perimetral.',
      clientType: 'grande',
      industry: 'banco',
      client: {
        name: 'Banco Pacífico S.A.',
        ruc: '1790045678001',
        address: 'Av. 9 de Octubre 1225 y Larga, Guayaquil',
        contact: 'Ing. Roberto Dávila - Gerente de Operaciones',
        phone: '042345678',
        email: 'rdavila@bancopacifico.com',
      },
      items: [
        { sourceId: 'DS-2CE76U1T-ITPF', qty: 8, installActive: true, techCost: 20 },
        { sourceId: 'DS-2CE12KF3TP-DLS', qty: 4, installActive: true, techCost: 20 },
        { sourceId: 'DS-2CE72DF0T-F', qty: 6, installActive: true, techCost: 15 },
        { sourceId: 'DS-2CE10DF0T-FS', qty: 4, installActive: true, techCost: 15 },
        { sourceId: 'EQ-0358', qty: 1, installActive: true, techCost: 50 },
        { sourceId: 'EQ-0160', qty: 2, installActive: false, techCost: 0 },
        { sourceId: 'MT-0001', qty: 3, installActive: false, techCost: 0 },
        { sourceId: 'MT-0002', qty: 2, installActive: false, techCost: 0 },
        { sourceId: 'SV-0005', qty: 1, installActive: false, techCost: 0 },
      ],
      supplierMargins: {},
      installMargin: 35,
      installationEnabled: true,
      isTemplate: true,
      createdAt: '2025-03-05T09:15:00Z',
      updatedAt: '2025-03-05T09:15:00Z',
    },
  ];
}

/* ─── localStorage CRUD ─── */
function getAllTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const samples = getSampleTemplates();
    const sampleIds = new Set(samples.map(t => t.id));
    const custom = stored.filter(t => !sampleIds.has(t.id));
    return [...samples, ...custom];
  } catch {
    return getSampleTemplates();
  }
}

function getTemplate(id) {
  return getAllTemplates().find(t => t.id === id) || null;
}

function saveTemplate(tpl) {
  const all = getAllTemplates();
  const idx = all.findIndex(t => t.id === tpl.id);
  tpl.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = tpl;
  } else {
    tpl.id = tpl.id || 'tpl-' + Date.now();
    tpl.createdAt = tpl.createdAt || tpl.updatedAt;
    all.push(tpl);
  }
  const samples = getSampleTemplates();
  const sampleIds = new Set(samples.map(t => t.id));
  const toStore = all.filter(t => !sampleIds.has(t.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return tpl;
}

function deleteTemplate(id) {
  const all = getAllTemplates();
  const filtered = all.filter(t => t.id !== id);
  const samples = getSampleTemplates();
  const sampleIds = new Set(samples.map(t => t.id));
  const toStore = filtered.filter(t => !sampleIds.has(t.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  return true;
}

/* ─── Convert template items → cart items (resolve sourceId → catalogIdx) ─── */
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

/* ─── Export to window ─── */
function initQuote() {
  window.getAllTemplates = getAllTemplates;
  window.getTemplate = getTemplate;
  window.saveTemplate = saveTemplate;
  window.deleteTemplate = deleteTemplate;
  window.resolveTemplateItems = resolveTemplateItems;
  window.getSampleTemplates = getSampleTemplates;
}

export { initQuote, getAllTemplates, getTemplate, saveTemplate, deleteTemplate, resolveTemplateItems, getSampleTemplates };
