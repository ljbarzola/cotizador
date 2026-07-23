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
    toast('⚠️ Error al cargar catálogo: ' + e.message, 'warning');
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
const DEFAULT_SUPPLIER_MARGIN = 15;
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
    const effectiveMargin = c.customMargin ?? getSupplierMargin(item.supplier);
    const pricing = calcItemPrice(item, {
      supplierMargin: effectiveMargin,
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
        <div class="cat-item-info" onclick="openProductDetail(${realIdx})" style="cursor:pointer;">
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
      customMargin: null,
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

function updateItemMargin(idx, val) {
  cart[idx].customMargin = parseFloat(val) || null;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => { renderCart(); saveDraft(); }, 300);
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
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => { renderCart(); saveDraft(); }, 300);
}

function updateInstallationMargin(val) {
  installationMarginPct = parseFloat(val) || 0;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => { renderCart(); saveDraft(); }, 300);
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
  html += '<th class="right" style="width:60px;">Costo</th>';
  html += '<th class="center" style="width:42px;">Cant</th>';
  html += '<th class="right" style="width:50px;">Margen</th>';
  html += '<th class="right" style="width:60px;">PVP</th>';
  html += '<th class="center" style="width:40px;">Inst</th>';
  html += '<th style="width:28px;"></th>';
  html += '</tr></thead><tbody>';

  cart.forEach((c, idx) => {
    const item = CATALOG[c.catalogIdx];
    const effectiveMargin = c.customMargin ?? getSupplierMargin(item.supplier);
    const pricing = calcItemPrice(item, {
      supplierMargin: effectiveMargin,
      installMargin: installationMarginPct,
      techCost: c.techCost,
      installActive: c.installActive,
    });

    const lineTotal = pricing.total * c.qty;
    const badges = marginBadge(item);
    let marginCell;
    if (pricing.gananciaProveedor > 0) {
      marginCell = `<span class="supplier-detail">${fmt(pricing.gananciaProveedor * c.qty)}</span>`;
    } else {
      marginCell = '<span style="color:var(--muted);">—</span>';
    }

    const installCell = item.hasInstalacion
      ? (c.installActive
        ? `<span class="install-active">🟩 ${fmt(pricing.instalacionPrice * c.qty)}</span>`
        : '<span class="install-pending">⬛</span>')
      : '<span style="color:var(--muted);">—</span>';

    html += `<tr>
      <td class="item-num">${idx + 1}</td>
      <td class="item-desc item-desc-click" onclick="openCartItemDetail(${idx})" title="Ver detalle">
        <span class="item-desc-text">${item.description}</span>
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
      const isSinProveedor = supplier === 'Sin proveedor';

      supplierHtml += `<div class="supplier-group">`;
      supplierHtml += `<div class="supplier-group-header">`;
      supplierHtml += `<span class="supplier-name">${supplier} <span class="supplier-count">${items.length} ítem(s)</span></span>`;
      if (isSinProveedor) {
        supplierHtml += `<span class="supplier-hint">Margen individual por item ↓</span>`;
      } else {
        supplierHtml += `<div class="supplier-margin-input"><input type="number" min="0" max="100" step="1" value="${margin}" oninput="updateSupplierMarginGlobal('${supplier.replace(/'/g, "\\'")}', this.value)"><span>%</span></div>`;
      }
      supplierHtml += `</div>`;

      items.forEach(({ item, cartItem }) => {
        const effectiveMargin = isSinProveedor ? (cartItem.customMargin ?? margin) : margin;
        const pricing = calcItemPrice(item, { supplierMargin: effectiveMargin });
        const hasGanancia = item.hasGanancia;
        const hasCustom = cartItem.customMargin != null;
        const cartIdx = cart.indexOf(cartItem);
        supplierHtml += `<div class="supplier-group-item${hasGanancia ? ' sgi-active' : ''}${hasCustom ? ' sgi-custom' : ''}">`;
        supplierHtml += `<span class="sgi-code">${item.sourceId || ''}</span>`;
        supplierHtml += `<span class="sgi-desc">${item.description.slice(0, 35)}${item.description.length > 35 ? '…' : ''}</span>`;
        if (isSinProveedor && hasGanancia) {
          supplierHtml += `<div class="supplier-margin-input sgi-margin-inline"><input type="number" min="0" max="100" step="1" value="${effectiveMargin}" oninput="updateItemMargin(${cartIdx}, this.value)"><span>%</span></div>`;
        }
        supplierHtml += `<span class="sgi-cost">${fmt(item.cost)} → <strong>${fmt(pricing.priceBeforeIva)}</strong>${hasGanancia ? ' <span class="sgi-margin">+' + effectiveMargin + '%</span>' : ' <span class="sgi-no-margin">sin ganancia</span>'}</span>`;
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
    const effectiveMargin = c.customMargin ?? getSupplierMargin(item.supplier);
    const pricing = calcItemPrice(item, {
      supplierMargin: effectiveMargin,
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
        if (await showConfirm('Ya existe "' + data.cotNum + '". ¿Actualizar la existente?', 'Cotización duplicada', 'Actualizar')) {
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
  if (!await showConfirm('¿Eliminar esta cotización?', 'Eliminar cotización', 'Eliminar')) return;
  try {
    const { error } = await supabase.from('saved_quotes').delete().eq('id', id);
    if (error) throw error;
    if (currentQuoteId === id) currentQuoteId = null;
    historyQuotesCache = historyQuotesCache.filter(q => q.id !== id);
    applyHistoryFilters();
    toast('Cotización eliminada');
  } catch (e) { toast('Error: ' + e.message, 'danger'); }
}

async function newQuote() {
  if (cart.length > 0 && !await showConfirm('¿Limpiar todo y empezar nueva cotización?', 'Nueva cotización', 'Crear')) return;
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

async function closeCatalogEditor() {
  if (Object.keys(editorChanges).size > 0 || editorDeleted.size > 0) {
    if (!await showConfirm('Hay cambios sin guardar. ¿Cerrar?', 'Cambios sin guardar', 'Cerrar')) return;
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

window.editorToggleDelete = async function(idx) {
  if (editorDeleted.has(idx)) { editorDeleted.delete(idx); }
  else { const p = editorProducts[idx]; if (!await showConfirm('¿Eliminar "' + (p.producto || p.source_id || '').slice(0, 60) + '"?', 'Eliminar producto', 'Eliminar')) return; editorDeleted.add(idx); }
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
async function resetCatalog() { if (!await showConfirm('¿Restaurar catálogo desde DB?', 'Restaurar catálogo', 'Restaurar')) return; localStorage.removeItem('custom_catalog'); location.reload(); }

function enterApp(session) {
  currentSession = session;
  $('loginOverlay').classList.add('hidden');
  const chipName = $('userChipName');
  chipName.textContent = session.nombre || session.user;
  chipName.classList.add('user-chip-name-full');
  const roleLabel = session.rol === 'admin' ? 'Administrador' : 'Vendedor';
  const roleBadge = $('userChipRole');
  if (roleBadge) roleBadge.textContent = roleLabel;
  const ddName = $('dropdownName');
  if (ddName) ddName.textContent = session.nombre || session.user;
  const ddRole = $('dropdownRole');
  if (ddRole) ddRole.textContent = roleLabel + ' · ' + (session.email || '');
  const btnEditCatalog = $('btnEditCatalog');
  if (btnEditCatalog) btnEditCatalog.style.display = session.rol === 'admin' ? 'block' : 'none';
  const btnUserManagement = $('btnUserManagement');
  if (btnUserManagement) btnUserManagement.style.display = session.rol === 'admin' ? 'inline-block' : 'none';
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp().catch(e => { toast('Error al iniciar: ' + e.message, 'danger'); });
}
window._enterApp = enterApp;

// === CUSTOM CONFIRM MODAL ===
let _confirmResolve = null;
function showConfirm(message, title, okLabel) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    $('confirmTitle').textContent = title || 'Confirmar';
    $('confirmMessage').textContent = message;
    $('confirmOkBtn').textContent = okLabel || 'Aceptar';
    $('confirmModal').classList.add('open');
  });
}
function resolveConfirm(result) {
  $('confirmModal').classList.remove('open');
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null; }
}

// === PRODUCT DETAIL MODAL ===
function openProductDetail(idx) {
  const item = CATALOG[idx];
  if (!item) return;
  const price = calcItemPrice(item);
  const fmt2 = v => '$' + (v || 0).toFixed(2);
  const nl2br = s => esc(s).replace(/\n/g, '<br>');

  let html = `<div class="detail-grid">
    <div class="detail-row"><span class="label">Código:</span><span class="value" style="font-family:ui-monospace,monospace;">${esc(item.sourceId)}</span></div>`;
  if (item.model) html += `<div class="detail-row"><span class="label">Modelo:</span><span class="value">${esc(item.model)}</span></div>`;
  html += `<div class="detail-row" style="grid-column:1/-1;"><span class="label">Descripción:</span><span class="value" style="font-weight:600;">${esc(item.description)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Categoría:</span><span class="value">${esc(item.category)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Subcategoría:</span><span class="value">${esc(item.subcategory)}</span></div>`;
  if (item.supplier) html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value">${esc(item.supplier)}</span></div>`;
  if (item.unit) html += `<div class="detail-row"><span class="label">Unidad:</span><span class="value">${esc(item.unit)}</span></div>`;
  if (item.observations) {
    const label = item.isService ? 'Descripción detallada:' : 'Observaciones:';
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">${label}</span><div class="detail-obs-text">${nl2br(item.observations)}</div></div>`;
  }
  if (item.lastUpdate) html += `<div class="detail-row"><span class="label">Última act.:</span><span class="value">${esc(item.lastUpdate)}</span></div>`;

  html += `<div class="detail-divider"></div>`;
  html += `<div class="detail-row"><span class="label">Costo base:</span><span class="value">${fmt2(price.baseCost)}</span></div>`;
  if (price.gananciaProveedor > 0) html += `<div class="detail-row"><span class="label">Ganancia proveedor:</span><span class="value">${fmt2(price.gananciaProveedor)}</span></div>`;
  html += `<div class="detail-row"><span class="label">IVA (15%):</span><span class="value">${fmt2(price.iva)}</span></div>`;
  html += `<div class="detail-row"><span class="label">PVP (con IVA):</span><span class="value" style="font-weight:700;color:var(--primary);font-size:14px;">${fmt2(price.subtotalEquipo)}</span></div>`;
  if (price.hasInstalacion) html += `<div class="detail-row"><span class="label">Requiere instalación:</span><span class="value">🟩 Sí</span></div>`;
  if (price.hasGanancia) html += `<div class="detail-row"><span class="label">Tiene ganancia:</span><span class="value">Sí</span></div>`;
  html += `</div>`;

  $('productDetailBody').innerHTML = html;
  $('productDetailModal').classList.add('open');
}
function closeProductDetail() {
  $('productDetailModal').classList.remove('open');
}

function openCartItemDetail(idx) {
  const c = cart[idx];
  if (!c) return;
  const item = CATALOG[c.catalogIdx];
  if (!item) return;
  const effectiveMargin = c.customMargin ?? getSupplierMargin(item.supplier);
  const pricing = calcItemPrice(item, {
    supplierMargin: effectiveMargin,
    installMargin: installationMarginPct,
    techCost: c.techCost,
    installActive: c.installActive,
  });
  const fmt2 = v => '$' + (v || 0).toFixed(2);
  const nl2br = s => esc(s).replace(/\n/g, '<br>');

  let html = `<div class="detail-grid">
    <div class="detail-row"><span class="label">Código:</span><span class="value" style="font-family:ui-monospace,monospace;">${esc(item.sourceId)}</span></div>`;
  if (item.model) html += `<div class="detail-row"><span class="label">Modelo:</span><span class="value">${esc(item.model)}</span></div>`;
  html += `<div class="detail-row" style="grid-column:1/-1;"><span class="label">Descripción:</span><span class="value" style="font-weight:600;">${esc(item.description)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Categoría:</span><span class="value">${esc(item.category)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Subcategoría:</span><span class="value">${esc(item.subcategory)}</span></div>`;
  if (item.supplier) html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value">${esc(item.supplier)}</span></div>`;
  if (!item.supplier) html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value" style="color:#d97706;">Sin proveedor</span></div>`;
  if (item.observations) {
    const label = item.isService ? 'Descripción detallada:' : 'Observaciones:';
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">${label}</span><div class="detail-obs-text">${nl2br(item.observations)}</div></div>`;
  }

  html += `<div class="detail-divider"></div>`;
  html += `<div class="detail-row"><span class="label">Costo base:</span><span class="value">${fmt2(pricing.baseCost)}</span></div>`;
  if (item.hasGanancia) html += `<div class="detail-row"><span class="label">Margen (${effectiveMargin}%):</span><span class="value">${fmt2(pricing.gananciaProveedor)}</span></div>`;
  html += `<div class="detail-row"><span class="label">IVA (15%):</span><span class="value">${fmt2(pricing.iva)}</span></div>`;
  html += `<div class="detail-row"><span class="label">PVP unitario:</span><span class="value" style="font-weight:700;color:var(--primary);">${fmt2(pricing.priceBeforeIva)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Cantidad:</span><span class="value">${c.qty}</span></div>`;
  html += `<div class="detail-row"><span class="label">Subtotal:</span><span class="value" style="font-weight:700;color:var(--primary);font-size:14px;">${fmt2(pricing.total * c.qty)}</span></div>`;
  if (item.hasInstalacion) {
    html += `<div class="detail-row"><span class="label">Instalación:</span><span class="value">${c.installActive ? '🟩 Activa' : '⬛ Inactiva'}</span></div>`;
    if (c.installActive) {
      html += `<div class="detail-row"><span class="label">Costo técnico:</span><span class="value">${fmt2(c.techCost)}</span></div>`;
      html += `<div class="detail-row"><span class="label">Margen instalación (${installationMarginPct}%):</span><span class="value">${fmt2(pricing.gananciaInstalacion)}</span></div>`;
      html += `<div class="detail-row"><span class="label">Instalación total:</span><span class="value" style="font-weight:600;">${fmt2(pricing.instalacionPrice * c.qty)}</span></div>`;
    }
  }
  html += `</div>`;

  $('productDetailBody').innerHTML = html;
  $('productDetailModal').classList.add('open');
}

// === HELP MODAL ===
function openHelpModal() {
  $('helpModal').classList.add('open');
}
function closeHelpModal() {
  $('helpModal').classList.remove('open');
}
function toggleHelpSection(btn) {
  const content = btn.nextElementSibling;
  const arrow = btn.querySelector('.help-arrow');
  const isOpen = content.style.display === 'block';
  content.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
}

// === TEMPLATES ===
let _currentPreviewTemplateId = null;

function openTemplatesModal() {
  $('templatesModal').classList.add('open');
  renderTemplateList();
}
function closeTemplatesModal() {
  $('templatesModal').classList.remove('open');
}

function filterTemplates() {
  renderTemplateList();
}

function renderTemplateList() {
  const search = ($('tplSearch')?.value || '').toLowerCase();
  const type = $('tplType')?.value || '';
  const industry = $('tplIndustry')?.value || '';
  let templates = window.getAllTemplates ? window.getAllTemplates() : [];
  if (search) templates = templates.filter(t => t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search));
  if (type) templates = templates.filter(t => t.clientType === type);
  if (industry) templates = templates.filter(t => t.industry === industry);

  const list = $('templateList');
  if (!list) return;
  if (!templates.length) {
    list.innerHTML = '<div class="tpl-empty">No se encontraron plantillas con los filtros seleccionados.</div>';
    return;
  }

  const typeLabels = { pequeña: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
  const industryLabels = { banco: 'Banco', comercio: 'Comercio', oficina: 'Oficina', industrial: 'Industrial', salud: 'Salud' };

  list.innerHTML = templates.map(t => {
    const isSample = t.id.startsWith('tpl-small-') || t.id.startsWith('tpl-medium-') || t.id.startsWith('tpl-large-');
    return `
    <div class="tpl-card" onclick="openTemplatePreview('${t.id}')">
      <div class="tpl-card-header">
        <div class="tpl-card-title">${esc(t.name)}</div>
        <div class="tpl-card-actions" onclick="event.stopPropagation()">
          <button onclick="openTemplatePreview('${t.id}')" title="Vista previa">👁️</button>
          <button onclick="loadTemplateDirect('${t.id}')" title="Cargar plantilla">📥</button>
          <button onclick="downloadTemplate('${t.id}')" title="Descargar copia">🖨️</button>
          <button onclick="deleteTemplateConfirm('${t.id}')" title="Eliminar" style="color:var(--danger)">🗑️</button>
        </div>
      </div>
      <div class="tpl-card-desc">${esc(t.description)}</div>
      <div class="tpl-card-meta">
        <span class="tpl-badge tpl-badge-type">${typeLabels[t.clientType] || t.clientType}</span>
        <span class="tpl-badge tpl-badge-industry">${industryLabels[t.industry] || t.industry}</span>
        <span class="tpl-badge tpl-badge-items">${t.items.length} productos</span>
        ${isSample ? '<span class="tpl-badge tpl-badge-items" style="background:#e0e7ff;color:#3730a3;">Ejemplo</span>' : '<span class="tpl-badge tpl-badge-custom">Personalizada</span>'}
      </div>
    </div>`;
  }).join('');
}

function openTemplatePreview(id) {
  const tpl = window.getTemplate(id);
  if (!tpl) return;
  _currentPreviewTemplateId = id;
  $('tplPreviewTitle').textContent = tpl.name;

  const typeLabels = { pequeña: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
  const industryLabels = { banco: 'Banco', comercio: 'Comercio', oficina: 'Oficina', industrial: 'Industrial', salud: 'Salud' };

  const tplSupplierMargins = tpl.supplierMargins || {};
  const tplInstallMargin = tpl.installMargin ?? installationMarginPct;

  function getTplSupplierMargin(supplier) {
    const key = supplier || 'Sin proveedor';
    return tplSupplierMargins[key] ?? DEFAULT_SUPPLIER_MARGIN;
  }

  let html = `<div class="tpl-preview-header">
    <h3>${esc(tpl.name)}</h3>
    <p>${esc(tpl.description)}</p>
  </div>`;

  html += `<div class="tpl-preview-client">
    <div><span class="label">Cliente:</span> <span class="value">${esc(tpl.client.name)}</span></div>
    <div><span class="label">RUC:</span> <span class="value">${esc(tpl.client.ruc)}</span></div>
    <div><span class="label">Dirección:</span> <span class="value">${esc(tpl.client.address)}</span></div>
    <div><span class="label">Contacto:</span> <span class="value">${esc(tpl.client.contact)}</span></div>
    <div><span class="label">Teléfono:</span> <span class="value">${esc(tpl.client.phone)}</span></div>
    <div><span class="label">Email:</span> <span class="value">${esc(tpl.client.email)}</span></div>
    <div><span class="label">Tamaño:</span> <span class="value">${typeLabels[tpl.clientType] || tpl.clientType}</span></div>
    <div><span class="label">Industria:</span> <span class="value">${industryLabels[tpl.industry] || tpl.industry}</span></div>
  </div>`;

  html += `<table class="tpl-preview-table"><thead><tr>
    <th>#</th><th>ID</th><th>Descripción</th><th>Cant.</th><th>Costo U.</th><th>PVP U.</th><th>Subtotal</th><th>Instalación</th>
  </tr></thead><tbody>`;

  let totalEquipos = 0;
  let totalIVA = 0;
  let totalInstCost = 0;
  let totalInstProfit = 0;

  tpl.items.forEach((item, i) => {
    const catItem = CATALOG.find(c => c.sourceId === item.sourceId);
    if (!catItem) return;
    const qty = item.qty || 1;

    const pricing = calcItemPrice(catItem, {
      supplierMargin: getTplSupplierMargin(catItem.supplier),
      installMargin: tplInstallMargin,
      techCost: item.techCost || 0,
      installActive: item.installActive || false,
    });

    const pvpUnit = pricing.subtotalEquipo / qty;
    totalEquipos += pricing.subtotalEquipo * qty - pricing.iva * qty;
    totalIVA += pricing.iva * qty;
    if (item.installActive && pricing.instalacionPrice > 0) {
      totalInstCost += (item.techCost || 0) * qty;
      totalInstProfit += pricing.gananciaInstalacion * qty;
    }

    let installInfo = '—';
    if (item.installActive && pricing.instalacionPrice > 0) {
      installInfo = `🟩 $${pricing.instalacionPrice.toFixed(2)}/u`;
    } else if (item.installActive) {
      installInfo = '🟩 Sí';
    }

    html += `<tr>
      <td>${i + 1}</td>
      <td style="font-family:ui-monospace,monospace;font-size:11px;">${esc(catItem.sourceId)}</td>
      <td>${esc(catItem.description)}</td>
      <td>${qty}</td>
      <td>$${catItem.cost.toFixed(2)}</td>
      <td>$${pricing.subtotalEquipo.toFixed(2)}</td>
      <td>$${(pricing.subtotalEquipo * qty).toFixed(2)}</td>
      <td>${installInfo}</td>
    </tr>`;
  });

  html += `</tbody></table>`;

  const grandTotal = totalEquipos + totalIVA + totalInstCost + totalInstProfit;
  html += `<div class="tpl-preview-totals">
    <div class="tpl-preview-total-row"><span>Equipos/Materiales:</span><span>$${totalEquipos.toFixed(2)}</span></div>
    <div class="tpl-preview-total-row"><span>IVA (15%):</span><span>$${totalIVA.toFixed(2)}</span></div>`;
  if (totalInstCost > 0) {
    html += `<div class="tpl-preview-total-row"><span>Costo instalación:</span><span>$${totalInstCost.toFixed(2)}</span></div>`;
    html += `<div class="tpl-preview-total-row"><span>Margen instalación (${tplInstallMargin}%):</span><span>$${totalInstProfit.toFixed(2)}</span></div>`;
  }
  html += `<div class="tpl-preview-total-row tpl-preview-total-final"><span>Total:</span><span>$${grandTotal.toFixed(2)}</span></div>
  </div>`;

  $('tplPreviewBody').innerHTML = html;
  $('templatePreviewModal').classList.add('open');
}

function closeTemplatePreview() {
  $('templatePreviewModal').classList.remove('open');
  _currentPreviewTemplateId = null;
}

function loadTemplateFromPreview() {
  if (!_currentPreviewTemplateId) return;
  loadTemplateDirect(_currentPreviewTemplateId);
  closeTemplatePreview();
  closeTemplatesModal();
}

async function loadTemplateDirect(id) {
  const tpl = window.getTemplate(id);
  if (!tpl) return;
  if (cart.length > 0 && !await showConfirm('Esto reemplazará la cotización actual. ¿Continuar?', 'Cargar plantilla', 'Cargar')) return;

  // Fill client fields
  $('clientName').value = tpl.client.name || '';
  $('clientRuc').value = tpl.client.ruc || '';
  $('clientAddress').value = tpl.client.address || '';
  $('clientContact').value = tpl.client.contact || '';
  $('clientPhone').value = tpl.client.phone || '';
  $('clientEmail').value = tpl.client.email || '';

  // Resolve template items to cart (skip missing silently)
  cart = [];
  for (const ti of tpl.items) {
    const catIdx = CATALOG.findIndex(c => c.sourceId === ti.sourceId);
    if (catIdx >= 0) {
      cart.push({ catalogIdx: catIdx, qty: ti.qty || 1, installActive: ti.installActive || false, techCost: ti.techCost || 0 });
    }
  }

  // Restore margins
  if (tpl.supplierMargins) supplierMargins = { ...tpl.supplierMargins };
  if (tpl.installMargin != null) installationMarginPct = tpl.installMargin;
  if (tpl.installationEnabled != null) installationEnabled = tpl.installationEnabled;

  renderCatalog();
  renderCart();
  renderMarginConfig();
  saveDraft();
  toast('✅ Plantilla cargada: ' + tpl.name, 'success');
  closeTemplatesModal();
}

function downloadTemplate(id) {
  const tpl = window.getTemplate(id);
  if (!tpl) return;

  closeTemplatePreview();

  const origName = $('clientName').value;
  const origRuc = $('clientRuc').value;
  const origAddr = $('clientAddress').value;
  const origContact = $('clientContact').value;
  const origPhone = $('clientPhone').value;
  const origEmail = $('clientEmail').value;
  const origCotNum = $('cotNum').value;
  const origCotDate = $('cotDate').value;
  const origCart = [...cart];
  const origMargins = { ...supplierMargins };
  const origInstallMargin = installationMarginPct;
  const origInstallEnabled = installationEnabled;

  $('clientName').value = tpl.client.name || '';
  $('clientRuc').value = tpl.client.ruc || '';
  $('clientAddress').value = tpl.client.address || '';
  $('clientContact').value = tpl.client.contact || '';
  $('clientPhone').value = tpl.client.phone || '';
  $('clientEmail').value = tpl.client.email || '';
  $('cotNum').value = 'PLANTILLA-' + tpl.id.replace('tpl-', '').toUpperCase();
  $('cotDate').value = new Date().toISOString().slice(0, 10);

  cart = [];
  for (const ti of tpl.items) {
    const catIdx = CATALOG.findIndex(c => c.sourceId === ti.sourceId);
    if (catIdx >= 0) {
      cart.push({ catalogIdx: catIdx, qty: ti.qty || 1, installActive: ti.installActive || false, techCost: ti.techCost || 0 });
    }
  }
  if (tpl.supplierMargins) supplierMargins = { ...tpl.supplierMargins };
  if (tpl.installMargin != null) installationMarginPct = tpl.installMargin;
  if (tpl.installationEnabled != null) installationEnabled = tpl.installationEnabled;

  renderCart();
  renderMarginConfig();
  syncPrintView();

  setTimeout(() => {
    window.print();

    $('clientName').value = origName;
    $('clientRuc').value = origRuc;
    $('clientAddress').value = origAddr;
    $('clientContact').value = origContact;
    $('clientPhone').value = origPhone;
    $('clientEmail').value = origEmail;
    $('cotNum').value = origCotNum;
    $('cotDate').value = origCotDate;
    cart = origCart;
    supplierMargins = origMargins;
    installationMarginPct = origInstallMargin;
    installationEnabled = origInstallEnabled;
    renderCart();
    renderMarginConfig();
    syncPrintView();
  }, 200);
}

// === SAVE AS TEMPLATE ===
// === SAVE AS TEMPLATE MODAL ===
let _saveTemplateResolve = null;
function showSaveTemplateModal(defaultName) {
  return new Promise(resolve => {
    _saveTemplateResolve = resolve;
    $('tplSaveName').value = defaultName || '';
    $('tplSaveDesc').value = '';
    $('tplSaveType').value = 'mediana';
    $('tplSaveIndustry').value = 'comercio';
    $('saveTemplateModal').classList.add('open');
    setTimeout(() => $('tplSaveName').focus(), 100);
  });
}
function resolveSaveTemplate(save) {
  $('saveTemplateModal').classList.remove('open');
  if (!_saveTemplateResolve) return;
  if (save) {
    const name = $('tplSaveName').value.trim();
    const desc = $('tplSaveDesc').value.trim();
    const type = $('tplSaveType').value;
    const industry = $('tplSaveIndustry').value;
    _saveTemplateResolve({ name, desc, type, industry });
  } else {
    _saveTemplateResolve(null);
  }
  _saveTemplateResolve = null;
}

async function saveCurrentAsTemplate() {
  if (cart.length === 0) { toast('⚠️ Agrega productos primero', 'warning'); return; }
  const clientName = $('clientName').value.trim();
  if (!clientName) { toast('⚠️ Ingresa el nombre del cliente', 'warning'); return; }

  const result = await showSaveTemplateModal(clientName + ' - ');
  if (!result || !result.name) return;

  const items = cart.map(c => ({
    sourceId: CATALOG[c.catalogIdx]?.sourceId || '',
    qty: c.qty,
    installActive: c.installActive,
    techCost: c.techCost,
  })).filter(it => it.sourceId);

  if (!items.length) { toast('⚠️ No se pudieron resolver los productos', 'warning'); return; }

  const tpl = {
    id: 'tpl-' + Date.now(),
    name: result.name,
    description: result.desc,
    clientType: result.type,
    industry: result.industry,
    client: {
      name: $('clientName').value.trim(),
      ruc: $('clientRuc').value.trim(),
      address: $('clientAddress').value.trim(),
      contact: $('clientContact').value.trim(),
      phone: $('clientPhone').value.trim(),
      email: $('clientEmail').value.trim(),
    },
    items,
    supplierMargins: { ...supplierMargins },
    installMargin: installationMarginPct,
    installationEnabled,
    isTemplate: true,
  };

  window.saveTemplate(tpl);
  toast('✅ Plantilla guardada: ' + result.name, 'success');
  renderTemplateList();
}

async function deleteTemplateConfirm(id) {
  if (!await showConfirm('¿Eliminar esta plantilla?', 'Eliminar plantilla', 'Eliminar')) return;
  window.deleteTemplate(id);
  toast('🗑️ Plantilla eliminada', 'success');
  renderTemplateList();
}

function downloadTemplatePdf(id) {
  downloadTemplate(id || _currentPreviewTemplateId);
}

// === USER MANAGEMENT ===
let _usersCache = [];

async function openUserManagement() {
  $('userManagementModal').classList.add('open');
  $('usersTableBody').innerHTML = '';
  $('usersLoading').style.display = 'block';
  $('createUserForm').style.display = 'none';
  await loadUsers();
}

function closeUserManagement() {
  $('userManagementModal').classList.remove('open');
}

async function loadUsers() {
  $('usersLoading').style.display = 'block';
  $('usersTableBody').innerHTML = '';
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    _usersCache = data || [];
    renderUsersTable();
    if (_usersCache.length === 0) {
      toast('⚠️ No se encontraron usuarios. ¿Ejecutaste fix_profiles_rls.sql?', 'warning');
    }
  } catch (e) {
    $('usersTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:16px;">Error: ${esc(e.message)}</td></tr>`;
  }
  $('usersLoading').style.display = 'none';
}

function renderUsersTable() {
  const tbody = $('usersTableBody');
  if (!_usersCache.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px;">No hay usuarios registrados</td></tr>';
    $('userManagementCount').textContent = '0 usuarios';
    return;
  }
  $('userManagementCount').textContent = _usersCache.length + ' usuario' + (_usersCache.length !== 1 ? 's' : '');
  tbody.innerHTML = _usersCache.map(u => {
    const rolBadge = u.rol === 'admin'
      ? '<span class="margin-badge margin-supplier">Admin</span>'
      : '<span class="margin-badge margin-none">Vendedor</span>';
    const estadoBadge = u.activo === false
      ? '<span class="margin-badge" style="background:#fee2e2;color:#991b1b;">Inactivo</span>'
      : '<span class="margin-badge" style="background:#d1fae5;color:#065f46;">Activo</span>';
    const isCurrent = currentSession && currentSession.userId === u.id;
    return `<tr style="${isCurrent ? 'background:#f0f9ff;' : ''}">
      <td style="font-weight:500;">${esc(u.nombre || '—')}</td>
      <td style="color:var(--muted);font-size:11px;">${esc(u.email || u.correo || '—')}</td>
      <td>${rolBadge}</td>
      <td class="center">${estadoBadge}</td>
      <td>
        <button class="btn btn-ghost" onclick='openEditUser(${JSON.stringify({id:u.id,nombre:u.nombre||"",email:u.email||u.correo||"",rol:u.rol||"vendedor",activo:u.activo!==false}).replace(/'/g,"&#39;")})' style="font-size:11px;padding:4px 10px;">✏️ Editar</button>
      </td>
    </tr>`;
  }).join('');
}

function showCreateUserForm() {
  $('createUserForm').style.display = 'block';
  $('newUserName').value = '';
  $('newUserEmail').value = '';
  $('newUserPassword').value = '';
  $('newUserRole').value = 'vendedor';
  $('createUserError').style.display = 'none';
  $('newUserName').focus();
}

function hideCreateUserForm() {
  $('createUserForm').style.display = 'none';
}

async function createUser() {
  const name = $('newUserName').value.trim();
  const email = $('newUserEmail').value.trim();
  const password = $('newUserPassword').value;
  const role = $('newUserRole').value;
  const errEl = $('createUserError');

  if (!email || !password) {
    errEl.textContent = 'Ingresa email y contraseña';
    errEl.style.display = 'block';
    return;
  }

  const btn = $('btnCreateUser');
  btn.disabled = true;
  btn.textContent = 'Creando...';
  errEl.style.display = 'none';

  try {
    const nombre = name || email.split('@')[0];
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, rol: role }
      }
    });
    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        nombre,
        rol: role,
        activo: true
      }, { onConflict: 'id' });
      if (profileError) {
        console.warn('Profile upsert:', profileError.message);
      }
    }

    if (data.user && !data.session) {
      toast('✅ Usuario creado: ' + email + '. Necesita confirmar email para ingresar.', 'success');
    } else {
      toast('✅ Usuario creado: ' + email, 'success');
    }
    hideCreateUserForm();
    await loadUsers();
  } catch (e) {
    let msg = e.message || 'Error al crear usuario';
    if (msg.includes('already registered')) msg = 'Este email ya está registrado';
    if (msg.includes('Unable to validate email address')) msg = 'Email no válido';
    if (msg.includes('Password should be at least')) msg = 'La contraseña es muy corta (mínimo 6 caracteres)';
    if (msg.includes('Signups not allowed')) msg = 'Registro deshabilitado. Actívalo en Supabase Dashboard → Authentication → Providers';
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear usuario';
  }
}

