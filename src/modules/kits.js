// === KITS MODULE ===
// Kit CRUD, rendering, and cart operations.

import { CATALOG, kits, cart, setKits, setKitSearchTerm } from '../state.js';
import supabase from '../lib/supabase.js';
import { $, fmt, esc, toast, showConfirm } from '../utils.js';

let _kitSearchTerm = '';

function saveKitsLocal() {
  localStorage.setItem('kits', JSON.stringify(kits));
}

/**
 * Load all kits from the Supabase kits table.
 * Falls back to localStorage on error.
 * @returns {Promise<void>}
 */
export async function loadKitsFromDB() {
  try {
    const { data, error } = await supabase.from('kits').select('*').order('created_at');
    if (error) throw error;
    if (data && data.length > 0) {
      setKits(data.map(k => ({ id: k.id, name: k.name, components: k.components || [], createdBy: k.created_by })));
    }
  } catch (e) {
    console.warn('Error cargando kits desde DB:', e.message);
    const local = localStorage.getItem('kits');
    if (local) setKits(JSON.parse(local));
  }
}

/**
 * Save a kit to the Supabase kits table (insert or update).
 * @param {Object} kit - Kit object with id (optional), name, components
 * @returns {Promise<void>}
 */
export async function saveKitToDB(kit) {
  try {
    if (kit.id) {
      const { error } = await supabase
        .from('kits')
        .update({ name: kit.name, components: kit.components, updated_at: new Date().toISOString() })
        .eq('id', kit.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('kits')
        .insert({ name: kit.name, components: kit.components })
        .select()
        .single();
      if (error) throw error;
      if (data) kit.id = data.id;
    }
  } catch (e) {
    console.warn('Error guardando kit en DB:', e.message);
  }
  saveKitsLocal();
}

/**
 * Delete a kit from the Supabase kits table.
 * @param {string} kitId - UUID of the kit to delete
 * @returns {Promise<void>}
 */
export async function deleteKitFromDB(kitId) {
  if (!kitId) return;
  try {
    const { error } = await supabase.from('kits').delete().eq('id', kitId);
    if (error) throw error;
  } catch (e) {
    console.warn('Error eliminando kit de DB:', e.message);
  }
}

/**
 * Generate default kits from catalog (runs once if kits is empty).
 * Creates descriptive named kits by searching for keyword patterns in product descriptions.
 * Falls back to category-based kits if no keywords match.
 * @returns {void}
 */
export function generateDefaultKits() {
  if (kits.length > 0 || CATALOG.length === 0) return;

  function findByKeyword(keywords, max) {
    const found = [];
    CATALOG.forEach((item, idx) => {
      if (found.length >= max) return;
      const text = (
        (item.description || '') +
        ' ' +
        (item.sourceId || '') +
        ' ' +
        (item.category || '') +
        ' ' +
        (item.subcategory || '')
      ).toLowerCase();
      if (keywords.some(kw => text.includes(kw)) && !found.some(f => f.catalogIdx === idx)) {
        found.push({ catalogIdx: idx, included: true });
      }
    });
    return found;
  }

  const kitDefs = [
    {
      name: 'Kit Cámaras IP',
      primary: ['camara', 'cámara', 'camera', 'ip', 'dome', 'bullet', 'turret'],
      extras: ['cable', 'utp', 'conector', 'switch', 'patch'],
      max: 5,
    },
    {
      name: 'Kit Alarma',
      primary: ['alarma', 'sensor', 'detector', 'sirena', 'pir', 'magnetico'],
      extras: ['cable', 'panel', 'bateria'],
      max: 5,
    },
    {
      name: 'Kit Control de Acceso',
      primary: ['control de acceso', 'lector', 'lector huella', 'turnikete', 'giratorio'],
      extras: ['cable', 'cerradura', 'control'],
      max: 4,
    },
    {
      name: 'Kit Cableado',
      primary: ['cable', 'utp', 'cat6', 'coaxial'],
      extras: ['conector', 'jack', 'patch', 'cableado'],
      max: 4,
    },
    {
      name: 'Kit Grabación',
      primary: ['dvr', 'nvr', 'grabador', 'disco', 'hdd', 'disco duro'],
      extras: ['cable', 'monitor', 'cámara'],
      max: 4,
    },
  ];

  kitDefs.forEach(kitDef => {
    const primary = findByKeyword(kitDef.primary, Math.ceil(kitDef.max / 2));
    const extra = findByKeyword(kitDef.extras, Math.floor(kitDef.max / 2));
    const merged = [...primary, ...extra].slice(0, kitDef.max);
    if (merged.length >= 2) {
      const kit = { name: kitDef.name, components: merged };
      kits.push(kit);
      saveKitToDB(kit);
    }
  });

  if (kits.length === 0) {
    const byCat = {};
    CATALOG.forEach((item, idx) => {
      const cat = item.category || 'SIN CATEGORIA';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(idx);
    });
    const catNames = Object.keys(byCat).filter(c => c !== 'SERVICIOS' && c !== 'SIN CATEGORIA');
    catNames.slice(0, 3).forEach(cat => {
      const items = byCat[cat].slice(0, Math.min(4, byCat[cat].length));
      if (items.length >= 2) {
        const kit = { name: 'Kit ' + cat, components: items.map(idx => ({ catalogIdx: idx, included: true })) };
        kits.push(kit);
        saveKitToDB(kit);
      }
    });
  }

  if (kits.length === 0 && CATALOG.length >= 3) {
    const kit = {
      name: 'Kit Basico',
      components: CATALOG.slice(0, 3).map((_, i) => ({ catalogIdx: i, included: true })),
    };
    kits.push(kit);
    saveKitToDB(kit);
  }
}

/**
 * Switch between Items and Kits tabs in the catalog.
 * @param {'items'|'kits'} tab - Tab to activate
 * @returns {void}
 */
export function switchCatalogTab(tab) {
  document.querySelectorAll('.catalog-tab').forEach(t => t.classList.remove('active'));
  if (tab === 'items') {
    document.querySelector('.catalog-tab:first-child').classList.add('active');
    $('catalogItemsTab').style.display = '';
    $('catalogKitsTab').style.display = 'none';
  } else {
    document.querySelector('.catalog-tab:last-child').classList.add('active');
    $('catalogItemsTab').style.display = 'none';
    $('catalogKitsTab').style.display = '';
    renderKitsCatalog();
  }
}

/**
 * Render the kits list in the catalog panel.
 * Each kit shows name + up to 3 items + ellipsis. Click opens detail modal.
 * @returns {void}
 */
export function renderKitsCatalog() {
  const el = $('kitsCatalogList');
  if (!el) return;
  if (kits.length === 0) {
    el.innerHTML =
      '<div class="empty-state"><div class="icon">📦</div><div>No hay kits creados</div><div style="margin-top:4px;font-size:11px;">Añade un kit desde la sección de Catálogo</div></div>';
    return;
  }
  el.innerHTML = kits
    .map((k, i) => {
      const validComps = k.components.filter(c => c.catalogIdx !== null && c.catalogIdx < CATALOG.length);
      const total = validComps.reduce((s, c) => s + CATALOG[c.catalogIdx].cost, 0);
      const compNames = validComps
        .slice(0, 3)
        .map(c => {
          const item = CATALOG[c.catalogIdx];
          return item ? esc(item.description.slice(0, 30)) : '';
        })
        .filter(Boolean);
      const extra = validComps.length > 3 ? ` +${validComps.length - 3} más` : '';
      const preview = compNames.join(', ') + extra || 'Sin componentes';
      return `<div class="catalog-item" style="flex-direction:column;align-items:flex-start;gap:6px;">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <div style="cursor:pointer;flex:1;min-width:0;" onclick="openKitDetail(${i})">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px;">KIT-${String(i + 1).padStart(3, '0')}</div>
          <div style="font-weight:600;font-size:13px;">${esc(k.name)}</div>
          <div class="catalog-item-meta"><small>${preview}</small></div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="add-btn" onclick="addKitToCart(${i})" title="Agregar al carrito">🛒 ${fmt(total)}</button>
        </div>
      </div>
    </div>`;
    })
    .join('');
}

/**
 * Open kit detail modal showing all components with prices.
 * @param {number} idx - Kit index
 * @returns {void}
 */
export function openKitDetail(idx) {
  const k = kits[idx];
  if (!k) return;
  const validComps = k.components.filter(c => c.catalogIdx !== null && c.catalogIdx < CATALOG.length);
  const total = validComps.reduce((s, c) => s + CATALOG[c.catalogIdx].cost, 0);
  let html = `<div style="margin-bottom:12px;">
    <strong style="font-size:16px;">📦 ${esc(k.name)}</strong>
    <div style="font-size:12px;color:var(--muted);margin-top:4px;">${validComps.length} componente(s) · Costo base total: ${fmt(total)}</div>
  </div>`;
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
  html +=
    '<tr style="background:var(--border);"><th style="text-align:left;padding:6px;">#</th><th style="text-align:left;padding:6px;">Código</th><th style="text-align:left;padding:6px;">Descripción</th><th style="text-align:right;padding:6px;">Costo</th><th style="text-align:center;padding:6px;">Incluido</th></tr>';
  validComps.forEach((c, ci) => {
    const item = CATALOG[c.catalogIdx];
    if (!item) return;
    html += `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:6px;">${ci + 1}</td>
      <td style="padding:6px;font-family:ui-monospace,monospace;">${esc(item.sourceId || '')}</td>
      <td style="padding:6px;">${esc(item.description.slice(0, 50))}${item.description.length > 50 ? '…' : ''}</td>
      <td style="padding:6px;text-align:right;">${fmt(item.cost)}</td>
      <td style="padding:6px;text-align:center;">${c.included ? '✅' : '❌'}</td>
    </tr>`;
  });
  html += '</table>';
  $('productDetailBody').innerHTML = html;
  $('productDetailTitle').textContent = 'Detalle del Kit';
  $('productDetailModal').classList.add('open');
}

/**
 * Open the kits tab in the catalog panel.
 * @returns {void}
 */
export function openKitsModal() {
  switchCatalogTab('kits');
}

/**
 * Close the kits tab and return to items.
 * @returns {void}
 */
export function closeKitsModal() {
  switchCatalogTab('items');
}

/**
 * Create a new empty kit and open the kit editor.
 * @returns {void}
 */
export function addNewKit() {
  const kit = { name: 'Nuevo Kit', components: [] };
  kits.push(kit);
  saveKitToDB(kit);
  editKit(kits.length - 1);
}

/**
 * Open the kit editor modal for a specific kit.
 * @param {number} idx - Kit index in the kits array
 * @returns {void}
 */
export function editKit(idx) {
  const kit = kits[idx];
  $('kitEditName').value = kit.name;
  $('kitEditName').dataset.idx = idx;
  _kitSearchTerm = '';
  if ($('kitSearchProduct')) $('kitSearchProduct').value = '';
  renderKitComponents(idx);
  $('kitEditorModal').style.display = 'flex';
}

/**
 * Close the kit editor modal.
 * @returns {void}
 */
export function closeKitEditor() {
  _kitSearchTerm = '';
  if ($('kitSearchProduct')) $('kitSearchProduct').value = '';
  if ($('kitSearchResults')) $('kitSearchResults').style.display = 'none';
  $('kitEditorModal').style.display = 'none';
}

/**
 * Render the component list inside the kit editor.
 * @param {number} kitIdx - Kit index in the kits array
 * @returns {void}
 */
export function renderKitComponents(kitIdx) {
  const kit = kits[kitIdx];
  const el = $('kitComponentsList');
  if (!el) return;
  const filtered = getFilteredKitProducts();
  el.innerHTML = kit.components
    .map((c, i) => {
      const options = filtered
        .map(({ item, idx }) => {
          const selected = c.catalogIdx === idx ? 'selected' : '';
          const code = item.sourceId ? item.sourceId + ' — ' : '';
          return `<option value="${idx}" ${selected}>${esc(code)}${esc(item.description)} [${fmt(item.cost)}]</option>`;
        })
        .join('');
      const defaultSelected = c.catalogIdx === null || c.catalogIdx === undefined ? 'selected' : '';
      return `
    <div class="kit-comp-row">
      <select class="kit-comp-select" onchange="updateKitComp(${kitIdx},${i},'catalogIdx',this.value)">
        <option value="" ${defaultSelected}>Seleccionar producto...</option>
        ${options}
      </select>
      <button class="viewer-action-btn delete" onclick="removeKitComp(${kitIdx},${i})" title="Quitar componente" style="flex-shrink:0;">✕</button>
    </div>`;
    })
    .join('');
}

/**
 * Add a blank component to a kit.
 * @param {number} kitIdx - Kit index in the kits array
 * @returns {void}
 */
export function addKitComponent(kitIdx) {
  kits[kitIdx].components.push({ catalogIdx: null, included: true });
  saveKitToDB(kits[kitIdx]);
  renderKitComponents(kitIdx);
}

/**
 * Remove a component from a kit.
 * @param {number} kitIdx - Kit index in the kits array
 * @param {number} compIdx - Component index within the kit
 * @returns {void}
 */
export function removeKitComp(kitIdx, compIdx) {
  kits[kitIdx].components.splice(compIdx, 1);
  saveKitToDB(kits[kitIdx]);
  renderKitComponents(kitIdx);
}

/**
 * Update a kit component field (catalogIdx or included).
 * @param {number} kitIdx - Kit index in the kits array
 * @param {number} compIdx - Component index within the kit
 * @param {'catalogIdx'|'included'} field - Field to update
 * @param {*} val - New value
 * @returns {void}
 */
export function updateKitComp(kitIdx, compIdx, field, val) {
  const comp = kits[kitIdx].components[compIdx];
  if (field === 'catalogIdx') {
    comp.catalogIdx = val === '' ? null : parseInt(val);
  } else {
    comp[field] = val;
  }
  saveKitToDB(kits[kitIdx]);
}

/**
 * Filter kit products by the search input value and show results.
 * Also re-renders component select dropdowns with filtered options.
 * @returns {void}
 */
export function filterKitProducts() {
  _kitSearchTerm = ($('kitSearchProduct')?.value || '').toLowerCase().trim();
  const kitIdx = parseInt($('kitEditName')?.dataset?.idx);
  if (!isNaN(kitIdx)) renderKitComponents(kitIdx);
  renderKitSearchResults();
}

/**
 * Render the search results list below the kit search input.
 * Shows matching catalog items that can be clicked to add as components.
 * @returns {void}
 */
function renderKitSearchResults() {
  const el = $('kitSearchResults');
  if (!el) return;
  if (!_kitSearchTerm) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  const filtered = getFilteredKitProducts().slice(0, 20);
  if (filtered.length === 0) {
    el.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--muted);">Sin resultados</div>';
    el.style.display = 'block';
    return;
  }
  el.innerHTML = filtered
    .map(({ item, idx }) => {
      const code = item.sourceId
        ? `<strong style="color:var(--primary);font-weight:700;">${esc(item.sourceId)}</strong> `
        : '';
      const model = item.model ? `<span style="font-size:11px;color:var(--muted);"> (${esc(item.model)})</span>` : '';
      return `<div class="kit-search-result-item" onclick="addKitComponentFromSearch(${idx})" style="padding:10px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;line-height:1.4;" onmouseover="this.style.background='rgba(var(--primary-rgb),0.08)'" onmouseout="this.style.background=''">
        <div style="flex:1;min-width:0;word-break:break-word;">
          <div>${code}${model}</div>
          <div style="color:var(--text);margin-top:2px;font-size:12px;font-weight:500;">${esc(item.description)}</div>
        </div>
        <span style="color:var(--primary);font-weight:700;white-space:nowrap;font-size:13px;align-self:center;">${fmt(item.cost)}</span>
      </div>`;
    })
    .join('');
  el.style.display = 'block';
}

