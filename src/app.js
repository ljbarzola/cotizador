import {
  syncFromGoogleSheets,
  syncInstalacionesOnly,
  loadAllProducts,
  loadAllInstalaciones,
  getSyncLog,
} from './modules/sync.js';
import supabase from './lib/supabase.js';
import { calcItemPrice, calcInstallServicePrice, getSupplierMargin, marginBadge } from './modules/helpers.js';
import { calcItemTotals, calcDiscount, calcSubtotal } from './modules/cartCalculations.js';
import {
  CATALOG,
  setCatalog,
  cart,
  setCart,
  currentSession,
  setCurrentSession,
  currentQuoteId,
  setCurrentQuoteId,
  supplierMargins,
  setSupplierMargins,
  DEFAULT_SUPPLIER_MARGIN,
  DEFAULT_INSTALL_MARGIN,
  installationMarginPct,
  setInstallationMarginPct,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  historyQuotesCache,
  setHistoryQuotesCache,
  STATUS_LABELS,
  instalacionesCatalog,
  setInstalacionesCatalog,
  kits,
} from './state.js';
import {
  loadKitsFromDB,
  generateDefaultKits,
  renderKitsCatalog,
  switchCatalogTab,
  addKitToCart,
  editKit,
  deleteKit,
  addKitComponent,
  removeKitComp,
  updateKitComp,
  filterKitProducts,
  addKitComponentFromSearch,
  saveKitEditor,
  openKitsModal,
  closeKitsModal,
  addNewKit,
  closeKitEditor,
  openKitDetail,
  updateKitCompQty,
  toggleKitCompInstall,
  updateKitCompTechCost,
  removeKitComponentFromCart,
  updateKitCompMargin,
} from './modules/kits.js';
import {
  openCatalogEditor,
  closeCatalogEditor,
  renderEditorTable,
  loadEditorProducts,
  editorField,
  editorToggleDelete,
  addNewProduct,
  saveCatalogEdits,
  openInstallEditor,
  closeInstallEditor,
  renderInstallEditorTable,
  installEditorField,
  installEditorToggleDelete,
  addNewInstall,
  saveInstallEditor,
} from './modules/editor.js';
import {
  openProductDetail,
  closeProductDetail,
  openCartItemDetail,
  openHelpModal,
  closeHelpModal,
  toggleHelpSection,
  openTemplatesModal,
  closeTemplatesModal,
  filterTemplates,
  renderTemplateList,
  openTemplatePreview,
  closeTemplatePreview,
  loadTemplateFromPreview,
  loadTemplateDirect,
  downloadTemplate,
  deleteTemplateConfirm,
} from './modules/modals.js';
import {
  openSavedModal,
  closeSavedModal,
  renderHistoryList,
  applyHistoryFilters,
  changeStatus,
  loadSaved,
  deleteSaved,
  newQuote,
  quoteTotal,
} from './modules/history.js';
import { generateDefaultTemplates } from './modules/quote.js';
import {
  $,
  fmt,
  esc,
  escAttr,
  toast,
  showConfirm,
  resolveConfirm,
  resolveSaveTemplate,
  toggleTplIndustryCustom,
  generateNextCotNumberFromDB,
  showSaveTemplateModal,
} from './utils.js';

// === CATÁLOGO ===
// CATALOG imported from state.js (shared with all modules)
let catalogPageSize = 10;
let catalogPage = 1;

async function loadCatalogFromDB() {
  try {
    const data = await loadAllProducts();
    if (data && data.length > 0) {
      CATALOG.length = 0;
      data.forEach(item => CATALOG.push(item));
      await loadKitsFromDB();
      generateDefaultKits();
      generateDefaultTemplates(CATALOG);
      // Load installation services catalog
      try {
        const instalaciones = await loadAllInstalaciones();
        setInstalacionesCatalog(instalaciones);
      } catch (e) {
        console.warn('No se pudo cargar catálogo de instalaciones:', e.message);
      }
      return true;
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo desde DB:', e.message);
    toast('⚠️ Error al cargar catálogo: ' + e.message, 'warning');
  }
  return false;
}

// === ESTADO ===
// cart, currentSession, supplierMargins, etc. imported from state.js (shared with all modules)
function _getStatusLabel(s) {
  return STATUS_LABELS[s] || s;
}

// === PRICING ===
// pricing functions imported from modules/helpers.js
// utility functions ($, fmt, toast, generateCotNumber) imported from utils.js

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
    return (
      (item.sourceId || '').toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.model || '').toLowerCase().includes(q)
    );
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / catalogPageSize));
  if (catalogPage > totalPages) catalogPage = totalPages;
  const startIdx = (catalogPage - 1) * catalogPageSize;
  const pageItems = filtered.slice(startIdx, startIdx + catalogPageSize);

  $('catalogCount').textContent =
    totalFiltered + ' Productos' + (totalFiltered !== CATALOG.length ? ' (de ' + CATALOG.length + ')' : '');

  if (totalFiltered === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>No se encontraron productos</div>';
    $('catalogPagination').innerHTML = '';
    return;
  }

  list.innerHTML = pageItems
    .map(item => {
      const realIdx = CATALOG.indexOf(item);
      const supplier = item.supplier ? '· ' + item.supplier : '';
      const code = item.sourceId || '(sin código)';
      const subcatLabel = item.subcategory ? '<span class="cat-producto-subcat">' + item.subcategory + '</span>' : '';
      const modelLabel = item.model ? '<span class="cat-producto-model">' + item.model + '</span>' : '';
      const unitsLabel = item.unidades ? '<span class="cat-producto-units">' + item.unidades + '</span>' : '';
      const qtyLabel = item.cantidadDefault
        ? '<span class="cat-producto-units">x' + item.cantidadDefault + '</span>'
        : '';

      const pricing = calcItemPrice(item);
      const price = pricing.subtotalEquipo;
      const badges = marginBadge(item);
      const isAnnualService = item.isService && (!item.monthlyCost || item.monthlyCost === 0) && item.annualCost > 0;
      const annualLabel = isAnnualService
        ? '<span class="cat-producto-units" style="background:#fef3c7;color:#92400e;">anual</span>'
        : '';
      const priceDetail = isAnnualService
        ? '<div class="cost">' + fmt(item.annualCost) + '/año → ' + fmt(item.cost) + '/mes</div>'
        : '<div class="cost">costo ' + fmt(item.cost) + '</div>';

      return `
      <div class="cat-producto">
        <div class="cat-producto-info" onclick="openProductDetail(${realIdx})" style="cursor:pointer;">
          <div class="cat-producto-code">${code} ${modelLabel}</div>
          <div class="cat-producto-desc">${esc(item.description)}</div>
          <div class="cat-producto-meta">
            ${subcatLabel}
            ${unitsLabel}
            ${qtyLabel}
            ${annualLabel}
            ${badges}
            <span class="cat-producto-supplier">${supplier}</span>
          </div>
          <div class="cat-producto-details">
            ${item.observations ? '<span title="' + esc(item.observations) + '">📝</span>' : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="cat-producto-price">
            <div class="pvp">${fmt(price)}</div>
            ${priceDetail}
          </div>
          <button class="add-btn" onclick="addToCart(${realIdx})">+ Agregar</button>
        </div>
      </div>
    `;
    })
    .join('');

  renderPagination(totalFiltered, totalPages);
}

function renderPagination(total, totalPages) {
  const container = $('catalogPagination');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

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
    const isAnnualService = item.isService && (!item.monthlyCost || item.monthlyCost === 0) && item.annualCost > 0;
    cart.push({
      catalogIdx: idx,
      qty: isAnnualService ? 12 : item.cantidadDefault ? parseFloat(item.cantidadDefault) || 1 : 1,
      installActive: false,
      techCost: 0,
      customMargin: null,
    });
  }
  renderCatalog();
  renderCart();
  saveDraft();
  toast('✓ ' + item.description.slice(0, 40) + (item.description.length > 40 ? '…' : '') + ' agregado', 'success');
}

function toggleKitExpand(idx) {
  cart[idx]._expanded = !cart[idx]._expanded;
  renderCart();
}

function updateQty(idx, qty) {
  const q = parseFloat(qty) || 0;
  if (q <= 0) {
    removeItem(idx);
    return;
  }
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

function toggleCartItemInstall(idx) {
  const c = cart[idx];
  if (!c) return;
  const item = CATALOG[c.catalogIdx];
  if (!item || !item.hasInstalacion) return;
  c.installActive = !c.installActive;
  if (c.installActive && (!c.techCost || c.techCost === 0)) {
    c.techCost = 15;
  }
  renderCart();
  syncPrintView();
  saveDraft();
}
window.toggleCartItemInstall = toggleCartItemInstall;

function updateItemMargin(idx, val) {
  const parsed = parseFloat(val);
  cart[idx].customMargin = isNaN(parsed) ? null : parsed;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    renderCart();
    saveDraft();
  }, 300);
}

function updateInstallServiceQty(idx, val) {
  const q = parseInt(val) || 1;
  if (q <= 0) {
    removeItem(idx);
    return;
  }
  cart[idx].qty = q;
  renderCart();
  saveDraft();
}

function updateSupplierMarginGlobal(supplier, val) {
  const key = supplier || 'Sin proveedor';
  const parsed = parseFloat(val);
  supplierMargins[key] = isNaN(parsed) ? DEFAULT_SUPPLIER_MARGIN : parsed;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    renderCart();
    saveDraft();
  }, 300);
}

// === INSTALL SERVICES ===
function openInstallServicePicker() {
  const modal = $('installServicePickerModal');
  if (!modal) return;
  modal.classList.add('open');
  populateInstallServiceFilters();
  renderInstallServiceList();
}

function closeInstallServicePicker() {
  const modal = $('installServicePickerModal');
  if (modal) modal.classList.remove('open');
}

function populateInstallServiceFilters() {
  const cats = [...new Set((instalacionesCatalog || []).map(i => i.category).filter(Boolean))].sort();
  const catSel = $('installServiceCategory');
  const subSel = $('installServiceSubcategory');
  const currentCat = catSel.value;
  const currentSub = subSel.value;
  catSel.innerHTML = '<option value="">Todas las categorías</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });
  catSel.value = currentCat;
  renderInstallServiceSubcategories(currentCat);
  if (currentSub && [...subSel.options].some(o => o.value === currentSub)) subSel.value = currentSub;
}

function renderInstallServiceSubcategories(selectedCat) {
  const subSel = $('installServiceSubcategory');
  if (!subSel) return;
  subSel.innerHTML = '<option value="">Todas las subcategorías</option>';
  const source = selectedCat
    ? (instalacionesCatalog || []).filter(i => i.category === selectedCat)
    : instalacionesCatalog || [];
  const subs = [...new Set(source.map(i => i.subcategory).filter(Boolean))].sort();
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    subSel.appendChild(opt);
  });
}