async function toggleUserActive(userId, currentlyActive) {
  const action = currentlyActive ? 'desactivar' : 'activar';
  if (!await showConfirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} este usuario?`, `${action.charAt(0).toUpperCase() + action.slice(1)} usuario`, action.charAt(0).toUpperCase() + action.slice(1))) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ activo: !currentlyActive })
      .eq('id', userId);
    if (error) throw error;
    toast(currentlyActive ? '🔴 Usuario desactivado' : '🟢 Usuario activado', 'success');
    await loadUsers();
  } catch (e) {
    toast('⚠️ Error: ' + e.message, 'danger');
  }
}

async function promoteUser(userId) {
  if (!await showConfirm('¿Promover a administrador?', 'Promover usuario', 'Promover')) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ rol: 'admin' })
      .eq('id', userId);
    if (error) throw error;
    toast('⭐ Ahora es administrador', 'success');
    await loadUsers();
  } catch (e) {
    toast('⚠️ Error: ' + e.message, 'danger');
  }
}

async function demoteUser(userId) {
  if (!await showConfirm('¿Quitar rol de administrador?', 'Degradar usuario', 'Degradar')) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ rol: 'vendedor' })
      .eq('id', userId);
    if (error) throw error;
    toast('⬇️ Ahora es vendedor', 'success');
    await loadUsers();
  } catch (e) {
    toast('⚠️ Error: ' + e.message, 'danger');
  }
}

function openEditUser(user) {
  $('editUserId').value = user.id;
  $('editUserName').value = user.nombre;
  $('editUserEmail').value = user.email;
  $('editUserPassword').value = '';
  $('editUserRole').value = user.rol;
  $('editUserActive').value = user.activo ? 'true' : 'false';
  $('editUserTitle').textContent = 'Editar: ' + (user.nombre || user.email);
  $('editUserError').style.display = 'none';
  $('editUserModal').classList.add('open');
}

function closeEditUser() {
  $('editUserModal').classList.remove('open');
}

async function saveEditUser() {
  const userId = $('editUserId').value;
  const nombre = $('newUserName') ? $('editUserName').value.trim() : $('editUserName').value.trim();
  const role = $('editUserRole').value;
  const activo = $('editUserActive').value === 'true';
  const newPassword = $('editUserPassword').value;
  const errEl = $('editUserError');
  const btn = $('btnSaveEditUser');

  if (!nombre) {
    errEl.textContent = 'El nombre es obligatorio';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando...';
  errEl.style.display = 'none';

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ nombre, rol: role, activo })
      .eq('id', userId);
    if (error) throw error;

    if (newPassword) {
      toast('⚠️ Para cambiar contraseña ve a Supabase Dashboard → Authentication → Users', 'warning');
    } else {
      toast('✅ Usuario actualizado', 'success');
    }

    closeEditUser();
    await loadUsers();
  } catch (e) {
    errEl.textContent = 'Error: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// === EXPORTS ===
window.showConfirm = showConfirm;
window.resolveConfirm = resolveConfirm;
window.resolveSaveTemplate = resolveSaveTemplate;
window.openProductDetail = openProductDetail;
window.openCartItemDetail = openCartItemDetail;
window.closeProductDetail = closeProductDetail;
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
window.openTemplatesModal = openTemplatesModal;
window.closeTemplatesModal = closeTemplatesModal;
window.filterTemplates = filterTemplates;
window.openTemplatePreview = openTemplatePreview;
window.closeTemplatePreview = closeTemplatePreview;
window.loadTemplateFromPreview = loadTemplateFromPreview;
window.loadTemplateDirect = loadTemplateDirect;
window.downloadTemplate = downloadTemplate;
window.downloadTemplatePdf = downloadTemplatePdf;
window.saveCurrentAsTemplate = saveCurrentAsTemplate;
window.deleteTemplateConfirm = deleteTemplateConfirm;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.toggleHelpSection = toggleHelpSection;
window.updateItemMargin = updateItemMargin;
window.openUserManagement = openUserManagement;
window.closeUserManagement = closeUserManagement;
window.showCreateUserForm = showCreateUserForm;
window.hideCreateUserForm = hideCreateUserForm;
window.createUser = createUser;
window.toggleUserActive = toggleUserActive;
window.promoteUser = promoteUser;
window.demoteUser = demoteUser;
window.openEditUser = openEditUser;
window.closeEditUser = closeEditUser;
window.saveEditUser = saveEditUser;