/**
 * Add a catalog item as a new kit component from the search results.
 * @param {number} catalogIdx - Index in the CATALOG array
 * @returns {void}
 */
export function addKitComponentFromSearch(catalogIdx) {
  const kitIdx = parseInt($('kitEditName')?.dataset?.idx);
  if (isNaN(kitIdx)) return;
  kits[kitIdx].components.push({ catalogIdx, included: true });
  saveKitToDB(kits[kitIdx]);
  renderKitComponents(kitIdx);
  const item = CATALOG[catalogIdx];
  if (item) toast(`"${item.description.slice(0, 30)}" agregado al kit`);
}

/**
 * Get catalog items filtered by the current kit search term.
 * @returns {Array<{item: Object, idx: number}>} Filtered items with original indices
 */
export function getFilteredKitProducts() {
  if (!_kitSearchTerm) return CATALOG.map((item, i) => ({ item, idx: i }));
  return CATALOG.map((item, i) => ({ item, idx: i })).filter(
    ({ item }) =>
      (item.sourceId || '').toLowerCase().includes(_kitSearchTerm) ||
      item.description.toLowerCase().includes(_kitSearchTerm) ||
      (item.category || '').toLowerCase().includes(_kitSearchTerm) ||
      (item.subcategory || '').toLowerCase().includes(_kitSearchTerm)
  );
}