function renderInstallServiceList() {
  const container = $('installServiceList');
  if (!container) return;
  if (!instalacionesCatalog || instalacionesCatalog.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🔧</div><div>No hay servicios de instalación disponibles.</div><div style="margin-top:4px;font-size:11px;">Sincroniza desde el tab de instalaciones en el visor de catálogo</div></div>';
    return;
  }
  const searchVal = ($('installServiceSearch')?.value || '').toLowerCase();
  const catVal = $('installServiceCategory')?.value || '';
  const subVal = $('installServiceSubcategory')?.value || '';
  const filtered = instalacionesCatalog.filter(s => {
    if (
      searchVal &&
      !s.description.toLowerCase().includes(searchVal) &&
      !(s.observations || '').toLowerCase().includes(searchVal)
    )
      return false;
    if (catVal && s.category !== catVal) return false;
    if (subVal && s.subcategory !== subVal) return false;
    return true;
  });
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🔍</div><div>No se encontraron servicios.</div></div>';
    return;
  }
  let html = '<div class="install-service-grid">';
  filtered.forEach(s => {
    html += `<div class="install-service-card" onclick="addInstallServiceToCart('${esc(s.id)}')">
      <div class="isc-desc">${esc(s.description)}</div>
      <div class="isc-meta">${esc(s.category || '')}${s.subcategory ? ' › ' + esc(s.subcategory) : ''}</div>
      <div class="isc-cost">${fmt(s.cost)}</div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function addInstallServiceToCart(serviceId) {
  const service = instalacionesCatalog.find(s => String(s.id) === String(serviceId));
  if (!service) return;
  const existing = cart.find(c => c.isInstallService && String(c.serviceId) === String(serviceId));
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      isInstallService: true,
      serviceId: service.id,
      description: service.description,
      cost: service.cost,
      customCost: service.cost,
      category: service.category || '',
      subcategory: service.subcategory || '',
      customMargin: DEFAULT_INSTALL_MARGIN,
      qty: 1,
    });
  }
  closeInstallServicePicker();
  renderCart();
  saveDraft();
  toast('✓ ' + service.description.slice(0, 40) + ' agregado', 'success');
}

function openInstallServiceEditor(idx) {
  const c = cart[idx];
  if (!c || !c.isInstallService) return;
  const modal = $('installServiceEditorModal');
  if (!modal) return;
  modal.classList.add('open');
  $('iseDesc').textContent = c.description;
  $('iseCost').textContent = fmt(c.cost);
  $('iseQty').value = c.qty;
  $('iseMargin').value = c.customMargin ?? DEFAULT_INSTALL_MARGIN;
  $('iseIdx').value = idx;
}

function closeInstallServiceEditor() {
  const modal = $('installServiceEditorModal');
  if (modal) modal.classList.remove('open');
}

function saveInstallServiceEditor() {
  const idx = parseInt($('iseIdx').value);
  const qty = parseInt($('iseQty').value) || 1;
  const parsed = parseFloat($('iseMargin').value);
  const margin = isNaN(parsed) ? DEFAULT_INSTALL_MARGIN : parsed;
  if (cart[idx] && cart[idx].isInstallService) {
    cart[idx].qty = qty;
    cart[idx].customMargin = margin;
  }
  closeInstallServiceEditor();
  renderCart();
  saveDraft();
}

function updateInstallServiceMargin(idx, val) {
  if (cart[idx] && cart[idx].isInstallService) {
    const parsed = parseFloat(val);
    cart[idx].customMargin = isNaN(parsed) ? DEFAULT_INSTALL_MARGIN : parsed;
    clearTimeout(window._marginRenderTimer);
    window._marginRenderTimer = setTimeout(() => {
      renderCart();
      saveDraft();
    }, 300);
  }
}

function updateInstallServiceCost(idx, val) {
  if (cart[idx] && cart[idx].isInstallService) {
    const parsed = parseFloat(val);
    cart[idx].customCost = isNaN(parsed) ? cart[idx].cost : parsed;
    clearTimeout(window._marginRenderTimer);
    window._marginRenderTimer = setTimeout(() => {
      renderCart();
      saveDraft();
    }, 300);
  }
}

// === RENDER CART ===
function renderCart() {
  const container = $('productosContainer');
  $('productosCount').textContent = cart.length + ' Producto' + (cart.length === 1 ? '' : 's');
  if (cart.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🛒</div><div>Aún no hay productos en la cotización.</div><div style="margin-top:4px;font-size:11px;">Busca y agrega productos del catálogo (panel izquierdo)</div></div>';
    renderMarginConfig();
    renderTotals();
    return;
  }

  let html = '';

  // === TABLA DE DETALLE ===
  html += '<table class="productos-table"><thead><tr>';
  html += '<th class="producto-num">#</th>';
  html += '<th>Descripción</th>';
  html += '<th class="center" style="width:36px;">Und</th>';
  html += '<th class="right" style="width:60px;">Costo Unit.</th>';
  html += '<th class="center" style="width:40px;">Cant</th>';
  html += '<th class="right" style="width:65px;">Costo Total</th>';
  html += '<th class="right print-hide-col" style="width:55px;">Ganancia</th>';
  html += '<th class="right print-hide-col" style="width:65px;">PVP</th>';
  html += '<th class="center" style="width:40px;">Inst</th>';
  html += '<th style="width:28px;" class="print-hide-col"></th>';
  html += '</tr></thead><tbody>';

  // Order: kits first, then individual items (install services go ONLY in Ganancia section)
  const kits = [];
  const individuals = [];
  cart.forEach((c, i) => {
    if (c.isKit) kits.push({ c, origIdx: i });
    else if (!c.isInstallService) individuals.push({ c, origIdx: i });
  });
  const ordered = [...kits, ...individuals];

  let rowNum = 0;
  const hasKits = kits.length > 0;
  const hasIndividuals = individuals.length > 0;
  let inKitsSection = true;

  ordered.forEach(({ c, origIdx: idx }) => {
    if (c.isKit) {
      const kitComps = c.kitComponents.filter(cc => cc.catalogIdx >= 0 && cc.catalogIdx < CATALOG.length);

      html += `<tr class="kit-header-row">
        <td class="producto-num">📦</td>
        <td class="producto-desc" colspan="8">
          <strong>${esc(c.kitName)}</strong>
          <span style="color:var(--muted);font-size:11px;margin-left:8px;">${kitComps.length} componente(s)</span>
        </td>
        <td class="print-hide-col" style="text-align:center;">
          <button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar kit">✕</button>
        </td>
      </tr>`;

      kitComps.forEach(compData => {
        const it = CATALOG[compData.catalogIdx];
        if (!it) return;
        rowNum++;
        const compIdx = c.kitComponents.indexOf(compData);
        const compQty = (compData.qty ?? 1) * c.qty;
        const compTechCost = compData.techCost ?? 0;
        const compInstallActive = compData.installActive ?? false;
        const compPricing = calcItemPrice(it, {
          supplierMargin: compData.customMargin ?? getSupplierMargin(it.supplier),
          installMargin: installationMarginPct,
          techCost: compTechCost,
          installActive: compInstallActive,
        });
        const compGanancia = compPricing.gananciaProveedor * compQty;
        const compPvp = compPricing.priceBeforeIva * compQty;
        const badges = marginBadge(it);
        const marginCell =
          compGanancia > 0
            ? `<span class="supplier-detail">${fmt(compGanancia)}</span>`
            : '<span style="color:var(--muted);">—</span>';
        const installCell = it.hasInstalacion
          ? compInstallActive
            ? `<button type="button" class="install-toggle-btn install-btn-active" onclick="toggleKitCompInstall(${idx}, ${compIdx})" title="Desactivar instalación">🟩 SI (${fmt(compPricing.instalacionPrice)})</button>`
            : `<button type="button" class="install-toggle-btn install-btn-inactive" onclick="toggleKitCompInstall(${idx}, ${compIdx})" title="Activar instalación">⬜ NO</button>`
          : '<span style="color:var(--muted);">—</span>';
        html += `<tr class="kit-row">
          <td class="producto-num">${rowNum}</td>
          <td class="producto-desc producto-desc-click" onclick="openCartItemDetail(${idx})" title="Ver detalle">
            <span class="producto-desc-text">${esc(it.description)}</span>
            <div class="producto-badges">${badges}</div>
            <small>${it.sourceId || ''}${it.supplier ? ' · ' + it.supplier : ''}</small>
          </td>
          <td class="center" style="font-size:11px;font-weight:600;color:var(--primary);">${it.unit || '—'}</td>
          <td class="right"><span class="print-hide-col">${fmt(compPricing.baseCost)}</span><span class="print-only">${fmt(compPricing.priceBeforeIva)}</span></td>
          <td class="center"><input type="number" min="0" step="any" value="${compData.qty ?? 1}" class="qty-input" aria-label="Cantidad de componente del kit" onchange="updateKitCompQty(${idx}, ${compIdx}, this.value)"></td>
          <td class="right"><span class="print-hide-col"><strong>${fmt(compPricing.baseCost * compQty)}</strong></span><span class="print-only"><strong>${fmt(compPricing.priceBeforeIva * compQty)}</strong></span></td>
          <td class="right print-hide-col">${marginCell}</td>
          <td class="right print-hide-col">${fmt(compPvp)}</td>
          <td class="center">${installCell}</td>
          <td class="print-hide-col"><button class="remove-btn" onclick="removeKitComponentFromCart(${idx}, ${compIdx})" title="Eliminar del kit">✕</button></td>
        </tr>`;
      });
      return;
    }
    if (inKitsSection) {
      inKitsSection = false;
      if (hasKits && hasIndividuals) {
        html += `<tr class="kit-productos-separator"><td colspan="10"><div class="kit-productos-divider"></div></td></tr>`;
      }
    }
    rowNum++;
    const item = CATALOG[c.catalogIdx];
    const effectiveMargin = c.customMargin ?? getSupplierMargin(item.supplier);
    const pricing = calcItemPrice(item, {
      supplierMargin: effectiveMargin,
      installMargin: installationMarginPct,
      techCost: c.techCost,
      installActive: c.installActive,
    });

    const ganancia = pricing.gananciaProveedor * c.qty;
    const pvp = pricing.priceBeforeIva * c.qty;

    const badges = marginBadge(item);
    let marginCell;
    if (ganancia > 0) {
      marginCell = `<span class="supplier-detail">${fmt(ganancia)}</span>`;
    } else {
      marginCell = '<span style="color:var(--muted);">—</span>';
    }

    const installCell = item.hasInstalacion
      ? c.installActive
        ? `<button type="button" class="install-toggle-btn install-btn-active" onclick="toggleCartItemInstall(${idx})" title="Desactivar instalación">🟩 SI (${fmt(pricing.instalacionPrice)})</button>`
        : `<button type="button" class="install-toggle-btn install-btn-inactive" onclick="toggleCartItemInstall(${idx})" title="Activar instalación">⬜ NO</button>`
      : '<span style="color:var(--muted);">—</span>';

    html += `<tr>
      <td class="producto-num">${rowNum}</td>
      <td class="producto-desc producto-desc-click" onclick="openCartItemDetail(${idx})" title="Ver detalle">
        <span class="producto-desc-text">${esc(item.description)}</span>
        <div class="producto-badges">${badges}</div>
        <small>${item.sourceId || ''}${item.supplier ? ' · ' + item.supplier : ''}</small>
      </td>
      <td class="center" style="font-size:11px;font-weight:600;color:var(--primary);">${item.unit || '—'}</td>
      <td class="right"><span class="print-hide-col">${fmt(pricing.baseCost)}</span><span class="print-only">${fmt(pricing.priceBeforeIva)}</span></td>
      <td class="center"><input type="number" min="0" step="any" value="${c.qty}" class="qty-input" aria-label="Cantidad de producto" onchange="updateQty(${idx}, this.value)"></td>
      <td class="right"><span class="print-hide-col"><strong>${fmt(pricing.baseCost * c.qty)}</strong></span><span class="print-only"><strong>${fmt(pricing.priceBeforeIva * c.qty)}</strong></span></td>
      <td class="right print-hide-col">${marginCell}</td>
      <td class="right print-hide-col">${fmt(pvp)}</td>
      <td class="center">${installCell}</td>
      <td class="print-hide-col"><button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar">✕</button></td>
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
  let totalItems = 0;
  cart.forEach((c, idx) => {
    if (c.isKit) {
      c.kitComponents.forEach((comp, compIdx) => {
        const item = CATALOG[comp.catalogIdx];
        if (!item || item.isService) return;
        const key = item.supplier || 'Sin proveedor';
        if (!supplierGroups[key]) supplierGroups[key] = [];
        supplierGroups[key].push({ idx, compIdx, item, cartItem: comp, isKit: true });
        totalItems++;
      });
      return;
    }
    const item = CATALOG[c.catalogIdx];
    if (!item || item.isService) return;
    const key = item.supplier || 'Sin proveedor';
    if (!supplierGroups[key]) supplierGroups[key] = [];
    supplierGroups[key].push({ idx, item, cartItem: c, isKit: false });
    totalItems++;
  });

  let supplierHtml =
    '<div class="margin-subsection"><div class="margin-subsection-header margin-subsection-proveedores"><h4>📦 Ganancia por proveedores</h4><span class="margin-subsection-count">' +
    Object.keys(supplierGroups).length +
    ' proveedor(es) · ' +
    totalItems +
    ' Productos</span></div>';

  const supplierKeys = Object.keys(supplierGroups).sort((a, b) =>
    a === 'Sin proveedor' ? 1 : b === 'Sin proveedor' ? -1 : a.localeCompare(b)
  );

  if (supplierKeys.length === 0) {
    supplierHtml += '<div class="margin-empty">No hay productos de equipo/materiales en la cotización.</div>';
  } else {
    supplierKeys.forEach(supplier => {
      const items = supplierGroups[supplier];
      const margin = getSupplierMargin(supplier);
      const isSinProveedor = supplier === 'Sin proveedor';

      supplierHtml += `<div class="supplier-group">`;
      supplierHtml += `<div class="supplier-group-header">`;
      supplierHtml += `<span class="supplier-name">${supplier} <span class="supplier-count">${items.length} Producto(s)</span></span>`;
      if (isSinProveedor) {
        supplierHtml += `<span class="supplier-hint">Margen individual por item ↓</span>`;
      } else {
        supplierHtml += `<div class="supplier-margin-input"><input type="number" min="0" max="100" step="1" value="${margin}" aria-label="Margen de proveedor global para ${supplier.replace(/"/g, '&quot;')}" oninput="updateSupplierMarginGlobal('${supplier.replace(/'/g, "\\'")}', this.value)"><span>%</span></div>`;
      }
      supplierHtml += `</div>`;

      items.forEach(({ idx: kitIdx, compIdx, item, cartItem, isKit }) => {
        const effectiveMargin = isSinProveedor ? (cartItem.customMargin ?? margin) : margin;
        const pricing = calcItemPrice(item, { supplierMargin: effectiveMargin });
        const hasGanancia = item.hasGanancia;
        const hasCustom = cartItem.customMargin != null;
        const marginHandler = isKit
          ? `updateKitCompMargin(${kitIdx}, ${compIdx}, this.value)`
          : `updateItemMargin(${kitIdx}, this.value)`;
        supplierHtml += `<div class="supplier-group-producto${hasGanancia ? ' sgi-active' : ''}${hasCustom ? ' sgi-custom' : ''}">`;
        supplierHtml += `<span class="sgi-code">${item.sourceId || ''}</span>`;
        supplierHtml += `<span class="sgi-desc">${esc(item.description)}${isKit ? ' <small style="color:var(--muted);">(kit)</small>' : ''}</span>`;
        if (isSinProveedor && hasGanancia) {
          supplierHtml += `<div class="supplier-margin-input sgi-margin-inline"><input type="number" min="0" max="100" step="1" value="${effectiveMargin}" aria-label="Margen de proveedor individual" oninput="${marginHandler}"><span>%</span></div>`;
        }
        supplierHtml += `<span class="sgi-cost">${fmt(item.cost)} → <strong>${fmt(pricing.priceBeforeIva)}</strong>${hasGanancia ? ' <span class="sgi-margin">+' + effectiveMargin + '%</span>' : ' <span class="sgi-no-margin">sin ganancia</span>'}</span>`;
        supplierHtml += `</div>`;
      });

      supplierHtml += `</div>`;
    });
  }
  supplierHtml += '</div>';

  // === INSTALACIÓN (servicios de instalación del catálogo) ===
  const installServiceItems = cart.filter(c => c.isInstallService);

  let installHtml = '<div class="margin-subsection">';
  installHtml += '<div class="margin-subsection-header margin-subsection-instalacion">';
  installHtml += '<h4>🔧 Ganancia por instalación</h4>';
  installHtml += '<div class="install-toggle-group">';
  installHtml += `<button class="btn btn-sm btn-primary" onclick="openInstallServicePicker()">+ Servicio de instalación</button>`;
  installHtml += '</div>';
  installHtml += '</div>';

  // Show indicator about items with install flag ONLY when no install services are active
  const flagItems = cart.filter(c => {
    if (c.isKit) return c.kitComponents.some(cc => CATALOG[cc.catalogIdx]?.hasInstalacion);
    if (c.isInstallService) return false;
    return CATALOG[c.catalogIdx]?.hasInstalacion;
  });
  if (flagItems.length > 0 && installServiceItems.length === 0) {
    installHtml += `<div class="margin-empty">Instalación desactivada. <strong>${flagItems.length} ítem(s)</strong> con flag de instalación disponibles.</div>`;
  }

  if (installServiceItems.length > 0) {
    installServiceItems.forEach((c, i) => {
      const cartIdx = cart.indexOf(c);
      const pricing = calcInstallServicePrice(c, c.customMargin ?? DEFAULT_INSTALL_MARGIN);
      const total = pricing.total * c.qty;
      installHtml += `<div class="install-config-row install-active-row">`;
      installHtml += `<div class="install-config-info">`;
      installHtml += `<div class="install-info-top">`;
      installHtml += `<span class="install-config-name">🔧 ${esc(c.description)}</span>`;
      installHtml += `<button class="viewer-action-btn delete install-del-btn" onclick="removeItem(${cartIdx})" title="Eliminar servicio">✕</button>`;
      installHtml += `</div>`;
      installHtml += `<div class="install-info-meta-row">`;
      if (c.category || c.subcategory) {
        installHtml += `<span class="install-config-meta">${esc(c.category || '')}${c.subcategory ? ' › ' + esc(c.subcategory) : ''}</span>`;
      }
      installHtml += `<span class="install-cost-badge">${fmt(pricing.baseCost)} × ${c.qty} + ${c.customMargin ?? DEFAULT_INSTALL_MARGIN}% = ${fmt(total)}</span>`;
      installHtml += `</div>`;
      installHtml += `</div>`;
      installHtml += `<div class="install-config-fields">`;
      installHtml += `<div class="install-field field-cant"><label>Cant</label><input type="number" min="1" step="1" value="${c.qty}" aria-label="Cantidad de servicio" onchange="updateInstallServiceQty(${cartIdx}, this.value)"></div>`;
      installHtml += `<div class="install-field field-cost"><label>Costo</label><input type="number" min="0" step="0.01" value="${c.customCost ?? c.cost}" aria-label="Costo del servicio" onchange="updateInstallServiceCost(${cartIdx}, this.value)"></div>`;
      installHtml += `<div class="install-field field-margin"><label>Margen</label><div class="margin-input-inline"><input type="number" min="0" max="100" step="1" value="${c.customMargin ?? DEFAULT_INSTALL_MARGIN}" aria-label="Margen de ganancia en porcentaje" onchange="updateInstallServiceMargin(${cartIdx}, this.value)"><span>%</span></div></div>`;
      installHtml += `<div class="install-field field-ganancia"><label>Ganancia</label><span class="install-price">${fmt(pricing.ganancia * c.qty)}</span></div>`;
      installHtml += `<div class="install-field field-total"><label>Total</label><span class="install-price install-total">${fmt(total)}</span></div>`;
      installHtml += `</div>`;
      installHtml += `</div>`;
    });
  }
  installHtml += '</div>';

  section.innerHTML = supplierHtml + installHtml;
}

// === TOTALS ===
function renderTotals() {
  const { subtotalEquipo, totalIva, totalInstalacion, totalInstalacionesCat } = calcItemTotals(
    cart,
    CATALOG,
    calcItemPrice,
    getSupplierMargin,
    installationMarginPct,
    calcInstallServicePrice
  );

  const totalGeneral = subtotalEquipo + totalIva + totalInstalacion + totalInstalacionesCat;
  const discountAmount = calcDiscount(totalGeneral, discountType, discountValue);
  const totalFinal = totalGeneral - discountAmount;

  let breakdownHtml = '';
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;Subtotal Equipos / Materiales</span><span>${fmt(subtotalEquipo)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;IVA 15%</span><span>${fmt(totalIva)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub"><span>Subtotal (PVP + IVA)</span><span>${fmt(subtotalEquipo + totalIva)}</span></div>`;

  if (totalInstalacion > 0) {
    breakdownHtml += `<div class="totals-row totals-sub totals-install"><span>🔧 Instalación (Productos)</span><span>${fmt(totalInstalacion)}</span></div>`;
  }
  if (totalInstalacionesCat > 0) {
    breakdownHtml += `<div class="totals-row totals-sub totals-install"><span>🔧 Servicios de instalación</span><span>${fmt(totalInstalacionesCat)}</span></div>`;
  }
  if (discountAmount > 0) {
    const label = discountType === 'percent' ? `Descuento (${discountValue}%)` : 'Descuento';
    breakdownHtml += `<div class="totals-row totals-sub totals-discount"><span>&nbsp;&nbsp;${label}</span><span>-${fmt(discountAmount)}</span></div>`;
  }
  $('totalsBreakdown').innerHTML = breakdownHtml;

  $('totalView').textContent = fmt(totalFinal);
}

// === QUOTE SAVE/LOAD ===
function updateDiscount() {
  setDiscountType($('discountType').value);
  setDiscountValue(parseFloat($('discountValue').value) || 0);
  const input = $('discountValue');
  const preview = $('discountPreview');
  input.disabled = discountType === 'none';
  if (discountType === 'none') {
    input.value = 0;
    preview.textContent = '';
  } else if (discountType === 'percent') {
    input.max = 100;
    input.placeholder = '0-100';
    if (discountValue > 0) preview.textContent = `→ -$${((getSubtotal() * discountValue) / 100).toFixed(2)}`;
    else preview.textContent = '';
  } else {
    input.max = '';
    input.placeholder = '0';
    if (discountValue > 0) preview.textContent = `→ -$${discountValue.toFixed(2)}`;
    else preview.textContent = '';
  }
  renderCart();
  saveDraft();
}

function getSubtotal() {
  return calcSubtotal(cart, CATALOG, calcItemPrice, getSupplierMargin, installationMarginPct, calcInstallServicePrice);
}

function setModality(_m) {
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
    conditions: $('quoteConditions').value || '',
    notes: $('quoteNotes').value || '',
    discountType: $('discountType').value || 'none',
    discountValue: parseFloat($('discountValue').value) || 0,
    supplierMargins: { ...supplierMargins },
    installMargin: installationMarginPct,
    productos: cart,
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
  if ($('quoteConditions') && q.conditions) $('quoteConditions').value = q.conditions;
  if ($('quoteNotes') && q.notes) $('quoteNotes').value = q.notes;
  if ($('discountType') && q.discountType) {
    $('discountType').value = q.discountType;
    $('discountValue').value = q.discountValue || 0;
    updateDiscount();
  }
  setSupplierMargins(q.supplierMargins || {});
  setInstallationMarginPct(q.installMargin ?? DEFAULT_INSTALL_MARGIN);
  setCart(q.productos || []);
  renderCatalog();
  renderCart();
}

function saveDraft() {
  localStorage.setItem('quote_draft', JSON.stringify(buildQuoteData()));
}

function loadDraft() {
  const raw = localStorage.getItem('quote_draft');
  if (!raw) {
    toast('No hay borrador guardado', 'danger');
    return;
  }
  try {
    setCurrentQuoteId(null);
    loadQuoteData(JSON.parse(raw));
    toast('Borrador cargado');
  } catch (_e) {
    toast('Error al cargar borrador', 'danger');
  }
}

function highlightMissingClientFields(missingMap) {
  let firstEl = null;

  Object.entries(missingMap).forEach(([fieldId, isMissing]) => {
    const el = $(fieldId);
    if (!el) return;
    if (isMissing) {
      el.classList.add('input-field-error');
      if (!firstEl) firstEl = el;

      const clearErr = () => {
        el.classList.remove('input-field-error');
        el.removeEventListener('input', clearErr);
      };
      el.addEventListener('input', clearErr);
    } else {
      el.classList.remove('input-field-error');
    }
  });

  if (firstEl) {
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => firstEl.focus(), 300);
  }
}

async function saveQuote() {
  const data = buildQuoteData();
  const missingMap = {
    clientName: !data.client.name,
    clientRuc: !data.client.ruc,
    clientPhone: !data.client.phone,
    clientEmail: !data.client.email,
  };

  if (Object.values(missingMap).some(Boolean)) {
    const missing = [];
    if (missingMap.clientName) missing.push('Cliente');
    if (missingMap.clientRuc) missing.push('RUC/Cédula');
    if (missingMap.clientPhone) missing.push('Teléfono');
    if (missingMap.clientEmail) missing.push('Email');
    highlightMissingClientFields(missingMap);
    toast('Campos obligatorios: ' + missing.join(', '), 'danger');
    return;
  }
  if (cart.length === 0) {
    toast('Agrega al menos un ítem a la cotización', 'danger');
    return;
  }
  if (!data.cotNum) {
    data.cotNum = await generateNextCotNumberFromDB();
    $('cotNum').value = data.cotNum;
  }

  const userId = currentSession?.userId;
  if (!userId) {
    toast('Error: no hay sesión activa', 'danger');
    return;
  }

  try {
    const row = {
      user_id: userId,
      vendor_name: currentSession?.nombre || currentSession?.user || '',
      cot_num: data.cotNum,
      cot_date: data.cotDate || null,
      client: data.client,
      supplier_margins: data.supplierMargins,
      install_margin: data.installMargin,
      productos: data.productos,
      status: 'borrador',
      updated_at: new Date().toISOString(),
    };

    if (currentQuoteId) {
      const { error } = await supabase
        .from('saved_quotes')
        .update({
          vendor_name: row.vendor_name,
          cot_num: row.cot_num,
          cot_date: row.cot_date,
          client: row.client,
          supplier_margins: row.supplier_margins,
          install_margin: row.install_margin,
          productos: row.productos,
          updated_at: row.updated_at,
        })
        .eq('id', currentQuoteId);
      if (error) throw error;
      toast('✓ Cotización actualizada: ' + data.cotNum, 'success');
      notifyCotizadorVsPdf();
    } else {
      const { data: existing } = await supabase
        .from('saved_quotes')
        .select('id')
        .eq('user_id', userId)
        .eq('cot_num', data.cotNum)
        .maybeSingle();
      if (existing) {
        if (
          await showConfirm(
            'Ya existe "' + data.cotNum + '". ¿Actualizar la existente?',
            'Cotización duplicada',
            'Actualizar'
          )
        ) {
          const { error } = await supabase
            .from('saved_quotes')
            .update({
              cot_num: row.cot_num,
              cot_date: row.cot_date,
              client: row.client,
              supplier_margins: row.supplier_margins,
              install_margin: row.install_margin,
              productos: row.productos,
              updated_at: row.updated_at,
            })
            .eq('id', existing.id);
          if (error) throw error;
          setCurrentQuoteId(existing.id);
          toast('✓ Cotización actualizada', 'success');
          notifyCotizadorVsPdf();
        } else {
          data.cotNum = await generateNextCotNumberFromDB();
          $('cotNum').value = data.cotNum;
          row.cot_num = data.cotNum;
          const { data: inserted, error } = await supabase.from('saved_quotes').insert(row).select().single();
          if (error) throw error;
          if (inserted && inserted.id) setCurrentQuoteId(inserted.id);
          toast('✓ Cotización nueva guardada', 'success');
        }
      } else {
        const { data: inserted, error } = await supabase.from('saved_quotes').insert(row).select().single();
        if (error) throw error;
        if (inserted && inserted.id) setCurrentQuoteId(inserted.id);
        toast('✓ Cotización guardada: ' + data.cotNum, 'success');
        notifyCotizadorVsPdf();
      }
    }
  } catch (e) {
    toast('Error al guardar: ' + e.message, 'danger');
  }
}

function notifyCotizadorVsPdf() {
  const existing = document.getElementById('cotizadorVsPdfBanner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'cotizadorVsPdfBanner';
  banner.className = 'cotizador-vs-pdf-banner';
  banner.innerHTML = `
    <div class="banner-header">
      <strong>Cotizador vs PDF (Cliente)</strong>
      <button onclick="this.parentElement.parentElement.remove()" class="banner-close">✕</button>
    </div>
    <div class="banner-body">
      <div class="banner-col">
        <div class="banner-title">Cotizador (usted ve):</div>
        <div>Costo Unit. (costo real del producto, sin ganancia)</div>
        <div>Cant</div>
        <div>Costo Total (Costo Unit. x Cant)</div>
        <div>Ganancia (margen proveedor x Cant)</div>
        <div>PVP (Costo Total + Ganancia)</div>
        <div>Instalación</div>
      </div>
      <div class="banner-col">
        <div class="banner-title">Cliente (PDF):</div>
        <div>Costo Unit. (mismo valor)</div>
        <div>Cant (mismo valor)</div>
        <div>Costo Total (mismo valor)</div>
        <div style="color:var(--muted);">Ganancia (NO visible)</div>
        <div style="color:var(--muted);">PVP (NO visible)</div>
        <div>Instalación (mismo valor)</div>
      </div>
    </div>`;
  const actionsBar = document.querySelector('.actions-bar');
  if (actionsBar && actionsBar.parentNode) {
    actionsBar.parentNode.insertBefore(banner, actionsBar);
  } else {
    const quotePanel = document.querySelector('.quote-panel');
    if (quotePanel) quotePanel.appendChild(banner);
  }
  setTimeout(() => {
    const b = document.getElementById('cotizadorVsPdfBanner');
    if (b) b.remove();
  }, 8000);
}

function doPrint() {
  window.print();
  setTimeout(() => notifyCotizadorVsPdf(), 500);
}

// === HISTORY ===
// history functions imported from modules/history.js

function handleSyncClick() {
  openCatalogViewer();
}

// === SYNC PANEL ===
let syncAbortController = null;

function openSyncPanel() {
  $('syncPanel').style.display = 'block';
  $('syncPanelStatus').textContent = '';
  $('syncPanelSummary').innerHTML = '';
}

function closeSyncPanel() {
  if (syncAbortController) {
    syncAbortController.abort();
    syncAbortController = null;
  }
  $('syncPanel').style.display = 'none';
  $('btnStartSync').style.display = '';
  $('btnStopSync').style.display = 'none';
}

async function startSync() {
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
    const result = await syncFromGoogleSheets(msg => {
      $('syncPanelStatus').textContent = msg;
      appendLog(msg, 'info');
    }, signal);

    getSyncLog().forEach(e => appendLog(e.msg, e.level));
    const sheets = result.sheets || {};
    let summaryHtml = '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    summaryHtml += `<span style="color:#10b981;font-weight:600;">✓ ${result.inserted} insertados</span>`;
    summaryHtml += `<span style="color:#3b82f6;font-weight:600;">↻ ${result.updated} actualizados</span>`;
    if (result.failed > 0)
      summaryHtml += `<span style="color:#ef4444;font-weight:600;">✕ ${result.failed} fallidos</span>`;
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

// === INSTALL SYNC (separate from catalog sync) ===
let installSyncAbortController = null;

function openInstallSyncPanel() {
  $('installSyncPanel').style.display = 'block';
  $('installSyncPanelStatus').textContent = '';
  $('installSyncPanelSummary').innerHTML = '';
}

function closeInstallSyncPanel() {
  if (installSyncAbortController) {
    installSyncAbortController.abort();
    installSyncAbortController = null;
  }
  $('installSyncPanel').style.display = 'none';
  $('btnStartInstallSync').style.display = '';
  $('btnStopInstallSync').style.display = 'none';
}

async function startInstallSync() {
  $('btnStartInstallSync').style.display = 'none';
  $('btnStopInstallSync').style.display = '';
  $('installSyncPanelStatus').textContent = 'Iniciando...';
  $('installSyncPanelSummary').innerHTML = '';
  $('installSyncLogEntries').innerHTML = '';
  installSyncAbortController = new AbortController();
  const signal = installSyncAbortController.signal;

  function appendLog(msg, level) {
    const entry = document.createElement('div');
    const ts = new Date().toLocaleTimeString();
    const color = level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : '#9ca3af';
    entry.innerHTML = `<span style="color:#6b7280;">${ts}</span> <span style="color:${color};">${msg}</span>`;
    $('installSyncLogEntries').appendChild(entry);
    entry.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  appendLog('Sincronizando instalaciones...', 'info');
  try {
    const result = await syncInstalacionesOnly(msg => {
      $('installSyncPanelStatus').textContent = msg;
      appendLog(msg, 'info');
    }, signal);

    getSyncLog().forEach(e => appendLog(e.msg, e.level));
    const sheets = result.sheets || {};
    let summaryHtml = '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    summaryHtml += `<span style="color:#10b981;font-weight:600;">✓ ${result.inserted} insertados</span>`;
    summaryHtml += `<span style="color:#3b82f6;font-weight:600;">↻ ${result.updated} actualizados</span>`;
    if (result.failed > 0)
      summaryHtml += `<span style="color:#ef4444;font-weight:600;">✕ ${result.failed} fallidos</span>`;
    if (result.aborted) summaryHtml += '<span style="color:#f59e0b;font-weight:600;">⏹ Detenido</span>';
    summaryHtml += '</div>';
    for (const [name, info] of Object.entries(sheets)) {
      summaryHtml += `<div style="margin-top:6px;font-size:11px;color:var(--muted);">${name}: ↓${info.downloaded} | +${info.inserted} ~${info.updated} ✕${info.failed}</div>`;
    }
    $('installSyncPanelSummary').innerHTML = summaryHtml;

    try {
      const instalaciones = await loadAllInstalaciones();
      setInstalacionesCatalog(instalaciones);
    } catch (e) {
      console.warn('Error reloading instalaciones:', e.message);
    }
    toast(result.aborted ? '⏹ Detenido' : '✓ Instalaciones sincronizadas', result.aborted ? '' : 'success');
  } catch (e) {
    appendLog('Error: ' + e.message, 'error');
    toast('Error: ' + e.message, 'danger');
  } finally {
    installSyncAbortController = null;
    $('btnStartInstallSync').style.display = '';
    $('btnStopInstallSync').style.display = 'none';
    $('installSyncPanelStatus').textContent = 'Completado';
  }
}

function stopInstallSync() {
  if (installSyncAbortController) {
    installSyncAbortController.abort();
    $('installSyncPanelStatus').textContent = 'Deteniendo...';
  }
}

// === CATALOG VIEWER ===
function openCatalogViewer() {
  $('catalogViewerModal').classList.add('open');
  viewerTab = 'products';
  loadViewerProducts();
  renderViewerCategories();
  if ($('viewerTabProducts')) switchViewerTab('products');
}

function closeCatalogViewer() {
  $('catalogViewerModal').classList.remove('open');
}

let viewerProducts = [];

function renderViewerCategories() {
  const catSel = $('viewerCategory');
  if (!catSel) return;
  const currentCat = catSel.value;
  const validCats = ['EQUIPOS', 'MATERIALES', 'SERVICIOS'];
  catSel.innerHTML = '<option value="">Todas las categorías</option>';
  validCats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });
  if (validCats.includes(currentCat)) catSel.value = currentCat;
  renderViewerSubcategories(catSel.value);
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
  let filtered = viewerProducts.map((p, i) => ({ ...p, _viewerIdx: i }));
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (sub) filtered = filtered.filter(p => p.subcategory === sub);
  if (q)
    filtered = filtered.filter(
      p =>
        (p.sourceId || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.subcategory || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
    );
  const countLabel =
    filtered.length +
    ' productos' +
    (filtered.length !== viewerProducts.length ? ' (de ' + viewerProducts.length + ')' : '');
  $('viewerCount').textContent = countLabel;
  const tabCount = $('viewerCountProducts');
  if (tabCount) tabCount.textContent = viewerProducts.length;
  const tbody = $('viewerBody');
  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;padding:40px 20px;color:var(--muted);"><div style="font-size:24px;margin-bottom:8px;">📦</div>No se encontraron productos<br><small>Intenta ajustar los filtros de búsqueda</small></td></tr>';
    return;
  }
  tbody.innerHTML = filtered
    .map(p => {
      const pricing = calcItemPrice(p);
      const idx = p._viewerIdx;
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
      <td class="center" style="white-space:nowrap;"><div style="display:inline-flex;gap:4px;align-items:center;justify-content:center;"><button class="viewer-action-btn edit" onclick="openEditProductoModal('product',${idx})" title="Editar">✏️</button><button class="viewer-action-btn delete" onclick="deleteViewerProducto('product',${idx})" title="Eliminar">✕</button></div></td>
    </tr>`;
    })
    .join('');
  makeTableColumnsResizable($('viewerTable'));
}

let viewerTab = 'products';

const VIEWER_HEADERS = {
  products:
    '<th style="width:100px">Código</th><th style="width:120px"><span class="col-full">Subcategoría</span><span class="col-short">Subcat.</span></th><th>Descripción</th><th style="width:70px"><span class="col-full">Costo</span><span class="col-short">C. Unit.</span></th><th style="width:50px">Gan.</th><th style="width:50px">Inst.</th><th style="width:70px">PVP</th><th style="width:60px">IVA</th><th style="width:75px">Total</th><th style="width:65px;text-align:center;"><span class="col-full">Acciones</span><span class="col-short">Acc.</span></th>',
  install:
    '<th style="width:80px">Código</th><th>Nombre instalación</th><th style="width:100px"><span class="col-full">Categoría</span><span class="col-short">Cat.</span></th><th style="width:100px"><span class="col-full">Subcategoría</span><span class="col-short">Subcat.</span></th><th style="width:80px" class="right"><span class="col-full">Costo</span><span class="col-short">C. Unit.</span></th><th>Observaciones</th><th style="width:65px;text-align:center;"><span class="col-full">Acciones</span><span class="col-short">Acc.</span></th>',
  kits: '<th style="width:100px">Código</th><th>Nombre</th><th>Componentes</th><th style="width:80px"><span class="col-full">Costo</span><span class="col-short">Total</span></th><th style="width:65px;text-align:center;"><span class="col-full">Acciones</span><span class="col-short">Acc.</span></th>',
};

function switchViewerTab(tab) {
  viewerTab = tab;
  const btnProducts = $('viewerTabProducts');
  const btnInstall = $('viewerTabInstall');
  const btnKits = $('viewerTabKits');
  const actionsProducts = $('viewerActionsProducts');
  const actionsInstall = $('viewerActionsInstall');
  const actionsKits = $('viewerActionsKits');
  const syncPanel = $('syncPanel');
  const installSyncPanel = $('installSyncPanel');

  // Tab styling
  [btnProducts, btnInstall, btnKits].forEach(b => b && b.classList.remove('active'));
  if (tab === 'products') btnProducts.classList.add('active');
  else if (tab === 'install') btnInstall.classList.add('active');
  else if (tab === 'kits') btnKits.classList.add('active');

  // Show/hide filters
  const showFilters = tab === 'products';
  $('viewerCategory').style.display = showFilters ? '' : 'none';
  $('viewerSubcategory').style.display = showFilters ? '' : 'none';

  // Show/hide action groups
  if (actionsProducts) actionsProducts.style.display = tab === 'products' ? 'flex' : 'none';
  if (actionsInstall) actionsInstall.style.display = tab === 'install' ? 'flex' : 'none';
  if (actionsKits) actionsKits.style.display = tab === 'kits' ? 'flex' : 'none';

  // Close sync panels on tab switch
  if (syncPanel) syncPanel.style.display = 'none';
  if (installSyncPanel) installSyncPanel.style.display = 'none';

  // Set table header
  const viewerThead = $('viewerThead');
  if (viewerThead) viewerThead.innerHTML = VIEWER_HEADERS[tab] || VIEWER_HEADERS.products;

  // Render content
  if (tab === 'products') renderViewerTable();
  else if (tab === 'install') renderViewerInstallations();
  else if (tab === 'kits') renderViewerKits();

  makeTableColumnsResizable($('viewerTable'));
}

function renderViewerInstallations() {
  const q = ($('viewerSearch').value || '').toLowerCase().trim();
  let items = [...(instalacionesCatalog || [])];
  items.sort((a, b) => (a.sourceId || '').localeCompare(b.sourceId || '', undefined, { numeric: true }));
  items = items.map((s, i) => ({ ...s, _sortedIdx: i }));
  if (q)
    items = items.filter(
      s =>
        (s.description || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.subcategory || '').toLowerCase().includes(q) ||
        (s.observations || '').toLowerCase().includes(q)
    );
  const totalCount = (instalacionesCatalog || []).length;
  $('viewerCount').textContent =
    items.length + ' instalaciones' + (items.length !== totalCount ? ' (de ' + totalCount + ')' : '');
  const tabCount = $('viewerCountInstall');
  if (tabCount) tabCount.textContent = totalCount;
  const tbody = $('viewerBody');
  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:40px 20px;color:var(--muted);"><div style="font-size:24px;margin-bottom:8px;">🔧</div>No hay servicios de instalación<br><small>Sincroniza el catálogo para cargar datos</small></td></tr>';
    return;
  }
  tbody.innerHTML = items
    .map(s => {
      const idx = s._sortedIdx;
      return `<tr>
    <td>${s.sourceId || ''}</td>
    <td>${esc(s.description || '')}</td>
    <td>${esc(s.category || '')}</td>
    <td>${esc(s.subcategory || '')}</td>
    <td class="right">${fmt(s.cost)}</td>
    <td>${esc(s.observations || '')}</td>
    <td class="center" style="white-space:nowrap;"><div style="display:inline-flex;gap:4px;align-items:center;justify-content:center;"><button class="viewer-action-btn edit" onclick="openEditProductoModal('install',${idx})" title="Editar">✏️</button><button class="viewer-action-btn delete" onclick="deleteViewerProducto('install',${idx})" title="Eliminar">✕</button></div></td>
  </tr>`;
    })
    .join('');
  makeTableColumnsResizable($('viewerTable'));
}

// === KITS VIEWER ===

function renderViewerKits() {
  const q = ($('viewerSearch').value || '').toLowerCase().trim();
  const allKits = [...(kits || [])];
  let items = allKits.map((k, i) => ({ ...k, _kitIdx: i }));
  if (q) items = items.filter(k => (k.name || '').toLowerCase().includes(q));
  const totalCount = allKits.length;
  $('viewerCount').textContent =
    items.length + ' kits' + (items.length !== totalCount ? ' (de ' + totalCount + ')' : '');
  const tabCount = $('viewerCountKits');
  if (tabCount) tabCount.textContent = totalCount;
  const tbody = $('viewerBody');
  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:40px 20px;color:var(--muted);"><div style="font-size:24px;margin-bottom:8px;">📋</div>No hay kits creados<br><small>Haz clic en "+ Nuevo kit" para crear uno</small></td></tr>';
    return;
  }
  tbody.innerHTML = items
    .map(k => {
      const validComps = (k.components || []).filter(c => c.catalogIdx !== null && c.catalogIdx < CATALOG.length);
      const total = validComps.reduce((s, c) => s + (CATALOG[c.catalogIdx]?.cost || 0), 0);
      const idx = k._kitIdx;
      return `<tr>
      <td>KIT-${String(idx + 1).padStart(3, '0')}</td>
      <td>${esc(k.name || '')}</td>
      <td>${validComps.length} componente${validComps.length !== 1 ? 's' : ''}</td>
      <td class="right">${fmt(total)}</td>
      <td class="center" style="white-space:nowrap;"><div style="display:inline-flex;gap:4px;align-items:center;justify-content:center;"><button class="viewer-action-btn edit" onclick="editKitFromViewer(${idx})" title="Editar">✏️</button><button class="viewer-action-btn delete" onclick="deleteKitFromViewer(${idx})" title="Eliminar">✕</button></div></td>
    </tr>`;
    })
    .join('');
  makeTableColumnsResizable($('viewerTable'));
}

function editKitFromViewer(idx) {
  editKit(idx);
}

function deleteKitFromViewer(idx) {
  deleteKit(idx);
  renderViewerKits();
}

function addNewKitFromViewer() {
  addNewKit();
}

function addNewItemFromViewer(type) {
  if (type === 'product') {
    openCreateProductModal();
  } else if (type === 'install') {
    openCreateInstallModal();
  }
}

function toggleSubcatCustomInput(prefix) {
  const sel = $(prefix + '_subcategoria_select');
  const custom = $(prefix + '_subcategoria_custom');
  if (sel && custom) {
    custom.style.display = sel.value === '__new__' ? 'block' : 'none';
    if (sel.value === '__new__') custom.focus();
  }
}

// === CREATE PRODUCT MODAL ===

function openCreateProductModal() {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  const sel = $('newProdCategorySelect');
  if (sel) sel.value = '';
  const container = $('newProdFieldsContainer');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
  const btn = $('btnSaveNewProduct');
  if (btn) btn.disabled = true;
  $('createProductModal').classList.add('open');
}

function closeCreateProductModal() {
  $('createProductModal').classList.remove('open');
}

function onNewProdCategoryChange() {
  const cat = $('newProdCategorySelect').value;
  const container = $('newProdFieldsContainer');
  const btn = $('btnSaveNewProduct');

  if (!cat) {
    container.style.display = 'none';
    container.innerHTML = '';
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  container.style.display = 'block';

  const existingSubs = [
    ...new Set(
      CATALOG.filter(p => p.category === cat || p._table === cat)
        .map(p => p.subcategory)
        .filter(Boolean)
    ),
  ].sort();

  const tableItems = CATALOG.filter(p => p._table === cat);
  const prefixMap = { equipos: 'EQ-', materiales: 'MT-', servicios: 'SV-' };
  const prefix = prefixMap[cat] || 'PR-';
  const nextNum = tableItems.length + 1;
  const suggestedId = prefix + String(nextNum).padStart(4, '0');

  let html = '';

  // SECCIÓN 1: DATOS BÁSICOS
  html += `<div class="edit-producto-section">
    <div class="edit-producto-section-title">📋 Datos Básicos</div>
    <div class="edit-producto-grid">
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Subcategoría</label>
        <select id="newProdSubSelect" onchange="toggleNewProdSubInput()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
          <option value="">(Sin subcategoría / Seleccionar)</option>
          ${existingSubs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
          <option value="__new__">+ Escribir nueva subcategoría...</option>
        </select>
        <input type="text" id="newProdSubCustom" placeholder="Escribe nueva subcategoría..." style="display:none;margin-top:6px;width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Código / ID</label>
        <input type="text" id="newProdSourceId" value="${suggestedId}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>`;

  if (cat === 'equipos') {
    html += `<div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Modelo</label>
      <input type="text" id="newProdModelo" placeholder="Ej: DS-2CD2043G2-I..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>`;
  }

  html += `</div>`;

  const nameLabel = cat === 'servicios' ? 'Nombre del servicio *' : 'Nombre del producto / descripción *';
  html += `<div class="edit-producto-full" style="margin-top:10px;">
    <label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">${nameLabel}</label>
    <textarea id="newProdName" placeholder="Descripción clara y completa del ítem..." rows="2" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;min-height:55px;resize:vertical;"></textarea>
  </div></div>`;

  // SECCIÓN 2: PRECIOS Y MÁRGENES
  html += `<div class="edit-producto-section">
    <div class="edit-producto-section-title">💰 Precios y Márgenes</div>`;

  if (cat === 'servicios') {
    html += `<div class="edit-producto-grid">
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Costo mensual ($)</label>
        <input type="number" step="0.01" id="newProdCostoMensual" value="0.00" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Costo anual ($)</label>
        <input type="number" step="0.01" id="newProdCostoAnual" value="0.00" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>
    </div>`;
  } else {
    html += `<div class="edit-producto-grid">
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Costo unitario ($) *</label>
        <input type="number" step="0.01" id="newProdCostoUnitario" value="0.00" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>
      <div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Unidades</label>
        <input type="text" id="newProdUnidades" placeholder="Ej: u, m, global..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>`;
    if (cat === 'equipos') {
      html += `<div class="edit-producto-field"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Proveedor</label>
        <input type="text" id="newProdProveedor" placeholder="Ej: HIKVISION, DAHUA..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>`;
    }
    html += `</div>`;

    html += `<div class="edit-producto-full" style="margin-top:10px;">
      <label style="font-weight:600;font-size:12px;margin-bottom:6px;display:block;">Márgenes y Ganancias</label>
      <div style="display:flex;flex-direction:row;align-items:center;gap:20px;background:var(--bg,#f3f4f6);padding:10px 12px;border-radius:6px;border:1px solid var(--border);">
        <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">
          <input type="checkbox" id="newProdGanancia" checked> Ganancia proveedor
        </label>
        <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">
          <input type="checkbox" id="newProdInstalacion" checked> Ganancia instalación
        </label>
      </div>
    </div>`;
  }
  html += `</div>`;

  // SECCIÓN 3: DETALLES ADICIONALES
  html += `<div class="edit-producto-section">
    <div class="edit-producto-section-title">📝 Detalles Adicionales</div>`;
  if (cat === 'servicios') {
    html += `<div class="edit-producto-full" style="margin-bottom:10px;"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Descripción extendida (opcional)</label>
      <input type="text" id="newProdDescripcion" placeholder="Detalles del servicio..." style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;"></div>`;
  }
  html += `<div class="edit-producto-full"><label style="font-weight:600;font-size:12px;margin-bottom:4px;display:block;">Observaciones</label>
    <textarea id="newProdObservaciones" placeholder="Detalles u observaciones adicionales..." rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;min-height:70px;resize:vertical;font-size:13px;"></textarea></div>
  </div>`;

  container.innerHTML = html;
}

function toggleNewProdSubInput() {
  const sel = $('newProdSubSelect');
  const input = $('newProdSubCustom');
  if (sel && input) {
    input.style.display = sel.value === '__new__' ? 'block' : 'none';
    if (sel.value === '__new__') input.focus();
  }
}

function validateUniqueSourceId(sourceId, excludeId) {
  const cleanId = String(sourceId || '')
    .trim()
    .toUpperCase();
  if (!cleanId) return true;

  const productMatch = CATALOG.find(p => (p.sourceId || '').trim().toUpperCase() === cleanId && p._id !== excludeId);
  if (productMatch) return false;

  const installMatch = (instalacionesCatalog || []).find(
    i => (i.sourceId || '').trim().toUpperCase() === cleanId && i.id !== excludeId
  );
  if (installMatch) return false;

  return true;
}

async function saveNewProductFromModal() {
  const cat = $('newProdCategorySelect')?.value;
  if (!cat) {
    toast('Selecciona una categoría primero', 'warning');
    return;
  }

  const nameInput = $('newProdName');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    toast('Escribe el nombre/descripción del producto', 'warning');
    if (nameInput) nameInput.focus();
    return;
  }

  const subSel = $('newProdSubSelect');
  const subCustom = $('newProdSubCustom');
  let subcategory = '';
  if (subSel && subSel.value === '__new__') {
    subcategory = subCustom ? subCustom.value.trim() : '';
  } else if (subSel) {
    subcategory = subSel.value;
  }

  const sourceId = $('newProdSourceId')?.value?.trim() || '';
  if (sourceId && !validateUniqueSourceId(sourceId)) {
    toast(`⚠️ El código / ID "${sourceId}" ya existe en el catálogo. Usa uno diferente.`, 'warning');
    $('newProdSourceId')?.focus();
    return;
  }

  const observations = $('newProdObservaciones')?.value?.trim() || '';

  const row = {
    source_id: sourceId,
    categoria: cat.toUpperCase(),
    subcategoria: subcategory,
    observaciones: observations,
  };

  if (cat === 'servicios') {
    row.servicio = name;
    row.descripcion = $('newProdDescripcion')?.value?.trim() || '';
    row.costo_mensual = parseFloat($('newProdCostoMensual')?.value) || 0;
    row.costo_anual = parseFloat($('newProdCostoAnual')?.value) || 0;
  } else {
    row.producto = name;
    row.costo_unitario = parseFloat($('newProdCostoUnitario')?.value) || 0;
    row.costo_total = row.costo_unitario;
    row.unidades = $('newProdUnidades')?.value?.trim() || 'u';
    row.cantidad_default = 1;
    row.ganancia_flag = $('newProdGanancia')?.checked ?? true;
    row.instalacion_flag = $('newProdInstalacion')?.checked ?? true;
    if (cat === 'equipos') {
      row.modelo = $('newProdModelo')?.value?.trim() || '';
      row.proveedor = $('newProdProveedor')?.value?.trim() || '';
    }
  }

  try {
    const { error } = await supabase.from(cat).insert(row);
    if (error) throw error;
    toast('✓ Producto creado exitosamente', 'success');
    closeCreateProductModal();
    const updatedProds = await loadAllProducts();
    setCatalog(updatedProds);
    viewerProducts = CATALOG;
    renderCatalog();
    renderCategories();
    renderViewerCategories();
    renderViewerTable();
  } catch (e) {
    console.error('[CREATE PRODUCT] Save error:', e);
    toast('Error al guardar producto: ' + e.message, 'danger');
  }
}

// === CREATE INSTALLATION MODAL ===

function openCreateInstallModal() {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  $('newInstallServicio').value = '';
  $('newInstallCosto').value = '0.00';
  $('newInstallObservaciones').value = '';

  const catSel = $('newInstallCatSelect');
  catSel.innerHTML =
    '<option value="">(Sin categoría / Ninguna)</option>' +
    '<option value="EQUIPOS">EQUIPOS</option>' +
    '<option value="MATERIALES">MATERIALES</option>' +
    '<option value="SERVICIOS" selected>SERVICIOS</option>';
  $('newInstallCatCustom').style.display = 'none';
  $('newInstallCatCustom').value = '';

  const subSel = $('newInstallSubSelect');
  const existingSubs = [
    ...new Set(
      [...CATALOG.map(p => p.subcategory), ...(instalacionesCatalog || []).map(i => i.subcategory)].filter(Boolean)
    ),
  ].sort();
  subSel.innerHTML =
    '<option value="">(Sin subcategoría / Ninguna)</option>' +
    existingSubs.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('') +
    '<option value="__new__">+ Escribir nueva subcategoría...</option>';
  $('newInstallSubCustom').style.display = 'none';
  $('newInstallSubCustom').value = '';

  $('createInstallModal').classList.add('open');
}

function closeCreateInstallModal() {
  $('createInstallModal').classList.remove('open');
}

function toggleInstallCatInput() {
  const sel = $('newInstallCatSelect');
  const input = $('newInstallCatCustom');
  if (sel && input) {
    input.style.display = sel.value === '__new__' ? 'block' : 'none';
    if (sel.value === '__new__') input.focus();
  }
}

function toggleInstallSubInput() {
  const sel = $('newInstallSubSelect');
  const input = $('newInstallSubCustom');
  if (sel && input) {
    input.style.display = sel.value === '__new__' ? 'block' : 'none';
    if (sel.value === '__new__') input.focus();
  }
}

async function saveNewInstallFromModal() {
  const servicio = $('newInstallServicio')?.value?.trim() || '';
  if (!servicio) {
    toast('Escribe el nombre de la instalación / servicio', 'warning');
    $('newInstallServicio')?.focus();
    return;
  }

  const costo = parseFloat($('newInstallCosto')?.value) || 0;

  const catSel = $('newInstallCatSelect');
  const catCustom = $('newInstallCatCustom');
  let category = '';
  if (catSel && catSel.value === '__new__') {
    category = catCustom ? catCustom.value.trim() : '';
  } else if (catSel) {
    category = catSel.value;
  }

  const subSel = $('newInstallSubSelect');
  const subCustom = $('newInstallSubCustom');
  let subcategory = '';
  if (subSel && subSel.value === '__new__') {
    subcategory = subCustom ? subCustom.value.trim() : '';
  } else if (subSel) {
    subcategory = subSel.value;
  }

  const observaciones = $('newInstallObservaciones')?.value?.trim() || '';
  const nextNum = (instalacionesCatalog || []).length + 1;
  const sourceId = 'INST-' + String(nextNum).padStart(3, '0');
  if (sourceId && !validateUniqueSourceId(sourceId)) {
    toast(`⚠️ El código / ID "${sourceId}" ya existe. Usa uno diferente.`, 'warning');
    return;
  }

  const row = {
    source_id: sourceId,
    servicio: servicio,
    costo_unitario: costo,
    categoria: category,
    subcategoria: subcategory,
    observaciones: observaciones,
  };

  try {
    const { error } = await supabase.from('instalaciones').insert(row);
    if (error) throw error;
    toast('✓ Instalación creada exitosamente', 'success');
    closeCreateInstallModal();
    const instalaciones = await loadAllInstalaciones();
    setInstalacionesCatalog(instalaciones);
    renderViewerInstallations();
  } catch (e) {
    console.error('[CREATE INSTALL] Save error:', e);
    toast('Error al guardar instalación: ' + e.message, 'danger');
  }
}

function makeTableColumnsResizable(table) {
  if (!table) return;
  const ths = table.querySelectorAll('thead th');
  ths.forEach((th, idx) => {
    const oldResizer = th.querySelector('.col-resizer');
    if (oldResizer) oldResizer.remove();

    if (idx === ths.length - 1 && th.textContent.includes('Acciones')) return;

    th.style.position = 'relative';
    const resizer = document.createElement('div');
    resizer.className = 'col-resizer';
    th.appendChild(resizer);

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = e => {
      const dx = e.clientX - startX;
      const newW = Math.max(40, startWidth + dx);
      th.style.width = newW + 'px';
      th.style.minWidth = newW + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    resizer.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      startX = e.clientX;
      startWidth = th.offsetWidth;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
  });
}

// === SINGLE ITEM EDIT MODAL ===

let editItemData = null;
let editItemTable = null;

function getProductoDBValue(item, key) {
  if (!item) return '';
  if (item[key] !== undefined && item[key] !== null) return item[key];

  switch (key) {
    case 'source_id':
      return item.sourceId || item.source_id || '';
    case 'categoria':
      return item.category || item.categoria || '';
    case 'subcategoria':
      return item.subcategory || item.subcategoria || '';
    case 'producto':
    case 'servicio':
      return item.description || item.producto || item.servicio || '';
    case 'descripcion':
      return item.observations || item.descripcion || '';
    case 'modelo':
      return item.model || item.modelo || '';
    case 'unidades':
      return item.unidades || item.unit || '';
    case 'cantidad_default':
      return item.cantidadDefault ?? item.cantidad_default ?? 1;
    case 'costo_unitario':
      return item.cost ?? item.costo_unitario ?? 0;
    case 'costo_mensual':
      return item.monthlyCost ?? item.costo_mensual ?? 0;
    case 'costo_anual':
      return item.annualCost ?? item.costo_anual ?? 0;
    case 'ganancia_flag':
      return item.hasGanancia ?? item.ganancia_flag ?? false;
    case 'instalacion_flag':
      return item.hasInstalacion ?? item.instalacion_flag ?? false;
    case 'proveedor':
      return item.supplier || item.proveedor || '';
    case 'observaciones':
      return item.observations || item.observaciones || '';
    default:
      return '';
  }
}

function openEditProductoModal(type, idx) {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  let item;
  let table;
  if (type === 'product') {
    item = viewerProducts[idx];
    if (!item) return;
    table = item._table;
    editItemData = { ...item, _catalogIdx: idx };
    editItemTable = table;
  } else if (type === 'install') {
    const sorted = [...(instalacionesCatalog || [])].sort((a, b) =>
      (a.sourceId || '').localeCompare(b.sourceId || '', undefined, { numeric: true })
    );
    item = sorted[idx];
    if (!item) return;
    table = 'instalaciones';
    editItemData = { ...item, _installIdx: idx };
    editItemTable = table;
  } else {
    return;
  }

  const title = type === 'product' ? '✏️ Editar producto' : '✏️ Editar instalación';
  $('editItemTitle').textContent = title;

  const cols = EDITOR_COLS_MAP[table] || [];

  const renderField = c => {
    const val = getProductoDBValue(item, c.key);
    const readonly = c.type === 'readonly';
    const fieldClass = 'edit-producto-field';

    if (c.key === 'subcategoria') {
      const allSubs = [
        ...new Set(
          [
            ...CATALOG.map(p => p.subcategory),
            ...(instalacionesCatalog || []).map(i => i.subcategory),
            String(val || ''),
          ].filter(Boolean)
        ),
      ].sort();

      return `<div class="${fieldClass}"><label>${c.label}</label>
        <select id="editField_subcategoria_select" onchange="toggleSubcatCustomInput('editField')" ${readonly ? 'disabled' : ''}>
          ${allSubs.map(o => `<option value="${esc(o)}" ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
          <option value="__new__">+ Escribir nueva subcategoría...</option>
        </select>
        <input type="text" id="editField_subcategoria_custom" placeholder="Escribe nueva subcategoría..." style="display:none;margin-top:6px;width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
        </div>`;
    } else if (c.type === 'select' || c.key === 'categoria') {
      const validCats = ['EQUIPOS', 'MATERIALES', 'SERVICIOS'];
      const currentCategoryVal = String(val || '').toUpperCase();
      const allCats = validCats.includes(currentCategoryVal)
        ? validCats
        : [currentCategoryVal, ...validCats].filter(Boolean);

      return `<div class="${fieldClass}"><label>${c.label}</label>
        <select id="editField_${c.key}" ${readonly ? 'disabled' : ''}>
          ${allCats.map(o => `<option value="${esc(o)}" ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select></div>`;
    } else if (c.type === 'number') {
      return `<div class="${fieldClass}"><label>${c.label}</label>
        <input type="number" step="${c.step || '0.01'}" id="editField_${c.key}" value="${val}" ${readonly ? 'disabled class="field-readonly"' : ''}></div>`;
    } else {
      return `<div class="${fieldClass}"><label>${c.label}</label>
        <input type="text" id="editField_${c.key}" value="${escAttr(val)}" ${readonly ? 'disabled class="field-readonly"' : ''} ${c.placeholder ? 'placeholder="' + c.placeholder + '"' : ''}></div>`;
    }
  };

  const basicKeys = ['source_id', 'categoria', 'subcategoria', 'modelo', 'unidades'];
  const nameKeys = ['producto', 'servicio'];
  const priceKeys = ['costo_unitario', 'costo_mensual', 'costo_anual', 'proveedor', 'cantidad_default'];
  const checkCols = cols.filter(c => c.type === 'check');
  const obsCols = cols.filter(c => c.key === 'observaciones' || c.key === 'descripcion');

  const basicCols = cols.filter(c => basicKeys.includes(c.key));
  const mainNameCol = cols.find(c => nameKeys.includes(c.key));
  const priceCols = cols.filter(c => priceKeys.includes(c.key));

  let html = '';

  // SECCIÓN 1: DATOS BÁSICOS
  html += `<div class="edit-producto-section">
    <div class="edit-producto-section-title">📋 Datos Básicos</div>
    <div class="edit-producto-grid">`;
  basicCols.forEach(c => {
    html += renderField(c);
  });
  html += `</div>`;
  if (mainNameCol) {
    html += `<div class="edit-producto-full">${renderField(mainNameCol)}</div>`;
  }
  html += `</div>`;

  // SECCIÓN 2: PRECIOS Y MÁRGENES
  html += `<div class="edit-producto-section">
    <div class="edit-producto-section-title">💰 Precios y Márgenes</div>
    <div class="edit-producto-grid">`;
  priceCols.forEach(c => {
    html += renderField(c);
  });
  html += `</div>`;

  if (checkCols.length > 0) {
    html += `<div class="edit-producto-full">
      <label style="font-weight:600;font-size:12px;margin-bottom:6px;display:block;">Márgenes y Ganancias</label>
      <div style="display:flex;flex-direction:row;align-items:center;gap:20px;background:var(--bg,#f3f4f6);padding:10px 14px;border-radius:6px;border:1px solid var(--border);">`;
    checkCols.forEach(c => {
      const val = getProductoDBValue(item, c.key);
      html += `<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">
        <input type="checkbox" id="editField_${c.key}" ${val ? 'checked' : ''}>
        ${c.label}
      </label>`;
    });
    html += `</div></div>`;
  }
  html += `</div>`;

  // SECCIÓN 3: DETALLES ADICIONALES
  if (obsCols.length > 0) {
    html += `<div class="edit-producto-section">
      <div class="edit-producto-section-title">📝 Detalles Adicionales</div>
      <div class="edit-producto-full">`;
    obsCols.forEach(c => {
      html += renderField(c);
    });
    html += `</div></div>`;
  }

  $('editItemBody').innerHTML = html;
  $('editItemModal').classList.add('open');
}

function closeEditItemModal() {
  $('editItemModal').classList.remove('open');
  editItemData = null;
  editItemTable = null;
}

async function saveEditItem() {
  if (!editItemData || !editItemTable) return;
  const ok = await showConfirm('¿Estás seguro que deseas modificar este ítem?', 'Confirmar modificación', 'Guardar');
  if (!ok) return;

  const cols = EDITOR_COLS_MAP[editItemTable] || [];
  const changes = {};
  cols.forEach(c => {
    if (c.type === 'readonly') return;
    if (c.key === 'subcategoria') {
      const sel = $('editField_subcategoria_select');
      const custom = $('editField_subcategoria_custom');
      if (sel && sel.value === '__new__') {
        changes[c.key] = custom ? custom.value.trim() : '';
      } else if (sel) {
        changes[c.key] = sel.value;
      } else {
        const input = $('editField_subcategoria');
        if (input) changes[c.key] = input.value;
      }
      return;
    }
    const el = $('editField_' + c.key);
    if (!el) return;
    if (c.type === 'check') changes[c.key] = el.checked;
    else if (c.type === 'number') changes[c.key] = parseFloat(el.value) || 0;
    else changes[c.key] = el.value;
  });

  const isInstall = editItemTable === 'instalaciones';
  const supabaseTable = isInstall ? 'instalaciones' : editItemTable;
  const itemId = editItemData._id || editItemData.id;

  if (changes.source_id) {
    if (!validateUniqueSourceId(changes.source_id, itemId)) {
      toast(`⚠️ El código / ID "${changes.source_id}" ya existe. Usa uno diferente.`, 'warning');
      const input = $('editField_source_id');
      if (input) input.focus();
      return;
    }
  }

  try {
    if (itemId) {
      const { error } = await supabase.from(supabaseTable).update(changes).eq('id', itemId);
      if (error) throw error;
    }
    toast('✓ Ítem actualizado correctamente', 'success');
    closeEditItemModal();

    if (isInstall) {
      try {
        const instalaciones = await loadAllInstalaciones();
        setInstalacionesCatalog(instalaciones);
      } catch (e) {
        console.warn('Error reloading instalaciones:', e.message);
      }
      renderViewerCategories();
      renderViewerInstallations();
    } else {
      const updatedProds = await loadAllProducts();
      setCatalog(updatedProds);
      viewerProducts = CATALOG;
      renderCatalog();
      renderCategories();
      renderViewerCategories();
      renderViewerTable();
    }
  } catch (e) {
    console.error('[EDIT PRODUCTO] Save error:', e);
    toast('Error al guardar: ' + e.message, 'danger');
  }
}

async function deleteViewerProducto(type, idx) {
  if (type === 'product') {
    const item = viewerProducts[idx];
    if (!item) return;
    const name = (item.description || item.sourceId || '').slice(0, 60);
    const ok = await showConfirm('¿Eliminar "' + name + '"?', 'Eliminar producto', 'Eliminar');
    if (!ok) return;
    if (item._id) {
      const { error } = await supabase.from(item._table).delete().eq('id', item._id);
      if (error) {
        toast('Error al eliminar: ' + error.message, 'danger');
        return;
      }
    }
    toast('✓ Producto eliminado', 'success');
    const updatedProds = await loadAllProducts();
    setCatalog(updatedProds);
    viewerProducts = CATALOG;
    renderCatalog();
    renderCategories();
    renderViewerCategories();
    renderViewerTable();
  } else if (type === 'install') {
    const sorted = [...(instalacionesCatalog || [])].sort((a, b) =>
      (a.sourceId || '').localeCompare(b.sourceId || '', undefined, { numeric: true })
    );
    const item = sorted[idx];
    if (!item) return;
    const name = (item.description || item.sourceId || '').slice(0, 60);
    const ok = await showConfirm('¿Eliminar "' + name + '"?', 'Eliminar instalación', 'Eliminar');
    if (!ok) return;
    if (item._id) {
      const { error } = await supabase.from('instalaciones').delete().eq('id', item._id);
      if (error) {
        toast('Error al eliminar: ' + error.message, 'danger');
        return;
      }
    }
    toast('✓ Instalación eliminada', 'success');
    try {
      const instalaciones = await loadAllInstalaciones();
      setInstalacionesCatalog(instalaciones);
    } catch (e) {
      console.warn('Error reloading instalaciones:', e.message);
    }
    renderViewerCategories();
    renderViewerInstallations();
  }
}

// Column definitions for edit modal (map Supabase table → fields)
const EDITOR_COLS_MAP = {
  equipos: [
    { key: 'source_id', label: 'Id', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', type: 'text' },
    { key: 'producto', label: 'Producto / Servicio', type: 'text' },
    { key: 'modelo', label: 'Modelo', type: 'text' },
    { key: 'unidades', label: 'Unds', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cantidad', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unitario', type: 'number' },
    { key: 'ganancia_flag', label: 'Ganancia proveedor', type: 'check' },
    { key: 'instalacion_flag', label: 'Ganancia instalación', type: 'check' },
    { key: 'proveedor', label: 'Proveedor', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  materiales: [
    { key: 'source_id', label: 'Id', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', type: 'text' },
    { key: 'producto', label: 'Producto', type: 'text' },
    { key: 'unidades', label: 'Unds', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cantidad', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unitario', type: 'number' },
    { key: 'ganancia_flag', label: 'Ganancia proveedor', type: 'check' },
    { key: 'instalacion_flag', label: 'Ganancia instalación', type: 'check' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  servicios: [
    { key: 'source_id', label: 'Id', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', type: 'text' },
    { key: 'servicio', label: 'Servicio', type: 'text' },
    { key: 'descripcion', label: 'Descripción', type: 'text' },
    { key: 'costo_mensual', label: 'Costo Mensual', type: 'number' },
    { key: 'costo_anual', label: 'Costo Anual', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  instalaciones: [
    { key: 'source_id', label: 'Id', type: 'text' },
    { key: 'categoria', label: 'Categoría', type: 'select' },
    { key: 'subcategoria', label: 'Subcategoría', type: 'select' },
    { key: 'servicio', label: 'Servicio', type: 'text' },
    { key: 'costo_unitario', label: 'Costo', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
};

window.openCatalogViewer = openCatalogViewer;
window.closeCatalogViewer = closeCatalogViewer;
window.renderViewerTable = renderViewerTable;
window.renderViewerKits = renderViewerKits;
window.switchViewerTab = switchViewerTab;
window.openEditProductoModal = openEditProductoModal;
window.closeEditItemModal = closeEditItemModal;
window.saveEditItem = saveEditItem;
window.deleteViewerProducto = deleteViewerProducto;
window.editKitFromViewer = editKitFromViewer;
window.deleteKitFromViewer = deleteKitFromViewer;
window.addNewKitFromViewer = addNewKitFromViewer;
window.addNewItemFromViewer = addNewItemFromViewer;
window.toggleSubcatCustomInput = toggleSubcatCustomInput;
window.openCreateProductModal = openCreateProductModal;
window.closeCreateProductModal = closeCreateProductModal;
window.onNewProdCategoryChange = onNewProdCategoryChange;
window.toggleNewProdSubInput = toggleNewProdSubInput;
window.saveNewProductFromModal = saveNewProductFromModal;
window.openCreateInstallModal = openCreateInstallModal;
window.closeCreateInstallModal = closeCreateInstallModal;
window.toggleInstallCatInput = toggleInstallCatInput;
window.toggleInstallSubInput = toggleInstallSubInput;
window.saveNewInstallFromModal = saveNewInstallFromModal;

// editor functions imported from modules/editor.js
window.openCatalogEditor = openCatalogEditor;
window.closeCatalogEditor = closeCatalogEditor;
window.renderEditorTable = renderEditorTable;
window.addNewProduct = addNewProduct;
window.saveCatalogEdits = saveCatalogEdits;
window.editorField = editorField;
window.editorToggleDelete = editorToggleDelete;

// install editor functions
window.openInstallEditor = openInstallEditor;
window.closeInstallEditor = closeInstallEditor;
window.renderInstallEditorTable = renderInstallEditorTable;
window.installEditorField = installEditorField;
window.installEditorToggleDelete = installEditorToggleDelete;
window.addNewInstall = addNewInstall;
window.saveInstallEditor = saveInstallEditor;

// === BOOT ===
async function bootApp() {
  const dbLoaded = await loadCatalogFromDB();
  if (!dbLoaded) loadCustomCatalogIfExists();
  renderCategories();

  $('search').addEventListener('input', () => {
    catalogPage = 1;
    renderCatalog();
  });
  $('categoryFilter').addEventListener('change', () => {
    catalogPage = 1;
    renderSubcategories($('categoryFilter').value);
    renderCatalog();
  });
  $('subcategoryFilter').addEventListener('change', () => {
    catalogPage = 1;
    renderCatalog();
  });
  $('viewerSearch').addEventListener('input', () => {
    if (viewerTab === 'install') renderViewerInstallations();
    else renderViewerTable();
  });
  $('viewerCategory').addEventListener('change', () => {
    renderViewerSubcategories($('viewerCategory').value);
    renderViewerTable();
  });
  if ($('viewerSubcategory')) $('viewerSubcategory').addEventListener('change', renderViewerTable);
  document
    .querySelectorAll('.quote-panel input, .quote-panel textarea')
    .forEach(el => el.addEventListener('change', saveDraft));
  document
    .querySelectorAll('#clientName,#clientRuc,#clientAddress,#clientContact,#clientPhone,#clientEmail,#cotNum,#cotDate')
    .forEach(el => el.addEventListener('input', syncPrintView));

  const raw = localStorage.getItem('quote_draft');
  if (raw) {
    try {
      const draft = JSON.parse(raw);
      if (draft.productos && draft.productos.length > 0) loadQuoteData(draft);
    } catch (_e) {
      /* ignore corrupt draft */
    }
  }
  if (!$('cotNum').value) $('cotNum').value = await generateNextCotNumberFromDB();
  if (!$('cotDate').value) $('cotDate').value = new Date().toISOString().split('T')[0];
  renderCatalog();
  renderCart();
  syncPrintView();
  applyEmpresaHeader();
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
  const hdr = $('printHeaderClientName');
  if (hdr) hdr.textContent = $('clientName').value || '';
  const cotName = $('printCotizadorName');
  const cotRole = $('printCotizadorRole');
  if (cotName)
    cotName.textContent =
      currentSession?.nombre || localStorage.getItem('usuario_nombre') || '[Nombre del responsable]';
  if (cotRole) {
    const cargo = currentSession?.cargo || '';
    cotRole.textContent = cargo || '[Cargo]';
  }
  const condEl = $('quoteConditions');
  const printCondEl = $('printConditions');
  if (condEl && printCondEl) {
    const raw = condEl.value.trim();
    printCondEl.innerHTML = raw
      .split('\n')
      .map(l => {
        const m = l.match(/^([^:]+):\s*(.+)/);
        return m ? `<strong>${esc(m[1])}:</strong> ${esc(m[2])}<br>` : esc(l) + '<br>';
      })
      .join('');
  }
  const notesEl = $('quoteNotes');
  const printNotesEl = $('printNotes');
  if (notesEl && printNotesEl) {
    const notes = notesEl.value.trim();
    if (notes) {
      printNotesEl.innerHTML =
        '<strong>NOTAS:</strong><br>' +
        notes
          .split('\n')
          .map(l => esc(l) + '<br>')
          .join('');
      printNotesEl.style.display = 'block';
    } else {
      printNotesEl.style.display = 'none';
    }
  }

  // Sync print-only applied installations section
  const printInstSection = $('printInstalacionesSection');
  if (printInstSection) {
    const installServices = cart.filter(c => c.isInstallService);
    const itemInstalls = [];
    cart.forEach(c => {
      if (c.isKit) {
        (c.kitComponents || []).forEach(comp => {
          if (comp.installActive) {
            const item = CATALOG[comp.catalogIdx];
            if (item) {
              const pricing = calcItemPrice(item, {
                supplierMargin: comp.customMargin ?? getSupplierMargin(item.supplier),
                installMargin: installationMarginPct,
                techCost: comp.techCost,
                installActive: true,
              });
              itemInstalls.push({
                desc: 'Instalación: ' + (item.description || item.sourceId),
                qty: (comp.qty || 1) * (c.qty || 1),
                total: pricing.instalacionPrice * (comp.qty || 1) * (c.qty || 1),
              });
            }
          }
        });
      } else if (c.installActive && !c.isInstallService) {
        const item = CATALOG[c.catalogIdx];
        if (item) {
          const pricing = calcItemPrice(item, {
            supplierMargin: c.customMargin ?? getSupplierMargin(item.supplier),
            installMargin: installationMarginPct,
            techCost: c.techCost,
            installActive: true,
          });
          itemInstalls.push({
            desc: 'Instalación: ' + (item.description || item.sourceId),
            qty: c.qty || 1,
            total: pricing.instalacionPrice * (c.qty || 1),
          });
        }
      }
    });

    const hasInstalls = installServices.length > 0 || itemInstalls.length > 0;
    if (hasInstalls) {
      let instHtml = '<div class="print-instalaciones-title">🔧 SERVICIOS DE INSTALACIÓN INCLUIDOS</div>';
      instHtml +=
        '<table class="productos-table print-inst-table"><thead><tr><th>#</th><th>Servicio / Descripción de Instalación</th><th class="center">Cant</th><th class="right">Precio Total</th></tr></thead><tbody>';
      let rowNum = 1;
      installServices.forEach(s => {
        const pricing = calcInstallServicePrice(s, s.customMargin ?? DEFAULT_INSTALL_MARGIN);
        const total = pricing.total * s.qty;
        instHtml += `<tr><td class="producto-num">${rowNum++}</td><td><strong>${esc(s.description)}</strong>${s.category || s.subcategory ? ' <small style="color:#64748b;">(' + esc(s.category || '') + (s.subcategory ? ' › ' + esc(s.subcategory) : '') + ')</small>' : ''}</td><td class="center">${s.qty}</td><td class="right"><strong>${fmt(total)}</strong></td></tr>`;
      });
      itemInstalls.forEach(inst => {
        instHtml += `<tr><td class="producto-num">${rowNum++}</td><td>${esc(inst.desc)}</td><td class="center">${inst.qty}</td><td class="right"><strong>${fmt(inst.total)}</strong></td></tr>`;
      });
      instHtml += '</tbody></table>';
      printInstSection.innerHTML = instHtml;
      printInstSection.style.display = 'block';
    } else {
      printInstSection.style.display = 'none';
      printInstSection.innerHTML = '';
    }
  }
  const clientName = $('clientName').value.trim();
  const cotNum = $('cotNum').value.trim();
  if (clientName) {
    document.title = (cotNum ? cotNum + ' - ' : '') + clientName;
  }
}
window.addEventListener('beforeprint', syncPrintView);

function applyEmpresaHeader() {}
function loadCustomCatalogIfExists() {
  const raw = localStorage.getItem('custom_catalog');
  if (!raw) return false;
  try {
    const custom = JSON.parse(raw);
    if (custom.length > 0) {
      CATALOG.length = 0;
      custom.forEach(i => CATALOG.push(i));
      return true;
    }
  } catch (_e) {
    /* no custom catalog */
  }
  return false;
}
async function resetCatalog() {
  if (!(await showConfirm('¿Restaurar catálogo desde DB?', 'Restaurar catálogo', 'Restaurar'))) return;
  localStorage.removeItem('custom_catalog');
  location.reload();
}

function enterApp(session) {
  setCurrentSession(session);
  $('loginOverlay').classList.add('hidden');
  const chipName = $('userChipName');
  chipName.textContent = session.nombre || session.user;
  chipName.classList.add('user-chip-name-full');
  const roleLabel = session.cargo || (session.rol === 'admin' ? 'Administrador' : 'Asesor');
  const roleBadge = $('userChipRole');
  if (roleBadge) roleBadge.textContent = roleLabel;
  const ddName = $('dropdownName');
  if (ddName) ddName.textContent = session.nombre || session.user;
  const ddRole = $('dropdownRole');
  if (ddRole) ddRole.textContent = roleLabel + ' · ' + (session.email || '');
  const btnUserManagement = $('btnUserManagement');
  if (btnUserManagement) btnUserManagement.style.display = session.rol === 'admin' ? 'inline-block' : 'none';
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp().catch(e => {
    toast('Error al iniciar: ' + e.message, 'danger');
  });
}
window._enterApp = enterApp;

// === MY PROFILE / CARGO ===
function openProfile() {
  $('userDropdown').classList.remove('show');
  const nameEl = $('ProfileName');
  const emailEl = $('ProfileEmail');
  const cargoSelect = $('ProfileCargo');
  const cargoCustom = $('ProfileCargoCustom');
  if (nameEl) nameEl.value = currentSession?.nombre || '';
  if (emailEl) emailEl.value = currentSession?.email || '';
  const currentCargo = currentSession?.cargo || 'Asesor';
  const options = Array.from(cargoSelect.options).map(o => o.value);
  if (options.includes(currentCargo)) {
    cargoSelect.value = currentCargo;
    cargoCustom.style.display = 'none';
  } else {
    cargoSelect.value = '__other__';
    cargoCustom.value = currentCargo;
    cargoCustom.style.display = 'block';
  }
  $('ProfileModal').classList.add('open');
}

function closeProfile() {
  $('ProfileModal').classList.remove('open');
  $('ProfileCargoCustom').style.display = 'none';
  $('ProfileCargoCustom').value = '';
}

function toggleProfileCargoCustom() {
  const sel = $('ProfileCargo');
  const custom = $('ProfileCargoCustom');
  if (sel && custom) {
    custom.style.display = sel.value === '__other__' ? 'block' : 'none';
    if (sel.value === '__other__') custom.focus();
  }
}

async function saveProfileCargo() {
  const sel = $('ProfileCargo');
  const custom = $('ProfileCargoCustom');
  let cargo = sel.value;
  if (cargo === '__other__') {
    cargo = custom ? custom.value.trim() : '';
    if (!cargo) {
      toast('Escribe un cargo', 'warning');
      if (custom) {
        custom.focus();
        custom.classList.add('input-field-error');
      }
      return;
    }
  }
  try {
    const { error } = await supabase.from('profiles').update({ cargo }).eq('id', currentSession.userId);
    if (error) throw error;
    currentSession.cargo = cargo;
    localStorage.setItem('session', JSON.stringify(currentSession));
    toast('✅ Cargo actualizado: ' + cargo, 'success');
    closeProfile();
  } catch (e) {
    toast('❌ Error al guardar: ' + e.message, 'danger');
  }
}
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.toggleProfileCargoCustom = toggleProfileCargoCustom;
window.saveProfileCargo = saveProfileCargo;

// === CUSTOM CONFIRM MODAL ===
// showConfirm and resolveConfirm imported from utils.js

// === PRODUCT DETAIL MODAL ===
// modal functions (product detail, cart detail, help, templates) imported from modules/modals.js

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
    const { data, error } = await supabase.from('profiles').select('*').order('nombre', { ascending: true });
    if (error) throw error;
    _usersCache = data || [];
    renderUsersTable();
    if (_usersCache.length === 0) {
      toast('⚠️ No se encontraron usuarios. ¿Ejecutaste fix_profiles_rls.sql?', 'warning');
    }
  } catch (e) {
    $('usersTableBody').innerHTML =
      `<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:16px;">Error: ${esc(e.message)}</td></tr>`;
  }
  $('usersLoading').style.display = 'none';
}

function renderUsersTable() {
  const tbody = $('usersTableBody');
  if (!_usersCache.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px;">No hay usuarios registrados</td></tr>';
    $('userManagementCount').textContent = '0 usuarios';
    return;
  }
  $('userManagementCount').textContent = _usersCache.length + ' usuario' + (_usersCache.length !== 1 ? 's' : '');
  tbody.innerHTML = _usersCache
    .map(u => {
      const rolBadge =
        u.rol === 'admin'
          ? '<span class="margin-badge margin-supplier">Admin</span>'
          : '<span class="margin-badge margin-none">Asesor</span>';
      const estadoBadge =
        u.activo === false
          ? '<span class="margin-badge" style="background:#fee2e2;color:#991b1b;">Inactivo</span>'
          : '<span class="margin-badge" style="background:#d1fae5;color:#065f46;">Activo</span>';
      const isCurrent = currentSession && currentSession.userId === u.id;
      return `<tr style="${isCurrent ? 'background:#f0f9ff;' : ''}">
      <td style="font-weight:500;">${esc(u.nombre || '—')}</td>
      <td style="color:var(--muted);font-size:11px;">${esc(u.correo || '—')}</td>
      <td>${rolBadge}</td>
      <td class="center">${estadoBadge}</td>
      <td>
        <button class="btn btn-ghost" onclick='openEditUser(${JSON.stringify({ id: u.id, nombre: u.nombre || '', correo: u.correo || '', rol: u.rol || 'asesor', cargo: u.cargo || '', activo: u.activo !== false }).replace(/'/g, '&#39;')})' style="font-size:11px;padding:4px 10px;">✏️ Editar</button>
      </td>
    </tr>`;
    })
    .join('');
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
        data: { nombre, rol: role },
      },
    });
    if (error) throw error;

    if (data.user) {
      const cargoDefault = role === 'admin' ? 'Administrador' : 'Asesor';
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          correo: email,
          nombre,
          rol: role,
          cargo: cargoDefault,
          activo: true,
        },
        { onConflict: 'id' }
      );
      if (profileError) {
        console.warn('Profile upsert:', profileError.message);
      }
    }

    if (data.user && !data.session) {
      toast(
        '✅ Usuario creado: ' +
          email +
          '. Para que pueda ingresar sin confirmar email: Supabase Dashboard → Authentication → Settings → desactivar "Enable email confirmations"',
        'success'
      );
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
    if (msg.includes('Signups not allowed'))
      msg = 'Registro deshabilitado. Actívalo en Supabase Dashboard → Authentication → Providers';
    if (msg.includes('500') || msg.includes('Internal Server Error'))
      msg = 'Error del servidor. Ejecuta fix_signup_triggers.sql en Supabase SQL Editor';
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear usuario';
  }
}

async function toggleUserActive(userId, currentlyActive) {
  const action = currentlyActive ? 'desactivar' : 'activar';
  if (
    !(await showConfirm(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} este usuario?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} usuario`,
      action.charAt(0).toUpperCase() + action.slice(1)
    ))
  )
    return;
  try {
    const { error } = await supabase.from('profiles').update({ activo: !currentlyActive }).eq('id', userId);
    if (error) throw error;
    toast(currentlyActive ? '🔴 Usuario desactivado' : '🟢 Usuario activado', 'success');
    await loadUsers();
  } catch (e) {
    toast('⚠️ Error: ' + e.message, 'danger');
  }
}

async function promoteUser(userId) {
  if (!(await showConfirm('¿Promover a administrador?', 'Promover usuario', 'Promover'))) return;
  try {
    const { error } = await supabase.from('profiles').update({ rol: 'admin' }).eq('id', userId);
    if (error) throw error;
    toast('⭐ Ahora es administrador', 'success');
    await loadUsers();
  } catch (e) {
    toast('⚠️ Error: ' + e.message, 'danger');
  }
}

async function demoteUser(userId) {
  if (!(await showConfirm('¿Quitar rol de administrador?', 'Degradar usuario', 'Degradar'))) return;
  try {
    const { error } = await supabase.from('profiles').update({ rol: 'vendedor' }).eq('id', userId);
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
  $('editUserEmail').value = user.correo;
  $('editUserPassword').value = '';
  $('editUserRole').value = user.rol;
  $('editUserActive').value = user.activo ? 'true' : 'false';
  $('editUserTitle').textContent = 'Editar: ' + (user.nombre || user.correo);
  $('editUserError').style.display = 'none';
  $('editUserModal').classList.add('open');
  $('editUserModal')._currentCargo = user.cargo || '';
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
    const cargo = $('editUserModal')._currentCargo || '';
    const { error } = await supabase.from('profiles').update({ nombre, rol: role, activo, cargo }).eq('id', userId);
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

// === TEMPLATE DOWNLOAD & SAVE ===
function downloadTemplatePdf(id) {
  downloadTemplate(id);
}

async function saveCurrentAsTemplate() {
  if (cart.length === 0) {
    toast('Agrega productos primero', 'warning');
    return;
  }
  const clientName = $('clientName').value.trim();
  if (!clientName) {
    toast('Ingresa el nombre del cliente', 'warning');
    return;
  }

  const result = await showSaveTemplateModal(clientName + ' - ');
  if (!result || !result.name) return;

  const items = cart
    .map(c => ({
      sourceId: CATALOG[c.catalogIdx]?.sourceId || '',
      qty: c.qty,
      installActive: c.installActive,
      techCost: c.techCost,
    }))
    .filter(it => it.sourceId);

  if (!items.length) {
    toast('No se pudieron resolver los productos', 'warning');
    return;
  }

  const tpl = {
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
    isTemplate: true,
  };

  await window.saveTemplate(tpl, currentSession);
  toast('Plantilla guardada: ' + result.name, 'success');
  renderTemplateList();
}

// === EXPORTS ===
window.showConfirm = showConfirm;
window.resolveConfirm = resolveConfirm;
window.resolveSaveTemplate = resolveSaveTemplate;
window.toggleTplIndustryCustom = toggleTplIndustryCustom;
window.openProductDetail = openProductDetail;
window.openCartItemDetail = openCartItemDetail;
window.closeProductDetail = closeProductDetail;
window.setModality = setModality;
window.updateSupplierMarginGlobal = updateSupplierMarginGlobal;
window.handleSyncClick = handleSyncClick;
window.openSavedModal = openSavedModal;
window.closeSavedModal = closeSavedModal;
window.newQuote = newQuote;
window.saveQuote = saveQuote;
window.loadQuoteData = loadQuoteData;
window.doPrint = doPrint;
window.loadDraft = loadDraft;
window.resetCatalog = resetCatalog;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
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
window.updateDiscount = updateDiscount;
window.switchCatalogTab = switchCatalogTab;
window.addNewKit = addNewKit;
window.editKit = editKit;
window.deleteKit = deleteKit;
window.addKitToCart = addKitToCart;
window.saveKitEditor = saveKitEditor;
window.closeKitEditor = closeKitEditor;
window.addKitComponent = addKitComponent;
window.removeKitComp = removeKitComp;
window.updateKitComp = updateKitComp;
window.openKitsModal = openKitsModal;
window.closeKitsModal = closeKitsModal;
window.renderKitsCatalog = renderKitsCatalog;
window.toggleKitExpand = toggleKitExpand;
window.filterKitProducts = filterKitProducts;
window.addKitComponentFromSearch = addKitComponentFromSearch;
window.openKitDetail = openKitDetail;
window.updateKitCompQty = updateKitCompQty;
window.toggleKitCompInstall = toggleKitCompInstall;
window.updateKitCompTechCost = updateKitCompTechCost;
window.removeKitComponentFromCart = removeKitComponentFromCart;
window.updateKitCompMargin = updateKitCompMargin;
window.renderCart = renderCart;
window.renderCatalog = renderCatalog;
window.renderMarginConfig = renderMarginConfig;
window.saveDraft = saveDraft;
window.openInstallServicePicker = openInstallServicePicker;
window.closeInstallServicePicker = closeInstallServicePicker;
window.renderInstallServiceList = renderInstallServiceList;
window.addInstallServiceToCart = addInstallServiceToCart;
window.openInstallServiceEditor = openInstallServiceEditor;
window.closeInstallServiceEditor = closeInstallServiceEditor;
window.saveInstallServiceEditor = saveInstallServiceEditor;
window.updateInstallServiceQty = updateInstallServiceQty;
window.updateInstallServiceMargin = updateInstallServiceMargin;
window.updateInstallServiceCost = updateInstallServiceCost;
window.openInstallSyncPanel = openInstallSyncPanel;
window.closeInstallSyncPanel = closeInstallSyncPanel;
window.startInstallSync = startInstallSync;
window.stopInstallSync = stopInstallSync;
window.renderInstallServiceSubcategories = renderInstallServiceSubcategories;
