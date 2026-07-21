import { doLogin, validateSession, logout } from './modules/auth.js';
import { syncFromGoogleSheets, loadAllProducts, getCategoryHierarchy, getSyncLog } from './modules/sync.js';
import supabase from './lib/supabase.js';

// === CATÁLOGO ===
const CATALOG = [];
let categoryHierarchy = {};
let catalogPageSize = 10;
let catalogPage = 1;

async function loadCatalogFromDB() {
  try {
    const data = await loadAllProducts();
    if (data && data.length > 0) {
      CATALOG.length = 0;
      data.forEach(item => CATALOG.push(item));
      categoryHierarchy = getCategoryHierarchy(data);
      return true;
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo desde DB:', e.message);
  }
  return false;
}

// === ESTADO ===
let cart = [];
let currentSession = null;
let currentQuoteId = null;
let historyQuotesCache = [];

// Mapa de márgenes por proveedor: { "Sisegusa": 35, "Sin proveedor": 35, ... }
let supplierMargins = {};
const DEFAULT_SUPPLIER_MARGIN = 35;
const DEFAULT_INSTALL_MARGIN = 35;
let installationMarginPct = DEFAULT_INSTALL_MARGIN;
let installationEnabled = false;

const STATUS_LABELS = {
  borrador: 'Borrador', enviada: 'Enviada', vista: 'Vista',
  aceptada: 'Aceptada', rechazada: 'Rechazada', vencida: 'Vencida',
};
function getStatusLabel(s) { return STATUS_LABELS[s] || s; }

// === PRICING ===
function getSupplierMargin(supplier) {
  const key = supplier || 'Sin proveedor';
  return supplierMargins[key] ?? DEFAULT_SUPPLIER_MARGIN;
}

function calcItemPrice(item, opts = {}) {
  const supplierMargin = opts.supplierMargin ?? getSupplierMargin(item.supplier);
  const installMargin = opts.installMargin ?? installationMarginPct;
  const techCost = opts.techCost ?? 0;
  const installActive = opts.installActive ?? false;

  if (item.isService) {
    const price = item.cost;
    const iva = Math.round(price * 0.15 * 100) / 100;
    return {
      baseCost: price, gananciaProveedor: 0, priceBeforeIva: price,
      iva, subtotalEquipo: price + iva,
      techCost: 0, gananciaInstalacion: 0, instalacionPrice: 0,
      total: price + iva, hasGanancia: false, hasInstalacion: false,
    };
  }

  const baseCost = item.cost;
  const gananciaProveedor = item.hasGanancia
    ? Math.round(baseCost * (supplierMargin / 100) * 100) / 100 : 0;
  const priceBeforeIva = baseCost + gananciaProveedor;
  const iva = Math.round(priceBeforeIva * 0.15 * 100) / 100;
  const subtotalEquipo = priceBeforeIva + iva;

  let gananciaInstalacion = 0;
  let instalacionPrice = 0;
  if (item.hasInstalacion && installActive && techCost > 0) {
    gananciaInstalacion = Math.round(techCost * (installMargin / 100) * 100) / 100;
    instalacionPrice = techCost + gananciaInstalacion;
  }

  return {
    baseCost, gananciaProveedor, priceBeforeIva, iva, subtotalEquipo,
    techCost, gananciaInstalacion, instalacionPrice,
    total: subtotalEquipo + instalacionPrice,
    hasGanancia: item.hasGanancia, hasInstalacion: item.hasInstalacion,
  };
}

function quoteTotal(q) {
  const items = q.items || [];
  return items.reduce((s, c) => {
    const item = CATALOG[c.catalogIdx];
    if (!item) return s;
    const pricing = calcItemPrice(item, {
      supplierMargin: getSupplierMargin(item.supplier),
      installMargin: installationMarginPct,
      techCost: c.techCost ?? 0,
      installActive: c.installActive ?? false,
    });
    return s + pricing.total * c.qty;
  }, 0);
}

function isAdmin() { return currentSession?.rol === 'admin'; }

// === UTILIDADES ===
const $ = id => document.getElementById(id);
const fmt = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2400);
}

function generateCotNumber() {
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const key = 'cot_seq_' + ymd;
  let seq = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(seq));
  return 'COT-' + ymd + '-' + String(seq).padStart(3,'0');
}

// === BADGES ===
function marginBadge(item) {
  if (item.isService) return '';
  let html = '';
  if (item.hasGanancia) {
    const pct = getSupplierMargin(item.supplier);
    html += `<span class="margin-badge margin-supplier">+${pct}% proveedor</span>`;
  }
  if (item.hasInstalacion) html += '<span class="margin-badge margin-install">Instalación</span>';
  if (!item.hasGanancia && !item.hasInstalacion) html = '<span class="margin-badge margin-none">Sin margen</span>';
  return html;
}

function installBadge(item) {
  if (item.hasInstalacion) return '<span class="install-required">🟩 Requiere</span>';
  return '<span class="install-not-required">⬛ No aplica</span>';
}