/**
 * Save the current kit editor state and close the modal.
 * @returns {void}
 */
export function saveKitEditor() {
  const idx = parseInt($('kitEditName').dataset.idx) || 0;
  kits[idx].name = $('kitEditName').value || 'Sin nombre';
  saveKitToDB(kits[idx]);
  closeKitEditor();
  renderKitsCatalog();
}

/**
 * Delete a kit after confirmation.
 * @param {number} idx - Kit index in the kits array
 * @returns {void}
 */
export function deleteKit(idx) {
  showConfirm(`¿Eliminar kit "${kits[idx].name}"?`, 'Eliminar kit', 'Eliminar').then(ok => {
    if (!ok) return;
    const kit = kits[idx];
    deleteKitFromDB(kit.id);
    kits.splice(idx, 1);
    saveKitsLocal();
    renderKitsCatalog();
  });
}

/**
 * Add all included components of a kit as individual items in the cart.
 * @param {number} kitIdx - Kit index in the kits array
 * @returns {void}
 */
export function addKitToCart(kitIdx) {
  const kit = kits[kitIdx];
  const included = kit.components.filter(c => c.included && c.catalogIdx !== null);
  if (included.length === 0) {
    toast('El kit no tiene componentes incluidos', 'danger');
    return;
  }
  cart.push({
    catalogIdx: -1,
    qty: 1,
    isKit: true,
    kitName: kit.name,
    kitComponents: included.map(c => ({
      catalogIdx: c.catalogIdx,
      qty: 1,
      installActive: false,
      techCost: 0,
      customMargin: null,
    })),
    customMargin: null,
    techCost: 0,
    installActive: false,
  });
  // Call global render functions (set by app.js)
  window.renderCatalog?.();
  window.renderCart?.();
  window.saveDraft?.();
  toast(`Kit "${kit.name}" agregado`);
}

