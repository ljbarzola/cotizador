import { syncFromGoogleSheets, loadAllProducts, loadAllInstalaciones, getSyncLog } from './modules/sync.js';
import supabase from './lib/supabase.js';
import { calcItemPrice, calcInstallServicePrice, getSupplierMargin, marginBadge } from './modules/helpers.js';
import { calcItemTotals, calcDiscount, calcSubtotal } from './modules/cartCalculations.js';
import {
  CATALOG,
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
  installationEnabled,
  setInstallationEnabled,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  historyQuotesCache,
  setHistoryQuotesCache,
  STATUS_LABELS,
  instalacionesCatalog,
  setInstalacionesCatalog,
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
  toast,
  showConfirm,
  resolveConfirm,
  resolveSaveTemplate,
  generateCotNumber,
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
    totalFiltered + ' ítems' + (totalFiltered !== CATALOG.length ? ' (de ' + CATALOG.length + ')' : '');

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
      const subcatLabel = item.subcategory ? '<span class="cat-item-subcat">' + item.subcategory + '</span>' : '';
      const modelLabel = item.model ? '<span class="cat-item-model">' + item.model + '</span>' : '';
      const unitsLabel = item.unidades ? '<span class="cat-item-units">' + item.unidades + '</span>' : '';
      const qtyLabel = item.cantidadDefault ? '<span class="cat-item-units">x' + item.cantidadDefault + '</span>' : '';

      const pricing = calcItemPrice(item);
      const price = pricing.subtotalEquipo;
      const badges = marginBadge(item);

      return `
      <div class="cat-item">
        <div class="cat-item-info" onclick="openProductDetail(${realIdx})" style="cursor:pointer;">
          <div class="cat-item-code">${code} ${modelLabel}</div>
          <div class="cat-item-desc">${esc(item.description)}</div>
          <div class="cat-item-meta">
            ${subcatLabel}
            ${unitsLabel}
            ${qtyLabel}
            ${badges}
            <span class="cat-item-supplier">${supplier}</span>
          </div>
          <div class="cat-item-details">
            ${item.observations ? '<span title="' + esc(item.observations) + '">📝</span>' : ''}
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
    cart.push({
      catalogIdx: idx,
      qty: item.cantidadDefault ? parseFloat(item.cantidadDefault) || 1 : 1,
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

function updateItemMargin(idx, val) {
  cart[idx].customMargin = parseFloat(val) || null;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    renderCart();
    saveDraft();
  }, 300);
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
  supplierMargins[key] = parseFloat(val) || 0;
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    renderCart();
    saveDraft();
  }, 300);
}

function updateInstallationMargin(val) {
  setInstallationMarginPct(parseFloat(val) || 0);
  clearTimeout(window._marginRenderTimer);
  window._marginRenderTimer = setTimeout(() => {
    renderCart();
    saveDraft();
  }, 300);
}

function toggleInstallationGlobal() {
  setInstallationEnabled(!installationEnabled);
  if (installationEnabled) {
    cart.forEach(c => {
      if (c.isKit) {
        c.kitComponents.forEach(cc => {
          const item = CATALOG[cc.catalogIdx];
          if (item && item.hasInstalacion) cc.installActive = true;
        });
        return;
      }
      const item = CATALOG[c.catalogIdx];
      if (item.hasInstalacion) c.installActive = true;
    });
  } else {
    cart.forEach(c => {
      if (c.isKit) {
        c.kitComponents.forEach(cc => {
          cc.installActive = false;
        });
        return;
      }
      c.installActive = false;
    });
  }
  renderCart();
  saveDraft();
}

// === INSTALL SERVICES ===
function openInstallServicePicker() {
  const modal = $('installServicePickerModal');
  if (!modal) return;
  modal.classList.add('open');
  renderInstallServiceList();
}

function closeInstallServicePicker() {
  const modal = $('installServicePickerModal');
  if (modal) modal.classList.remove('open');
}

function renderInstallServiceList() {
  const container = $('installServiceList');
  if (!container) return;
  if (!instalacionesCatalog || instalacionesCatalog.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🔧</div><div>No hay servicios de instalación disponibles.</div><div style="margin-top:4px;font-size:11px;">Sincroniza el catálogo desde Google Sheets</div></div>';
    return;
  }
  const searchVal = ($('installServiceSearch')?.value || '').toLowerCase();
  const filtered = instalacionesCatalog.filter(
    s =>
      !searchVal ||
      s.description.toLowerCase().includes(searchVal) ||
      (s.observations || '').toLowerCase().includes(searchVal)
  );
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🔍</div><div>No se encontraron servicios.</div></div>';
    return;
  }
  let html = '<div class="install-service-grid">';
  filtered.forEach(s => {
    html += `<div class="install-service-card" onclick="addInstallServiceToCart('${esc(s.id)}')">
      <div class="isc-desc">${esc(s.description)}</div>
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
  $('iseIdx').value = idx;
}