// === RENDER CATÁLOGO ===
function renderCatalog() {
  const q = $('search').value.toLowerCase().trim();
  const cat = $('categoryFilter').value;
  const sub = $('subcategoryFilter').value;
  const list = $('catalogList');
  const filtered = CATALOG.filter(item => {
    if (cat && item.category !== cat) return false;
    if (sub && item.subcategory !== sub) return false;
    if (!q) return true;
    return (item.sourceId || '').toLowerCase().includes(q) ||
           item.description.toLowerCase().includes(q) ||
           (item.model || '').toLowerCase().includes(q);
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / catalogPageSize));
  if (catalogPage > totalPages) catalogPage = totalPages;
  const startIdx = (catalogPage - 1) * catalogPageSize;
  const pageItems = filtered.slice(startIdx, startIdx + catalogPageSize);

  $('catalogCount').textContent = totalFiltered + ' ítems' + (totalFiltered !== CATALOG.length ? ' (de ' + CATALOG.length + ')' : '');

  if (totalFiltered === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>No se encontraron productos</div>';
    $('catalogPagination').innerHTML = '';
    return;
  }

  list.innerHTML = pageItems.map((item) => {
    const realIdx = CATALOG.indexOf(item);
    const supplier = item.supplier ? '· ' + item.supplier : '';
    const code = item.sourceId || '(sin código)';
    const subcatLabel = item.subcategory ? '<span class="cat-item-subcat">' + item.subcategory + '</span>' : '';
    const modelLabel = item.model ? '<span class="cat-item-model">' + item.model + '</span>' : '';

    const pricing = calcItemPrice(item);
    const price = pricing.subtotalEquipo;
    const badges = marginBadge(item);

    return `
      <div class="cat-item">
        <div class="cat-item-info">
          <div class="cat-item-code">${code} ${modelLabel}</div>
          <div class="cat-item-desc">${item.description}</div>
          <div class="cat-item-meta">
            ${subcatLabel}
            ${badges}
            <span>${supplier}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="cat-item-price">
            <div class="pvp">${fmt(price)}</div>
            <div class="cost">costo ${fmt(item.cost)}</div>
          </div>
          <button class="add-btn" onclick="addToCart(${realIdx})">+ Agregar</button>
        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalFiltered, totalPages);
}

function renderPagination(total, totalPages) {
  const container = $('catalogPagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const start = (catalogPage - 1) * catalogPageSize + 1;
  const end = Math.min(catalogPage * catalogPageSize, total);

  let html = `<span class="pag-info">Mostrando ${start}-${end} de ${total}</span>`;
  html += '<div class="pag-buttons">';
  html += `<button class="pag-btn" onclick="goToPage(1)" ${catalogPage === 1 ? 'disabled' : ''}>«</button>`;
  html += `<button class="pag-btn" onclick="goToPage(${catalogPage - 1})" ${catalogPage === 1 ? 'disabled' : ''}>‹</button>`;

  const maxVisible = 5;
  let startPage = Math.max(1, catalogPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  if (startPage > 1) html += `<span class="pag-ellipsis">…</span>`;
  for (let p = startPage; p <= endPage; p++) {
    html += `<button class="pag-btn${p === catalogPage ? ' pag-active' : ''}" onclick="goToPage(${p})">${p}</button>`;
  }
  if (endPage < totalPages) html += `<span class="pag-ellipsis">…</span>`;

  html += `<button class="pag-btn" onclick="goToPage(${catalogPage + 1})" ${catalogPage === totalPages ? 'disabled' : ''}>›</button>`;
  html += `<button class="pag-btn" onclick="goToPage(${totalPages})" ${catalogPage === totalPages ? 'disabled' : ''}>»</button>`;
  html += '</div>';

  container.innerHTML = html;
}

function goToPage(p) {
  catalogPage = p;
  renderCatalog();
}

function changePageSize(val) {
  catalogPageSize = parseInt(val) || 10;
  catalogPage = 1;
  renderCatalog();
}

function renderCategories() {
  const catSel = $('categoryFilter');
  const subSel = $('subcategoryFilter');
  const currentCat = catSel.value;
  const currentSub = subSel.value;
  const cats = [...new Set(CATALOG.map(i => i.category))].sort();
  catSel.innerHTML = '<option value="">Todas las categorías</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.length > 40 ? c.slice(0, 40) + '…' : c;
    catSel.appendChild(opt);
  });
  catSel.value = currentCat;
  renderSubcategories(currentCat);
  subSel.value = currentSub;
}

function renderSubcategories(selectedCat) {
  const subSel = $('subcategoryFilter');
  const currentSub = subSel.value;
  subSel.innerHTML = '<option value="">Todas las subcategorías</option>';
  const source = selectedCat ? CATALOG.filter(i => i.category === selectedCat) : CATALOG;
  const subs = [...new Set(source.map(i => i.subcategory).filter(Boolean))].sort();
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.length > 35 ? s.slice(0, 35) + '…' : s;
    subSel.appendChild(opt);
  });
  if (currentSub && [...subSel.options].some(o => o.value === currentSub)) {
    subSel.value = currentSub;
  }
}

// === CART ===
function addToCart(idx) {
  const item = CATALOG[idx];
  const existing = cart.find(c => c.catalogIdx === idx);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      catalogIdx: idx,
      qty: item.unit ? (parseFloat(item.unit) || 1) : 1,
      installActive: false,
      techCost: 0,
    });
  }
  renderCatalog();
  renderCart();
  saveDraft();
  toast('✓ ' + item.description.slice(0,40) + (item.description.length > 40 ? '…' : '') + ' agregado', 'success');
}

function updateQty(idx, qty) {
  const q = parseFloat(qty) || 0;
  if (q <= 0) { removeItem(idx); return; }
  cart[idx].qty = q;
  renderCart();
  saveDraft();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  renderCatalog();
  renderCart();
  saveDraft();
}

function toggleInstall(idx) {
  cart[idx].installActive = !cart[idx].installActive;
  renderCart();
  saveDraft();
}

function updateTechCost(idx, val) {
  cart[idx].techCost = parseFloat(val) || 0;
  renderCart();
  saveDraft();
}

function updateSupplierMarginGlobal(supplier, val) {
  const key = supplier || 'Sin proveedor';
  supplierMargins[key] = parseFloat(val) || 0;
  renderCart();
  saveDraft();
}

function updateInstallationMargin(val) {
  installationMarginPct = parseFloat(val) || 0;
  renderCart();
  saveDraft();
}

function toggleInstallationGlobal() {
  installationEnabled = !installationEnabled;
  if (installationEnabled) {
    cart.forEach(c => {
      const item = CATALOG[c.catalogIdx];
      if (item.hasInstalacion) c.installActive = true;
    });
  } else {
    cart.forEach(c => { c.installActive = false; });
  }
  renderCart();
  saveDraft();
}

// === RENDER CART ===
function renderCart() {
  const container = $('itemsContainer');
  $('itemsCount').textContent = cart.length + ' ítem' + (cart.length === 1 ? '' : 's');
  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><div>Aún no hay productos en la cotización.</div><div style="margin-top:4px;font-size:11px;">Busca y agrega productos del catálogo (panel izquierdo)</div></div>';
    renderMarginConfig();
    renderTotals();
    return;
  }

  let html = '';

  // === TABLA DE DETALLE ===
  html += '<table class="items-table"><thead><tr>';
  html += '<th class="item-num">#</th>';
  html += '<th>Descripción</th>';
  html += '<th class="right" style="width:75px;">Precio</th>';
  html += '<th class="center" style="width:55px;">Cant</th>';
  html += '<th class="right" style="width:65px;">+Margen</th>';
  html += '<th class="right" style="width:75px;">PVP</th>';
  html += '<th class="center" style="width:55px;">Inst.</th>';
  html += '<th style="width:30px;"></th>';
  html += '</tr></thead><tbody>';

  cart.forEach((c, idx) => {
    const item = CATALOG[c.catalogIdx];
    const pricing = calcItemPrice(item, {
      supplierMargin: getSupplierMargin(item.supplier),
      installMargin: installationMarginPct,
      techCost: c.techCost,
      installActive: c.installActive,
    });

    const lineTotal = pricing.total * c.qty;
    const badges = marginBadge(item);
    const marginCell = pricing.gananciaProveedor > 0
      ? `<span class="supplier-detail">${fmt(pricing.gananciaProveedor * c.qty)}</span>`
      : '<span style="color:var(--muted);">—</span>';

    const installCell = item.hasInstalacion
      ? (c.installActive
        ? `<span class="install-active">🟩 ${fmt(pricing.instalacionPrice * c.qty)}</span>`
        : '<span class="install-pending">⬛</span>')
      : '<span style="color:var(--muted);">—</span>';

    html += `<tr>
      <td class="item-num">${idx + 1}</td>
      <td class="item-desc">
        ${item.description}
        <div class="item-badges">${badges}</div>
        <small>${item.sourceId || ''}${item.supplier ? ' · ' + item.supplier : ''}</small>
      </td>
      <td class="right">${fmt(pricing.baseCost)}</td>
      <td class="center"><input type="number" min="0" step="any" value="${c.qty}" class="qty-input" onchange="updateQty(${idx}, this.value)"></td>
      <td class="right">${marginCell}</td>
      <td class="right">${fmt(pricing.priceBeforeIva)}</td>
      <td class="center">${installCell}</td>
      <td><button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar">✕</button></td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  renderMarginConfig();
  renderTotals();
}

// === MARGIN CONFIG ===
function renderMarginConfig() {
  const section = $('marginConfigSection');
  if (!section) return;

  if (cart.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // === PROVEEDORES ===
  const supplierGroups = {};
  cart.forEach((c, idx) => {
    const item = CATALOG[c.catalogIdx];
    if (item.isService) return;
    const key = item.supplier || 'Sin proveedor';
    if (!supplierGroups[key]) supplierGroups[key] = [];
    supplierGroups[key].push({ idx, item, cartItem: c });
  });

  let supplierHtml = '<div class="margin-subsection"><div class="margin-subsection-header margin-subsection-proveedores"><h4>📦 Ganancia por proveedores</h4><span class="margin-subsection-count">' + Object.keys(supplierGroups).length + ' proveedor(es) · ' + cart.filter(c => !CATALOG[c.catalogIdx]?.isService).length + ' ítems</span></div>';

  const supplierKeys = Object.keys(supplierGroups).sort((a, b) => a === 'Sin proveedor' ? 1 : b === 'Sin proveedor' ? -1 : a.localeCompare(b));

  if (supplierKeys.length === 0) {
    supplierHtml += '<div class="margin-empty">No hay items de equipo/materiales en la cotización.</div>';
  } else {
    supplierKeys.forEach(supplier => {
      const items = supplierGroups[supplier];
      const margin = getSupplierMargin(supplier);

      supplierHtml += `<div class="supplier-group">`;
      supplierHtml += `<div class="supplier-group-header">`;
      supplierHtml += `<span class="supplier-name">${supplier} <span class="supplier-count">${items.length} ítem(s)</span></span>`;
      supplierHtml += `<div class="supplier-margin-input"><input type="number" min="0" max="100" step="1" value="${margin}" onchange="updateSupplierMarginGlobal('${supplier.replace(/'/g, "\\'")}', this.value)"><span>%</span></div>`;
      supplierHtml += `</div>`;

      items.forEach(({ item }) => {
        const pricing = calcItemPrice(item, { supplierMargin: margin });
        const hasGanancia = item.hasGanancia;
        supplierHtml += `<div class="supplier-group-item${hasGanancia ? ' sgi-active' : ''}">`;
        supplierHtml += `<span class="sgi-code">${item.sourceId || ''}</span>`;
        supplierHtml += `<span class="sgi-desc">${item.description.slice(0, 45)}${item.description.length > 45 ? '…' : ''}</span>`;
        supplierHtml += `<span class="sgi-cost">${fmt(item.cost)} → <strong>${fmt(pricing.priceBeforeIva)}</strong>${hasGanancia ? ' <span class="sgi-margin">+' + margin + '%</span>' : ' <span class="sgi-no-margin">sin ganancia</span>'}</span>`;
        supplierHtml += `</div>`;
      });

      supplierHtml += `</div>`;
    });
  }
  supplierHtml += '</div>';

  // === INSTALACIÓN ===
  const installItems = [];
  cart.forEach((c, idx) => {
    const item = CATALOG[c.catalogIdx];
    if (item.hasInstalacion) installItems.push({ idx, item, cartItem: c });
  });

  const installCount = installItems.length;
  const activeCount = installItems.filter(i => i.cartItem.installActive).length;

  let installHtml = '<div class="margin-subsection">';
  installHtml += '<div class="margin-subsection-header margin-subsection-instalacion">';
  installHtml += '<h4>🔧 Ganancia por instalación</h4>';
  installHtml += '<div class="install-toggle-group">';
  installHtml += `<span class="margin-subsection-count">${installCount} ítem(s) con flag</span>`;
  installHtml += `<button class="install-master-toggle ${installationEnabled ? 'active' : ''}" onclick="toggleInstallationGlobal()">${installationEnabled ? '🟩 Instalación ON' : ' ⬛ Instalación OFF'}</button>`;
  installHtml += '</div>';
  installHtml += '</div>';

  if (installCount === 0) {
    installHtml += '<div class="margin-empty">No hay items con flag de instalación en la cotización. Re-sincroniza el catálogo para actualizar los datos.</div>';
  } else if (!installationEnabled) {
    installHtml += `<div class="margin-empty">Instalación desactivada. <strong>${installCount} ítem(s)</strong> con flag de instalación disponibles. </div>`;
  } else {
    installHtml += `<div class="install-global-control">`;
    installHtml += `<label>Margen global de instalación:</label>`;
    installHtml += `<div class="margin-input-inline"><input type="number" min="0" max="100" step="1" value="${installationMarginPct}" onchange="updateInstallationMargin(this.value)"><span>%</span></div>`;
    installHtml += `<span class="install-active-count">${activeCount} de ${installCount} activos</span>`;
    installHtml += `</div>`;

    installItems.forEach(({ idx, item, cartItem }) => {
      const pricing = calcItemPrice(item, {
        installMargin: installationMarginPct,
        techCost: cartItem.techCost,
        installActive: cartItem.installActive,
      });

      installHtml += `<div class="install-config-row${cartItem.installActive ? ' install-active-row' : ''}">`;
      installHtml += `<div class="install-config-info">`;
      installHtml += `<span class="install-toggle ${cartItem.installActive ? 'active' : ''}" onclick="toggleInstall(${idx})">✓</span>`;
      installHtml += `<span class="install-config-name">${item.sourceId || ''} — ${item.description.slice(0, 40)}${item.description.length > 40 ? '…' : ''}</span>`;
      if (cartItem.installActive && cartItem.techCost > 0) {
        installHtml += `<span class="install-cost-badge">Téc: ${fmt(cartItem.techCost)} → ${fmt(pricing.instalacionPrice)}</span>`;
      }
      installHtml += `</div>`;

      if (cartItem.installActive) {
        installHtml += `<div class="install-config-fields">`;
        installHtml += `<div class="install-field"><label>Costo técnico</label><input type="number" min="0" step="0.01" value="${cartItem.techCost}" onchange="updateTechCost(${idx}, this.value)" placeholder="0.00"></div>`;
        installHtml += `<div class="install-field"><label>Margen (${installationMarginPct}%)</label><span class="install-price">${fmt(pricing.gananciaInstalacion)}</span></div>`;
        installHtml += `<div class="install-field"><label>Total instalación</label><span class="install-price install-total">${fmt(pricing.instalacionPrice)}</span></div>`;
        installHtml += `</div>`;
      }

      installHtml += `</div>`;
    });
  }
  installHtml += '</div>';

  section.innerHTML = supplierHtml + installHtml;
}

// === TOTALS ===
function renderTotals() {
  let subtotalEquipo = 0;
  let totalIva = 0;
  let totalInstalacion = 0;

  cart.forEach(c => {
    const item = CATALOG[c.catalogIdx];
    const pricing = calcItemPrice(item, {
      supplierMargin: getSupplierMargin(item.supplier),
      installMargin: installationMarginPct,
      techCost: c.techCost,
      installActive: c.installActive,
    });
    subtotalEquipo += pricing.priceBeforeIva * c.qty;
    totalIva += pricing.iva * c.qty;
    totalInstalacion += pricing.instalacionPrice * c.qty;
  });

  const totalGeneral = subtotalEquipo + totalIva + totalInstalacion;

  let breakdownHtml = '';
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;Equipo (sin IVA)</span><span>${fmt(subtotalEquipo)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;IVA 15%</span><span>${fmt(totalIva)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub"><span>Subtotal (equipo + IVA)</span><span>${fmt(subtotalEquipo + totalIva)}</span></div>`;

  if (totalInstalacion > 0) {
    breakdownHtml += `<div class="totals-row totals-sub totals-install"><span> Instalación</span><span>${fmt(totalInstalacion)}</span></div>`;
  }
  $('totalsBreakdown').innerHTML = breakdownHtml;

  $('totalView').textContent = fmt(totalGeneral);
}

// === QUOTE SAVE/LOAD ===
function setModality(m) {
  renderCatalog();
  renderCart();
  saveDraft();
}

function buildQuoteData() {
  return {
    cotNum: $('cotNum').value,
    cotDate: $('cotDate').value,
    client: {
      name: $('clientName').value,
      ruc: $('clientRuc').value,
      address: $('clientAddress').value,
      contact: $('clientContact').value,
      phone: $('clientPhone').value,
      email: $('clientEmail').value,
    },
    supplierMargins: { ...supplierMargins },
    installMargin: installationMarginPct,
    installationEnabled,
    items: cart,
    savedAt: new Date().toISOString(),
  };
}

function loadQuoteData(q) {
  $('cotNum').value = q.cotNum || '';
  $('cotDate').value = q.cotDate || '';
  $('clientName').value = q.client.name || '';
  $('clientRuc').value = q.client.ruc || '';
  $('clientAddress').value = q.client.address || '';
  $('clientContact').value = q.client.contact || '';
  $('clientPhone').value = q.client.phone || '';
  $('clientEmail').value = q.client.email || '';
  supplierMargins = q.supplierMargins || {};
  installationMarginPct = q.installMargin ?? DEFAULT_INSTALL_MARGIN;
  installationEnabled = q.installationEnabled ?? false;
  cart = q.items || [];
  renderCatalog();
  renderCart();
}

function saveDraft() {
  localStorage.setItem('quote_draft', JSON.stringify(buildQuoteData()));
}

function loadDraft() {
  const raw = localStorage.getItem('quote_draft');
  if (!raw) { toast('No hay borrador guardado', 'danger'); return; }
  try {
    currentQuoteId = null;
    loadQuoteData(JSON.parse(raw));
    toast('Borrador cargado');
  } catch(e) { toast('Error al cargar borrador', 'danger'); }
}

async function saveQuote() {
  const data = buildQuoteData();
  if (!data.client.name || cart.length === 0) {
    toast('Llena el cliente y agrega al menos un ítem', 'danger');
    return;
  }
  if (!data.cotNum) {
    data.cotNum = generateCotNumber();
    $('cotNum').value = data.cotNum;
  }

  const userId = currentSession?.userId;
  if (!userId) { toast('Error: no hay sesión activa', 'danger'); return; }

  try {
    const row = {
      user_id: userId, cot_num: data.cotNum, cot_date: data.cotDate || null,
      client: data.client, supplier_margins: data.supplierMargins,
      install_margin: data.installMargin, items: data.items,
      status: 'borrador', updated_at: new Date().toISOString(),
    };

    if (currentQuoteId) {
      const { error } = await supabase.from('saved_quotes').update({
        cot_num: row.cot_num, cot_date: row.cot_date, client: row.client,
        supplier_margins: row.supplier_margins, install_margin: row.install_margin,
        items: row.items, updated_at: row.updated_at,
      }).eq('id', currentQuoteId);
      if (error) throw error;
      toast('✓ Cotización actualizada: ' + data.cotNum, 'success');
    } else {
      const { data: existing } = await supabase.from('saved_quotes')
        .select('id').eq('user_id', userId).eq('cot_num', data.cotNum).maybeSingle();
      if (existing) {
        if (confirm('Ya existe "' + data.cotNum + '". ¿Actualizar la existente?')) {
          const { error } = await supabase.from('saved_quotes').update({
            cot_num: row.cot_num, cot_date: row.cot_date, client: row.client,
            supplier_margins: row.supplier_margins, install_margin: row.install_margin,
            items: row.items, updated_at: row.updated_at,
          }).eq('id', existing.id);
          if (error) throw error;
          currentQuoteId = existing.id;
          toast('✓ Cotización actualizada', 'success');
        } else {
          data.cotNum = generateCotNumber();
          $('cotNum').value = data.cotNum;
          row.cot_num = data.cotNum;
          const { error } = await supabase.from('saved_quotes').insert(row);
          if (error) throw error;
          toast('✓ Cotización nueva guardada', 'success');
        }
      } else {
        const { error } = await supabase.from('saved_quotes').insert(row);
        if (error) throw error;
        toast('✓ Cotización guardada: ' + data.cotNum, 'success');
      }
    }
  } catch (e) {
    console.error('Error guardando:', e);
    toast('Error al guardar: ' + e.message, 'danger');
  }
}

// === HISTORY ===
async function openSavedModal() {
  const userId = currentSession?.userId;
  if (!userId) { toast('No hay sesión activa', 'danger'); return; }
  $('historyList').innerHTML = '<div class="empty-state">Cargando...</div>';
  $('historyStats').innerHTML = '';
  $('savedModal').classList.add('open');
  try {
    let query = supabase.from('saved_quotes').select('*');
    if (!isAdmin()) query = query.eq('user_id', userId);
    const { data: saved, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    historyQuotesCache = saved || [];
    renderHistoryList(historyQuotesCache);
  } catch (e) {
    $('historyList').innerHTML = '<div class="empty-state">Error: ' + e.message + '</div>';
  }
}

function renderHistoryList(quotes) {
  const list = $('historyList');
  const stats = $('historyStats');
  const counts = {};
  quotes.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
  const total = quotes.reduce((s, q) => s + quoteTotal(q), 0);
  stats.innerHTML = `
    <span class="history-stat"><span class="dot" style="background:#6b7280"></span>${counts.borrador || 0} borrador</span>
    <span class="history-stat"><span class="dot" style="background:#f59e0b"></span>${counts.enviada || 0} enviada</span>
    <span class="history-stat"><span class="dot" style="background:#3b82f6"></span>${counts.vista || 0} vista</span>
    <span class="history-stat"><span class="dot" style="background:#10b981"></span>${counts.aceptada || 0} aceptada</span>
    <span class="history-stat"><span class="dot" style="background:#ef4444"></span>${counts.rechazada || 0} rechazada</span>
    <span class="history-stat"><span class="dot" style="background:#d97706"></span>${counts.vencida || 0} vencida</span>
    <span style="margin-left:auto;font-weight:600;">Total: ${fmt(total)}</span>
  `;
  if (quotes.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">📂</div>No hay cotizaciones con estos filtros.</div>';
    return;
  }
  list.innerHTML = quotes.map(q => {
    const client = q.client || {};
    const d = new Date(q.updated_at || q.saved_at);
    const total = quoteTotal(q);
    const status = q.status || 'borrador';
    const statusOptions = STATUS_ORDER.map(s =>
      `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');
    return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-client">${client.name || '(sin nombre)'}</div>
          <div class="history-item-meta">${q.cot_num || '(sin número)'} · ${q.items?.length || 0} ítems · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', {hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <select class="status-select" onchange="changeStatus('${q.id}', this.value)">${statusOptions}</select>
        <div class="history-item-actions">
          <button onclick="loadSaved('${q.id}')">Cargar</button>
          <button style="color:var(--danger);border-color:var(--danger);" onclick="deleteSaved('${q.id}')">Eliminar</button>
        </div>
      </div>`;
  }).join('');
}

function applyHistoryFilters() {
  const clientQ = $('filterClient').value.toLowerCase().trim();
  const status = $('filterStatus').value;
  const dateFrom = $('filterDateFrom').value;
  const dateTo = $('filterDateTo').value;
  let filtered = historyQuotesCache.filter(q => {
    const client = q.client || {};
    if (clientQ && !(client.name || '').toLowerCase().includes(clientQ)) return false;
    if (status && q.status !== status) return false;
    if (dateFrom) { const d = q.cot_date || (q.updated_at || '').slice(0, 10); if (d && d < dateFrom) return false; }
    if (dateTo) { const d = q.cot_date || (q.updated_at || '').slice(0, 10); if (d && d > dateTo) return false; }
    return true;
  });
  renderHistoryList(filtered);
}

const STATUS_ORDER = ['borrador', 'enviada', 'vista', 'aceptada', 'rechazada', 'vencida'];

async function changeStatus(id, newStatus) {
  try {
    const { error } = await supabase.from('saved_quotes').update({
      status: newStatus, updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;
    const q = historyQuotesCache.find(q => q.id === id);
    if (q) q.status = newStatus;
    applyHistoryFilters();
    toast('✓ Estado: ' + STATUS_LABELS[newStatus], 'success');
  } catch (e) { toast('Error: ' + e.message, 'danger'); }
}

function closeSavedModal() { $('savedModal').classList.remove('open'); }

async function loadSaved(id) {
  try {
    const { data, error } = await supabase.from('saved_quotes').select('*').eq('id', id).single();
    if (error) throw error;
    currentQuoteId = data.id;
    loadQuoteData({
      cotNum: data.cot_num, cotDate: data.cot_date, client: data.client,
      supplierMargins: data.supplier_margins, installMargin: data.install_margin,
      items: data.items,
    });
    closeSavedModal();
    toast('✓ Cotización cargada: ' + data.cot_num);
  } catch (e) { toast('Error: ' + e.message, 'danger'); }
}

async function deleteSaved(id) {
  if (!confirm('¿Eliminar esta cotización?')) return;
  try {
    const { error } = await supabase.from('saved_quotes').delete().eq('id', id);
    if (error) throw error;
    if (currentQuoteId === id) currentQuoteId = null;
    historyQuotesCache = historyQuotesCache.filter(q => q.id !== id);
    applyHistoryFilters();
    toast('Cotización eliminada');
  } catch (e) { toast('Error: ' + e.message, 'danger'); }
}

function newQuote() {
  if (cart.length > 0 && !confirm('¿Limpiar todo y empezar nueva cotización?')) return;
  cart = [];
  currentQuoteId = null;
  supplierMargins = {};
  installationMarginPct = DEFAULT_INSTALL_MARGIN;
  installationEnabled = false;
  ['cotNum','cotDate','clientName','clientRuc','clientAddress','clientContact','clientPhone','clientEmail'].forEach(id => $(id).value = '');
  $('cotNum').value = generateCotNumber();
  $('cotDate').value = new Date().toISOString().split('T')[0];
  renderCatalog();
  renderCart();
  saveDraft();
}

function handleSyncClick() { openCatalogViewer(); }

// === SYNC PANEL ===
let syncAbortController = null;

function openSyncPanel() {
  if (!isAdmin()) { toast('Solo admin puede sincronizar', 'danger'); return; }
  $('syncPanel').style.display = 'block';
  $('syncPanelStatus').textContent = '';
  $('syncPanelSummary').innerHTML = '';
}

function closeSyncPanel() {
  if (syncAbortController) { syncAbortController.abort(); syncAbortController = null; }
  $('syncPanel').style.display = 'none';
  $('btnStartSync').style.display = '';
  $('btnStopSync').style.display = 'none';
}

async function startSync() {
  if (!isAdmin()) { toast('Solo admin', 'danger'); return; }
  $('btnStartSync').style.display = 'none';
  $('btnStopSync').style.display = '';
  $('syncPanelStatus').textContent = 'Iniciando...';
  $('syncPanelSummary').innerHTML = '';
  $('syncLogEntries').innerHTML = '';
  syncAbortController = new AbortController();
  const signal = syncAbortController.signal;

  function appendLog(msg, level) {
    const entry = document.createElement('div');
    const ts = new Date().toLocaleTimeString();
    const color = level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : '#9ca3af';
    entry.innerHTML = `<span style="color:#6b7280;">${ts}</span> <span style="color:${color};">${msg}</span>`;
    $('syncLogEntries').appendChild(entry);
    entry.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  appendLog('Iniciando sincronización...', 'info');
  try {
    const result = await syncFromGoogleSheets((msg) => {
      $('syncPanelStatus').textContent = msg;
      appendLog(msg, 'info');
    }, signal);

    getSyncLog().forEach(e => appendLog(e.msg, e.level));
    const sheets = result.sheets || {};
    let summaryHtml = '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    summaryHtml += `<span style="color:#10b981;font-weight:600;">✓ ${result.inserted} insertados</span>`;
    summaryHtml += `<span style="color:#3b82f6;font-weight:600;">↻ ${result.updated} actualizados</span>`;
    if (result.failed > 0) summaryHtml += `<span style="color:#ef4444;font-weight:600;">✕ ${result.failed} fallidos</span>`;
    if (result.aborted) summaryHtml += '<span style="color:#f59e0b;font-weight:600;">⏹ Detenido</span>';
    summaryHtml += '</div>';
    for (const [name, info] of Object.entries(sheets)) {
      summaryHtml += `<div style="margin-top:6px;font-size:11px;color:var(--muted);">${name}: ↓${info.downloaded} parseadas ${info.parsed} | +${info.inserted} ~${info.updated} ✕${info.failed}</div>`;
    }
    $('syncPanelSummary').innerHTML = summaryHtml;

    await loadCatalogFromDB();
    renderCategories();
    renderCatalog();
    renderViewerTable();
    toast(result.aborted ? '⏹ Detenido' : '✓ Sincronización completada', result.aborted ? '' : 'success');
  } catch (e) {
    appendLog('Error: ' + e.message, 'error');
    toast('Error: ' + e.message, 'danger');
  } finally {
    syncAbortController = null;
    $('btnStartSync').style.display = '';
    $('btnStopSync').style.display = 'none';
    $('syncPanelStatus').textContent = 'Completado';
  }
}

function stopSync() {
  if (syncAbortController) {
    syncAbortController.abort();
    $('syncPanelStatus').textContent = 'Deteniendo...';
  }
}

// === CATALOG VIEWER ===
function openCatalogViewer() {
  $('catalogViewerModal').classList.add('open');
  loadViewerProducts();
  $('btnGoToEditor').style.display = isAdmin() ? 'inline-flex' : 'none';
  $('btnSyncCatalog').style.display = isAdmin() ? 'inline-flex' : 'none';
  renderViewerCategories();
}

function closeCatalogViewer() { $('catalogViewerModal').classList.remove('open'); }

let viewerProducts = [];

function renderViewerCategories() {
  const catSel = $('viewerCategory');
  const currentCat = catSel.value;
  const cats = [...new Set(CATALOG.map(i => i.category))].sort();
  catSel.innerHTML = '<option value="">Todas las categorías</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.length > 40 ? c.slice(0, 40) + '…' : c;
    catSel.appendChild(opt);
  });
  catSel.value = currentCat;
  renderViewerSubcategories(currentCat);
}

function renderViewerSubcategories(selectedCat) {
  const subSel = $('viewerSubcategory');
  if (!subSel) return;
  const currentSub = subSel.value;
  subSel.innerHTML = '<option value="">Todas las subcategorías</option>';
  const source = selectedCat ? CATALOG.filter(i => i.category === selectedCat) : CATALOG;
  const subs = [...new Set(source.map(i => i.subcategory).filter(Boolean))].sort();
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s.length > 35 ? s.slice(0, 35) + '…' : s;
    subSel.appendChild(opt);
  });
  if (currentSub && [...subSel.options].some(o => o.value === currentSub)) subSel.value = currentSub;
}

async function loadViewerProducts() {
  $('viewerBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Cargando...</td></tr>';
  viewerProducts = CATALOG;
  renderViewerTable();
}

function renderViewerTable() {
  const q = $('viewerSearch').value.toLowerCase().trim();
  const cat = $('viewerCategory').value;
  const sub = $('viewerSubcategory')?.value || '';
  let filtered = viewerProducts;
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (sub) filtered = filtered.filter(p => p.subcategory === sub);
  if (q) filtered = filtered.filter(p =>
    (p.sourceId || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.subcategory || '').toLowerCase().includes(q) ||
    (p.model || '').toLowerCase().includes(q)
  );
  $('viewerCount').textContent = filtered.length + ' productos' + (filtered.length !== viewerProducts.length ? ' (de ' + viewerProducts.length + ')' : '');
  const tbody = $('viewerBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No se encontraron productos</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(p => {
    const pricing = calcItemPrice(p);
    return `<tr>
      <td>${p.sourceId || ''}</td>
      <td>${p.subcategory || ''}</td>
      <td>${p.description || ''}${p.model ? ' <small>(' + p.model + ')</small>' : ''}</td>
      <td class="right">${fmt(p.cost || 0)}</td>
      <td class="center">${p.hasGanancia ? '✅' : '—'}</td>
      <td class="center">${p.hasInstalacion ? '✅' : '—'}</td>
      <td class="right">${fmt(pricing.priceBeforeIva)}</td>
      <td class="right">${fmt(pricing.iva)}</td>
      <td class="right"><strong>${fmt(pricing.subtotalEquipo)}</strong></td>
    </tr>`;
  }).join('');
}

window.openCatalogViewer = openCatalogViewer;
window.closeCatalogViewer = closeCatalogViewer;
window.renderViewerTable = renderViewerTable;

// === CATALOG EDITOR ===
function openCatalogEditor() {
  if (!isAdmin()) { toast('Solo admin', 'danger'); return; }
  $('catalogEditorModal').classList.add('open');
  loadEditorProducts();
}

function closeCatalogEditor() {
  if (Object.keys(editorChanges).size > 0 || editorDeleted.size > 0) {
    if (!confirm('Hay cambios sin guardar. ¿Cerrar?')) return;
  }
  $('catalogEditorModal').classList.remove('open');
  editorProducts = []; editorChanges = {}; editorDeleted = new Set();
}

let editorProducts = [];
let editorChanges = {};
let editorDeleted = new Set();

async function loadEditorProducts() {
  $('editorBody').innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">Cargando...</td></tr>';
  try {
    const [eqRes, mtRes, svRes] = await Promise.all([
      supabase.from('equipos').select('*').order('categoria'),
      supabase.from('materiales').select('*').order('categoria'),
      supabase.from('servicios').select('*').order('categoria'),
    ]);
    editorProducts = [];
    (eqRes.data || []).forEach(r => editorProducts.push({
      _table: 'equipos', id: r.id, source_id: r.source_id, categoria: r.categoria,
      subcategoria: r.subcategoria, modelo: r.modelo, producto: r.producto,
      unidades: r.unidades, costo_unitario: r.costo_unitario,
      ganancia_flag: r.ganancia_flag, instalacion_flag: r.instalacion_flag,
      ultima_act: r.ultima_act, proveedor: r.proveedor, observaciones: r.observaciones,
    }));
    (mtRes.data || []).forEach(r => editorProducts.push({
      _table: 'materiales', id: r.id, source_id: r.source_id, categoria: r.categoria,
      subcategoria: r.subcategoria, modelo: '', producto: r.producto,
      unidades: r.unidades, costo_unitario: r.costo_unitario,
      ganancia_flag: r.ganancia_flag, instalacion_flag: r.instalacion_flag,
      ultima_act: null, proveedor: '', observaciones: r.observaciones,
    }));
    (svRes.data || []).forEach(r => editorProducts.push({
      _table: 'servicios', id: r.id, source_id: r.source_id, categoria: r.categoria,
      subcategoria: r.subcategoria, modelo: '', producto: r.servicio,
      unidades: '', costo_unitario: r.costo_mensual,
      ganancia_flag: false, instalacion_flag: false,
      ultima_act: null, proveedor: '', observaciones: r.descripcion || r.observaciones,
    }));
    editorChanges = {}; editorDeleted = new Set();
    const cats = [...new Set(editorProducts.map(p => p.categoria))].sort();
    const sel = $('editorCategory');
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    cats.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c.length > 50 ? c.slice(0, 50) + '…' : c; sel.appendChild(opt); });
    renderEditorTable();
  } catch (e) {
    $('editorBody').innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;color:red;">Error: ' + e.message + '</td></tr>';
  }
}

function renderEditorTable() {
  const q = $('editorSearch').value.toLowerCase().trim();
  const cat = $('editorCategory').value;
  let filtered = editorProducts.map((p, idx) => ({ ...p, _idx: idx }));
  if (cat) filtered = filtered.filter(p => p.categoria === cat);
  if (q) filtered = filtered.filter(p => (p.source_id || '').toLowerCase().includes(q) || (p.producto || '').toLowerCase().includes(q) || (p.subcategoria || '').toLowerCase().includes(q));
  $('editorCount').textContent = filtered.length + ' productos' + (filtered.length !== editorProducts.length ? ' (de ' + editorProducts.length + ')' : '');
  const tbody = $('editorBody');
  if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">Sin resultados</td></tr>'; return; }
  tbody.innerHTML = filtered.map(p => {
    const idx = p._idx;
    const ch = editorChanges[idx] || {};
    const isDel = editorDeleted.has(idx);
    const rowClass = isDel ? 'row-deleted' : (Object.keys(ch).length > 0 ? 'row-modified' : '');
    const g = (f) => ch[f] !== undefined ? ch[f] : (p[f] ?? '');
    const tableTag = `<span class="table-tag table-tag-${p._table}">${p._table}</span>`;
    return `<tr class="${rowClass}" data-idx="${idx}">
      <td>${tableTag}<br><input value="${escAttr(g('source_id'))}" onchange="editorField(${idx},'source_id',this.value)"></td>
      <td><input value="${escAttr(g('categoria'))}" onchange="editorField(${idx},'categoria',this.value)"></td>
      <td><input value="${escAttr(g('subcategoria'))}" onchange="editorField(${idx},'subcategoria',this.value)"></td>
      <td><input value="${escAttr(g('producto'))}" onchange="editorField(${idx},'producto',this.value)"></td>
      <td><input type="number" step="0.01" value="${g('costo_unitario')}" onchange="editorField(${idx},'costo_unitario',parseFloat(this.value)||0)"></td>
      <td style="text-align:center;"><input type="checkbox" ${g('ganancia_flag') ? 'checked' : ''} onchange="editorField(${idx},'ganancia_flag',this.checked)"></td>
      <td style="text-align:center;"><input type="checkbox" ${g('instalacion_flag') ? 'checked' : ''} onchange="editorField(${idx},'instalacion_flag',this.checked)"></td>
      <td><input value="${escAttr(g('ultima_act') || '')}" onchange="editorField(${idx},'ultima_act',this.value||null)"></td>
      <td><input value="${escAttr(g('proveedor'))}" onchange="editorField(${idx},'proveedor',this.value)"></td>
      <td><input value="${escAttr(g('observaciones'))}" onchange="editorField(${idx},'observaciones',this.value)"></td>
      <td style="text-align:center;"><button class="del-btn" onclick="editorToggleDelete(${idx})" title="${isDel ? 'Restaurar' : 'Eliminar'}">${isDel ? '↩' : '✕'}</button></td>
    </tr>`;
  }).join('');
}

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

window.editorField = function(idx, field, value) {
  if (!editorChanges[idx]) editorChanges[idx] = {};
  editorChanges[idx][field] = value;
  const row = document.querySelector(`tr[data-idx="${idx}"]`);
  if (row && !editorDeleted.has(idx)) row.classList.add('row-modified');
};

window.editorToggleDelete = function(idx) {
  if (editorDeleted.has(idx)) { editorDeleted.delete(idx); }
  else { const p = editorProducts[idx]; if (!confirm('¿Eliminar "' + (p.producto || p.source_id || '').slice(0, 60) + '"?')) return; editorDeleted.add(idx); }
  renderEditorTable();
};

window.addNewProduct = function() {
  const newIdx = editorProducts.length;
  editorProducts.push({
    _table: 'equipos', id: null, source_id: '', categoria: $('editorCategory').value || '',
    subcategoria: '', modelo: '', producto: '', unidades: '', costo_unitario: 0,
    ganancia_flag: false, instalacion_flag: false, ultima_act: null, proveedor: '', observaciones: '',
  });
  editorChanges[newIdx] = { producto: '', categoria: $('editorCategory').value || '' };
  renderEditorTable();
  $('editorTable').parentElement.scrollTop = $('editorTable').parentElement.scrollHeight;
};

window.saveCatalogEdits = async function() {
  if (!isAdmin()) { toast('Solo admin', 'danger'); return; }
  const btn = document.querySelector('#catalogEditorModal .btn-primary');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    for (const idx of editorDeleted) { const p = editorProducts[idx]; if (p.id) { const { error } = await supabase.from(p._table).delete().eq('id', p.id); if (error) throw error; } }
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr); const p = editorProducts[idx];
      if (editorDeleted.has(idx)) continue;
      if (p.id) { const { error } = await supabase.from(p._table).update(changes).eq('id', p.id); if (error) throw error; }
    }
    const inserts = [];
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr); const p = editorProducts[idx];
      if (editorDeleted.has(idx) || p.id) continue;
      const row = { ...p, ...changes }; delete row.id; delete row._table; delete row._idx;
      inserts.push({ table: p._table, data: row });
    }
    for (const ins of inserts) { const { error } = await supabase.from(ins.table).insert(ins.data); if (error) throw error; }
    toast(`✓ Guardado: ${Object.keys(editorChanges).length} editados, ${inserts.length} nuevos, ${editorDeleted.size} eliminados`, 'success');
    await loadEditorProducts();
  } catch (e) { toast('Error: ' + e.message, 'danger'); }
  finally { btn.disabled = false; btn.textContent = '💾 Guardar cambios'; }
};