/**
 * Toggle the expanded view of a kit row in the cart.
 * @param {number} idx - Cart item index
 * @returns {void}
 */
export function toggleKitExpand(idx) {
  cart[idx]._expanded = !cart[idx]._expanded;
  window.renderCart?.();
}

/**
 * Update a kit component's quantity.
 * @param {number} kitIdx - Cart item index of the kit
 * @param {number} compIdx - Component index within kitComponents
 * @param {string|number} val - New quantity
 * @returns {void}
 */
export function updateKitCompQty(kitIdx, compIdx, val) {
  const v = parseFloat(val);
  if (!isNaN(v) && v >= 0) {
    cart[kitIdx].kitComponents[compIdx].qty = v;
    window.renderCart?.();
    window.saveDraft?.();
  }
}

/**
 * Update a kit component's custom supplier margin.
 * @param {number} kitIdx - Cart item index of the kit
 * @param {number} compIdx - Component index within kitComponents
 * @param {string|number} val - New margin percentage
 * @returns {void}
 */
export function updateKitCompMargin(kitIdx, compIdx, val) {
  const v = parseFloat(val);
  cart[kitIdx].kitComponents[compIdx].customMargin = isNaN(v) ? null : v;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    window.renderCart?.();
    window.saveDraft?.();
  }, 300);
}