function closeInstallServiceEditor() {
  const modal = $('installServiceEditorModal');
  if (modal) modal.classList.remove('open');
}

function saveInstallServiceEditor() {
  const idx = parseInt($('iseIdx').value);
  const qty = parseInt($('iseQty').value) || 1;
  if (cart[idx] && cart[idx].isInstallService) {
    cart[idx].qty = qty;
  }
  closeInstallServiceEditor();
  renderCart();
  saveDraft();
}

// === RENDER CART ===
function renderCart() {
  const container = $('itemsContainer');
  $('itemsCount').textContent = cart.length + ' ítem' + (cart.length === 1 ? '' : 's');
  if (cart.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🛒</div><div>Aún no hay productos en la cotización.</div><div style="margin-top:4px;font-size:11px;">Busca y agrega productos del catálogo (panel izquierdo)</div></div>';
    renderMarginConfig();
    renderTotals();
    return;
  }

  let html = '';

  // === TABLA DE DETALLE ===
  html += '<table class="items-table"><thead><tr>';
  html += '<th class="item-num">#</th>';
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

  // Order: kits first, then install services, then individual items
  const kits = [];
  const installServices = [];
  const individuals = [];
  cart.forEach((c, i) => {
    if (c.isKit) kits.push({ c, origIdx: i });
    else if (c.isInstallService) installServices.push({ c, origIdx: i });
    else individuals.push({ c, origIdx: i });
  });
  const ordered = [...kits, ...installServices, ...individuals];

  let rowNum = 0;
  const hasKits = kits.length > 0;
  const hasInstallServices = installServices.length > 0;
  const hasIndividuals = individuals.length > 0;
  let inKitsSection = true;
  let inInstallSection = false;

  ordered.forEach(({ c, origIdx: idx }) => {
    if (c.isKit) {
      const kitComps = c.kitComponents.filter(cc => cc.catalogIdx >= 0 && cc.catalogIdx < CATALOG.length);

      html += `<tr class="kit-header-row">
        <td class="item-num">📦</td>
        <td class="item-desc" colspan="8">
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
            ? `<span class="install-active">🟩 ${fmt(compPricing.instalacionPrice)}</span>`
            : '<span class="install-pending">⬛</span>'
          : '<span style="color:var(--muted);">—</span>';
        html += `<tr class="kit-row">
          <td class="item-num">${rowNum}</td>
          <td class="item-desc item-desc-click" onclick="openCartItemDetail(${idx})" title="Ver detalle">
            <span class="item-desc-text">${esc(it.description)}</span>
            <div class="item-badges">${badges}</div>
            <small>${it.sourceId || ''}${it.supplier ? ' · ' + it.supplier : ''}</small>
          </td>
          <td class="center" style="font-size:11px;font-weight:600;color:var(--primary);">${it.unit || '—'}</td>
          <td class="right"><span class="print-hide-col">${fmt(compPricing.baseCost)}</span><span class="print-only">${fmt(compPricing.priceBeforeIva)}</span></td>
          <td class="center"><input type="number" min="0" step="any" value="${compData.qty ?? 1}" class="qty-input" onchange="updateKitCompQty(${idx}, ${compIdx}, this.value)"></td>
          <td class="right"><span class="print-hide-col"><strong>${fmt(compPricing.baseCost * compQty)}</strong></span><span class="print-only"><strong>${fmt(compPricing.priceBeforeIva * compQty)}</strong></span></td>
          <td class="right print-hide-col">${marginCell}</td>
          <td class="right print-hide-col">${fmt(compPvp)}</td>
          <td class="center">${installCell}</td>
          <td class="print-hide-col"><button class="remove-btn" onclick="removeKitComponentFromCart(${idx}, ${compIdx})" title="Eliminar del kit">✕</button></td>
        </tr>`;
      });
      return;
    }
    if (c.isInstallService) {
      if (inKitsSection && hasKits) {
        inKitsSection = false;
        inInstallSection = true;
        html += `<tr class="kit-items-separator"><td colspan="10"><div class="kit-items-divider"></div></td></tr>`;
      } else if (!inKitsSection && !inInstallSection && hasInstallServices) {
        inInstallSection = true;
        html += `<tr class="kit-items-separator"><td colspan="10"><div class="kit-items-divider"></div></td></tr>`;
      }
      rowNum++;
      const pricing = calcInstallServicePrice(c, installationMarginPct);
      const total = pricing.total * c.qty;
      html += `<tr class="install-service-row">
        <td class="item-num">${rowNum}</td>
        <td class="item-desc item-desc-click" onclick="openInstallServiceEditor(${idx})" title="Ver detalle">
          <span class="item-desc-text">🔧 ${esc(c.description)}</span>
          <small>Servicio de instalación</small>
        </td>
        <td class="center" style="font-size:11px;font-weight:600;color:var(--primary);">serv</td>
        <td class="right"><span class="print-hide-col">${fmt(pricing.baseCost)}</span><span class="print-only">${fmt(pricing.total)}</span></td>
        <td class="center"><input type="number" min="1" step="1" value="${c.qty}" class="qty-input" onchange="updateInstallServiceQty(${idx}, this.value)"></td>
        <td class="right"><span class="print-hide-col"><strong>${fmt(pricing.baseCost * c.qty)}</strong></span><span class="print-only"><strong>${fmt(total)}</strong></span></td>
        <td class="right print-hide-col">${pricing.ganancia > 0 ? `<span class="supplier-detail">${fmt(pricing.ganancia * c.qty)}</span>` : '<span style="color:var(--muted);">—</span>'}</td>
        <td class="right print-hide-col">${fmt(total)}</td>
        <td class="center" style="color:var(--muted);">—</td>
        <td class="print-hide-col"><button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar">✕</button></td>
      </tr>`;
      return;
    }
    if (inKitsSection) {
      inKitsSection = false;
      if (hasKits && hasIndividuals) {
        html += `<tr class="kit-items-separator"><td colspan="10"><div class="kit-items-divider"></div></td></tr>`;
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
        ? `<span class="install-active">🟩 ${fmt(pricing.instalacionPrice)}</span>`
        : '<span class="install-pending">⬛</span>'
      : '<span style="color:var(--muted);">—</span>';

    html += `<tr>
      <td class="item-num">${rowNum}</td>
      <td class="item-desc item-desc-click" onclick="openCartItemDetail(${idx})" title="Ver detalle">
        <span class="item-desc-text">${esc(item.description)}</span>
        <div class="item-badges">${badges}</div>
        <small>${item.sourceId || ''}${item.supplier ? ' · ' + item.supplier : ''}</small>
      </td>
      <td class="center" style="font-size:11px;font-weight:600;color:var(--primary);">${item.unit || '—'}</td>
      <td class="right"><span class="print-hide-col">${fmt(pricing.baseCost)}</span><span class="print-only">${fmt(pricing.priceBeforeIva)}</span></td>
      <td class="center"><input type="number" min="0" step="any" value="${c.qty}" class="qty-input" onchange="updateQty(${idx}, this.value)"></td>
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
    ' ítems</span></div>';

  const supplierKeys = Object.keys(supplierGroups).sort((a, b) =>
    a === 'Sin proveedor' ? 1 : b === 'Sin proveedor' ? -1 : a.localeCompare(b)
  );

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

      items.forEach(({ idx: kitIdx, compIdx, item, cartItem, isKit }) => {
        const effectiveMargin = isSinProveedor ? (cartItem.customMargin ?? margin) : margin;
        const pricing = calcItemPrice(item, { supplierMargin: effectiveMargin });
        const hasGanancia = item.hasGanancia;
        const hasCustom = cartItem.customMargin != null;
        const marginHandler = isKit
          ? `updateKitCompMargin(${kitIdx}, ${compIdx}, this.value)`
          : `updateItemMargin(${kitIdx}, this.value)`;
        supplierHtml += `<div class="supplier-group-item${hasGanancia ? ' sgi-active' : ''}${hasCustom ? ' sgi-custom' : ''}">`;
        supplierHtml += `<span class="sgi-code">${item.sourceId || ''}</span>`;
        supplierHtml += `<span class="sgi-desc">${esc(item.description.slice(0, 35))}${item.description.length > 35 ? '…' : ''}${isKit ? ' <small style="color:var(--muted);">(kit)</small>' : ''}</span>`;
        if (isSinProveedor && hasGanancia) {
          supplierHtml += `<div class="supplier-margin-input sgi-margin-inline"><input type="number" min="0" max="100" step="1" value="${effectiveMargin}" oninput="${marginHandler}"><span>%</span></div>`;
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
    if (c.isKit) {
      c.kitComponents.forEach((comp, compIdx) => {
        const item = CATALOG[comp.catalogIdx];
        if (item && item.hasInstalacion) installItems.push({ idx, compIdx, item, cartItem: comp, isKit: true });
      });
      return;
    }
    const item = CATALOG[c.catalogIdx];
    if (item && item.hasInstalacion) installItems.push({ idx, item, cartItem: c, isKit: false });
  });

  const installCount = installItems.length;
  const activeCount = installItems.filter(i => i.cartItem.installActive).length;

  let installHtml = '<div class="margin-subsection">';
  installHtml += '<div class="margin-subsection-header margin-subsection-instalacion">';
  installHtml += '<h4>🔧 Ganancia por instalación</h4>';
  installHtml += '<div class="install-toggle-group">';
  installHtml += `<span class="margin-subsection-count">${installCount} ítem(s) con flag</span>`;
  installHtml += `<button class="btn btn-sm btn-primary" onclick="openInstallServicePicker()">+ Servicio de instalación</button>`;
  installHtml += '</div>';
  installHtml += '</div>';

  if (installCount === 0) {
    installHtml +=
      '<div class="margin-empty">No hay items con flag de instalación en la cotización. Re-sincroniza el catálogo para actualizar los datos.</div>';
  } else if (!installationEnabled) {
    installHtml += `<div class="margin-empty">Instalación desactivada. <strong>${installCount} ítem(s)</strong> con flag de instalación disponibles.</div>`;
  } else {
    installItems.forEach(({ idx: kitIdx, compIdx, item, cartItem, isKit }) => {
      const pricing = calcItemPrice(item, {
        installMargin: installationMarginPct,
        techCost: cartItem.techCost,
        installActive: cartItem.installActive,
      });

      const toggleHandler = isKit ? `toggleKitCompInstall(${kitIdx}, ${compIdx})` : `toggleInstall(${kitIdx})`;
      const techCostHandler = isKit
        ? `updateKitCompTechCost(${kitIdx}, ${compIdx}, this.value)`
        : `updateTechCost(${kitIdx}, this.value)`;

      installHtml += `<div class="install-config-row${cartItem.installActive ? ' install-active-row' : ''}">`;
      installHtml += `<div class="install-config-info">`;
      installHtml += `<span class="install-toggle ${cartItem.installActive ? 'active' : ''}" onclick="${toggleHandler}">✓</span>`;
      installHtml += `<span class="install-config-name">${esc(item.sourceId || '')} — ${esc(item.description.slice(0, 40))}${item.description.length > 40 ? '…' : ''}${isKit ? ' <small style="color:var(--muted);">(kit)</small>' : ''}</span>`;
      if (cartItem.installActive && cartItem.techCost > 0) {
        installHtml += `<span class="install-cost-badge">Téc: ${fmt(cartItem.techCost)} → ${fmt(pricing.instalacionPrice)}</span>`;
      }
      installHtml += `</div>`;

      if (cartItem.installActive) {
        installHtml += `<div class="install-config-fields">`;
        installHtml += `<div class="install-field"><label>Costo técnico</label><input type="number" min="0" step="0.01" value="${cartItem.techCost}" onchange="${techCostHandler}" placeholder="0.00"></div>`;
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
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;PVP (costo + ganancia)</span><span>${fmt(subtotalEquipo)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub totals-sub-detail"><span>&nbsp;&nbsp;IVA 15%</span><span>${fmt(totalIva)}</span></div>`;
  breakdownHtml += `<div class="totals-row totals-sub"><span>Subtotal (PVP + IVA)</span><span>${fmt(subtotalEquipo + totalIva)}</span></div>`;

  if (totalInstalacion > 0) {
    breakdownHtml += `<div class="totals-row totals-sub totals-install"><span>🔧 Instalación (items)</span><span>${fmt(totalInstalacion)}</span></div>`;
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
  if ($('quoteConditions') && q.conditions) $('quoteConditions').value = q.conditions;
  if ($('quoteNotes') && q.notes) $('quoteNotes').value = q.notes;
  if ($('discountType') && q.discountType) {
    $('discountType').value = q.discountType;
    $('discountValue').value = q.discountValue || 0;
    updateDiscount();
  }
  setSupplierMargins(q.supplierMargins || {});
  setInstallationMarginPct(q.installMargin ?? DEFAULT_INSTALL_MARGIN);
  setInstallationEnabled(q.installationEnabled ?? false);
  setCart(q.items || []);
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

async function saveQuote() {
  const data = buildQuoteData();
  if (!data.client.name || !data.client.ruc || !data.client.phone || !data.client.email) {
    const missing = [];
    if (!data.client.name) missing.push('Cliente');
    if (!data.client.ruc) missing.push('RUC/Cédula');
    if (!data.client.phone) missing.push('Teléfono');
    if (!data.client.email) missing.push('Email');
    toast('Campos obligatorios: ' + missing.join(', '), 'danger');
    return;
  }
  if (cart.length === 0) {
    toast('Agrega al menos un ítem a la cotización', 'danger');
    return;
  }
  if (!data.cotNum) {
    data.cotNum = generateCotNumber();
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
      cot_num: data.cotNum,
      cot_date: data.cotDate || null,
      client: data.client,
      supplier_margins: data.supplierMargins,
      install_margin: data.installMargin,
      items: data.items,
      status: 'borrador',
      updated_at: new Date().toISOString(),
    };

    if (currentQuoteId) {
      const { error } = await supabase
        .from('saved_quotes')
        .update({
          cot_num: row.cot_num,
          cot_date: row.cot_date,
          client: row.client,
          supplier_margins: row.supplier_margins,
          install_margin: row.install_margin,
          items: row.items,
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
              items: row.items,
              updated_at: row.updated_at,
            })
            .eq('id', existing.id);
          if (error) throw error;
          setCurrentQuoteId(existing.id);
          toast('✓ Cotización actualizada', 'success');
          notifyCotizadorVsPdf();
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
  const quotePanel = document.querySelector('.quote-panel');
  if (quotePanel) {
    quotePanel.insertBefore(banner, quotePanel.querySelector('.actions-bar'));
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
  if (q)
    filtered = filtered.filter(
      p =>
        (p.sourceId || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.subcategory || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
    );
  $('viewerCount').textContent =
    filtered.length +
    ' productos' +
    (filtered.length !== viewerProducts.length ? ' (de ' + viewerProducts.length + ')' : '');
  const tbody = $('viewerBody');
  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:20px;">No se encontraron productos</td></tr>';
    return;
  }
  tbody.innerHTML = filtered
    .map(p => {
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
    })
    .join('');
}

let viewerTab = 'products';

function switchViewerTab(tab) {
  viewerTab = tab;
  const btnProducts = $('viewerTabProducts');
  const btnInstall = $('viewerTabInstall');
  const btnEditInstall = $('btnEditInstall');
  const btnGoToEditor = $('btnGoToEditor');
  if (tab === 'products') {
    btnProducts.style.borderColor = 'var(--primary)';
    btnProducts.style.color = 'var(--primary)';
    btnProducts.style.fontWeight = '600';
    btnInstall.style.borderColor = 'var(--border)';
    btnInstall.style.color = 'var(--text)';
    btnInstall.style.fontWeight = '';
    $('viewerCategory').style.display = '';
    $('viewerSubcategory').style.display = '';
    if (btnEditInstall) btnEditInstall.style.display = 'none';
    if (btnGoToEditor) btnGoToEditor.style.display = '';
    renderViewerTable();
  } else {
    btnInstall.style.borderColor = 'var(--primary)';
    btnInstall.style.color = 'var(--primary)';
    btnInstall.style.fontWeight = '600';
    btnProducts.style.borderColor = 'var(--border)';
    btnProducts.style.color = 'var(--text)';
    btnProducts.style.fontWeight = '';
    $('viewerCategory').style.display = 'none';
    $('viewerSubcategory').style.display = 'none';
    if (btnEditInstall) btnEditInstall.style.display = '';
    if (btnGoToEditor) btnGoToEditor.style.display = 'none';
    renderViewerInstallations();
  }
}

function renderViewerInstallations() {
  const q = ($('viewerSearch').value || '').toLowerCase().trim();
  let items = instalacionesCatalog || [];
  if (q)
    items = items.filter(
      s => (s.description || '').toLowerCase().includes(q) || (s.observations || '').toLowerCase().includes(q)
    );
  $('viewerCount').textContent = items.length + ' servicio(s) de instalación';
  const tbody = $('viewerBody');
  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:20px;">No hay servicios de instalación. Sincroniza el catálogo.</td></tr>';
    return;
  }
  tbody.innerHTML = items
    .map(
      s => `<tr>
    <td>${s.sourceId || ''}</td>
    <td>${s.category || ''}</td>
    <td>${esc(s.description)}</td>
    <td class="right">${fmt(s.cost)}</td>
    <td class="center">—</td>
    <td class="center">—</td>
    <td class="right">${fmt(s.cost)}</td>
    <td class="right">$0.00</td>
    <td class="right">${fmt(s.cost)}</td>
  </tr>`
    )
    .join('');
}

window.openCatalogViewer = openCatalogViewer;
window.closeCatalogViewer = closeCatalogViewer;
window.renderViewerTable = renderViewerTable;
window.switchViewerTab = switchViewerTab;

// editor functions imported from modules/editor.js
window.openCatalogEditor = openCatalogEditor;
window.closeCatalogEditor = closeCatalogEditor;
window.renderEditorTable = renderEditorTable;
window.addNewProduct = addNewProduct;
window.saveCatalogEdits = saveCatalogEdits;
window.editorField = editorField;
window.editorToggleDelete = editorToggleDelete;

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
      if (draft.items && draft.items.length > 0) loadQuoteData(draft);
    } catch (_e) {
      /* ignore corrupt draft */
    }
  }
  if (!$('cotNum').value) $('cotNum').value = generateCotNumber();
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
    const rol = currentSession?.rol || localStorage.getItem('usuario_rol') || '';
    const rolLabels = { admin: 'Administrador', vendedor: 'Vendedor', ventas: 'Ventas' };
    cotRole.textContent = rolLabels[rol] || rol || '[Cargo]';
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
  const roleLabel = session.rol === 'admin' ? 'Administrador' : 'Vendedor';
  const roleBadge = $('userChipRole');
  if (roleBadge) roleBadge.textContent = roleLabel;
  const ddName = $('dropdownName');
  if (ddName) ddName.textContent = session.nombre || session.user;
  const ddRole = $('dropdownRole');
  if (ddRole) ddRole.textContent = roleLabel + ' · ' + (session.email || '');
  const btnEditCatalog = $('btnEditCatalog');
  if (btnEditCatalog) btnEditCatalog.style.display = 'block';
  const btnUserManagement = $('btnUserManagement');
  if (btnUserManagement) btnUserManagement.style.display = session.rol === 'admin' ? 'inline-block' : 'none';
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp().catch(e => {
    toast('Error al iniciar: ' + e.message, 'danger');
  });
}
window._enterApp = enterApp;

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
          : '<span class="margin-badge margin-none">Vendedor</span>';
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
        <button class="btn btn-ghost" onclick='openEditUser(${JSON.stringify({ id: u.id, nombre: u.nombre || '', correo: u.correo || '', rol: u.rol || 'vendedor', activo: u.activo !== false }).replace(/'/g, '&#39;')})' style="font-size:11px;padding:4px 10px;">✏️ Editar</button>
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
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          correo: email,
          nombre,
          rol: role,
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
    const { error } = await supabase.from('profiles').update({ nombre, rol: role, activo }).eq('id', userId);
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
    installationEnabled,
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
window.doPrint = doPrint;
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