window.openCatalogEditor = openCatalogEditor;
window.closeCatalogEditor = closeCatalogEditor;
window.renderEditorTable = renderEditorTable;

// === BOOT ===
async function bootApp() {
  const dbLoaded = await loadCatalogFromDB();
  if (!dbLoaded) loadCustomCatalogIfExists();
  renderCategories();

  const totalItems = CATALOG.length;
  const withGanancia = CATALOG.filter(i => i.hasGanancia).length;
  const withInstalacion = CATALOG.filter(i => i.hasInstalacion).length;
  const suppliers = [...new Set(CATALOG.map(i => i.supplier).filter(Boolean))];
  console.log(`[BOOT] Catálogo: ${totalItems} ítems, ${withGanancia} con ganancia, ${withInstalacion} con instalación`);
  console.log(`[BOOT] Proveedores: ${suppliers.join(', ') || 'ninguno'}`);
  console.log(`[BOOT] Muestra de flags (primeros 5):`, CATALOG.slice(0, 5).map(i => ({
    id: i.sourceId, desc: i.description?.slice(0, 30), ganancia: i.hasGanancia, instalacion: i.hasInstalacion, supplier: i.supplier
  })));

  $('search').addEventListener('input', () => { catalogPage = 1; renderCatalog(); });
  $('categoryFilter').addEventListener('change', () => { catalogPage = 1; renderSubcategories($('categoryFilter').value); renderCatalog(); });
  $('subcategoryFilter').addEventListener('change', () => { catalogPage = 1; renderCatalog(); });
  $('viewerSearch').addEventListener('input', renderViewerTable);
  $('viewerCategory').addEventListener('change', () => { renderViewerSubcategories($('viewerCategory').value); renderViewerTable(); });
  if ($('viewerSubcategory')) $('viewerSubcategory').addEventListener('change', renderViewerTable);
  document.querySelectorAll('.quote-panel input, .quote-panel textarea').forEach(el => el.addEventListener('change', saveDraft));
  document.querySelectorAll('#clientName,#clientRuc,#clientAddress,#clientContact,#clientPhone,#clientEmail,#cotNum,#cotDate').forEach(el => el.addEventListener('input', syncPrintView));

  const raw = localStorage.getItem('quote_draft');
  if (raw) { try { const draft = JSON.parse(raw); if (draft.items && draft.items.length > 0) loadQuoteData(draft); } catch(e) {} }
  if (!$('cotNum').value) $('cotNum').value = generateCotNumber();
  if (!$('cotDate').value) $('cotDate').value = new Date().toISOString().split('T')[0];
  renderCatalog(); renderCart(); syncPrintView(); applyEmpresaHeader();
}