/**
 * Toggle installation for a kit component.
 * @param {number} kitIdx - Cart item index of the kit
 * @param {number} compIdx - Component index within kitComponents
 * @returns {void}
 */
export function toggleKitCompInstall(kitIdx, compIdx) {
  const comp = cart[kitIdx].kitComponents[compIdx];
  comp.installActive = !comp.installActive;
  window.renderCart?.();
  window.saveDraft?.();
}

/**
 * Update a kit component's tech cost.
 * @param {number} kitIdx - Cart item index of the kit
 * @param {number} compIdx - Component index within kitComponents
 * @param {string|number} val - New tech cost
 * @returns {void}
 */
export function updateKitCompTechCost(kitIdx, compIdx, val) {
  const v = parseFloat(val);
  if (!isNaN(v) && v >= 0) {
    cart[kitIdx].kitComponents[compIdx].techCost = v;
    window.renderCart?.();
    window.saveDraft?.();
  }
}

/**
 * Remove a single component from a kit in the cart (not from the kit definition).
 * If no components remain, the entire kit entry is removed.
 * @param {number} kitIdx - Cart item index of the kit
 * @param {number} compIdx - Component index within kitComponents
 * @returns {void}
 */
export function removeKitComponentFromCart(kitIdx, compIdx) {
  if (!cart[kitIdx] || !cart[kitIdx].isKit) return;
  cart[kitIdx].kitComponents.splice(compIdx, 1);
  if (cart[kitIdx].kitComponents.length === 0) {
    cart.splice(kitIdx, 1);
  }
  window.renderCart?.();
  window.saveDraft?.();
}