function syncPrintView() {
  $('printCotNum').textContent = $('cotNum').value || '—';
  $('printCotDate').textContent = $('cotDate').value || '—';
  $('printClientName').textContent = $('clientName').value || '—';
  $('printClientRuc').textContent = $('clientRuc').value || '—';
  $('printClientAddress').textContent = $('clientAddress').value || '—';
  $('printClientContact').textContent = $('clientContact').value || '—';
  $('printClientPhone').textContent = $('clientPhone').value || '—';
  $('printClientEmail').textContent = $('clientEmail').value || '—';
}
window.addEventListener('beforeprint', syncPrintView);

function applyEmpresaHeader() {}
function loadCustomCatalogIfExists() {
  const raw = localStorage.getItem('custom_catalog');
  if (!raw) return false;
  try { const custom = JSON.parse(raw); if (custom.length > 0) { CATALOG.length = 0; custom.forEach(i => CATALOG.push(i)); return true; } } catch(e) {}
  return false;
}
function resetCatalog() { if (!confirm('¿Restaurar catálogo desde DB?')) return; localStorage.removeItem('custom_catalog'); location.reload(); }

function enterApp(session) {
  currentSession = session;
  $('loginOverlay').classList.add('hidden');
  $('userChipName').textContent = session.nombre || session.user;
  const roleLabel = session.rol === 'admin' ? 'Administrador' : 'Vendedor';
  const roleBadge = $('userChipRole');
  if (roleBadge) roleBadge.textContent = roleLabel;
  const ddName = $('dropdownName');
  if (ddName) ddName.textContent = session.nombre || session.user;
  const ddRole = $('dropdownRole');
  if (ddRole) ddRole.textContent = roleLabel + ' · ' + (session.email || '');
  const btnEditCatalog = $('btnEditCatalog');
  if (btnEditCatalog) btnEditCatalog.style.display = session.rol === 'admin' ? 'block' : 'none';
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp().catch(e => console.error('Boot error:', e));
}
window._enterApp = enterApp;

// === EXPORTS ===
window.setModality = setModality;
window.updateSupplierMarginGlobal = updateSupplierMarginGlobal;
window.updateInstallationMargin = updateInstallationMargin;
window.handleSyncClick = handleSyncClick;
window.openSavedModal = openSavedModal;
window.closeSavedModal = closeSavedModal;
window.newQuote = newQuote;
window.saveQuote = saveQuote;
window.loadDraft = loadDraft;
window.resetCatalog = resetCatalog;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.toggleInstall = toggleInstall;
window.updateTechCost = updateTechCost;
window.toggleInstallationGlobal = toggleInstallationGlobal;
window.loadSaved = loadSaved;
window.deleteSaved = deleteSaved;
window.changeStatus = changeStatus;
window.applyHistoryFilters = applyHistoryFilters;
window.openSyncPanel = openSyncPanel;
window.closeSyncPanel = closeSyncPanel;
window.startSync = startSync;
window.stopSync = stopSync;
window.goToPage = goToPage;
window.changePageSize = changePageSize;
