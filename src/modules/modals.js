// === MODALS MODULE ===
// Product detail, cart item detail, help, templates, save template.

import {
  CATALOG,
  cart,
  currentSession,
  supplierMargins,
  installationMarginPct,
  DEFAULT_SUPPLIER_MARGIN,
  setSupplierMargins,
  setInstallationMarginPct,
} from '../state.js';
import { $, fmt, esc, toast, showConfirm } from '../utils.js';
import { calcItemPrice, getSupplierMargin, marginBadge, calcInstallServicePrice } from './helpers.js';
import { getAllTemplates, getTemplate, saveTemplate, deleteTemplate } from './quote.js';

let _currentPreviewTemplateId = null;

/**
 * Open the product detail modal for a catalog item.
 * Shows full product info + price breakdown.
 * @param {number} idx - Index in the CATALOG array
 * @returns {void}
 */
export function openProductDetail(idx) {
  const item = CATALOG[idx];
  if (!item) return;
  const price = calcItemPrice(item);
  const nl2br = s => esc(s).replace(/\n/g, '<br>');

  let html = `<div class="detail-grid">
    <div class="detail-row"><span class="label">Código:</span><span class="value" style="font-family:ui-monospace,monospace;">${esc(item.sourceId)}</span></div>`;
  if (item.model)
    html += `<div class="detail-row"><span class="label">Modelo:</span><span class="value">${esc(item.model)}</span></div>`;
  html += `<div class="detail-row" style="grid-column:1/-1;"><span class="label">${item.isService ? 'Servicio:' : 'Producto:'}</span><span class="value" style="font-weight:600;">${esc(item.description)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Categoría:</span><span class="value">${esc(item.category)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Subcategoría:</span><span class="value">${esc(item.subcategory)}</span></div>`;
  if (item.supplier)
    html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value">${esc(item.supplier)}</span></div>`;
  if (item.unit)
    html += `<div class="detail-row"><span class="label">Unidad:</span><span class="value">${esc(item.unit)}</span></div>`;
  if (item.descriptionExtended) {
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">Descripción detallada:</span><div class="detail-obs-text">${nl2br(item.descriptionExtended)}</div></div>`;
  }
  if (item.observations) {
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">Observaciones:</span><div class="detail-obs-text">${nl2br(item.observations)}</div></div>`;
  }
  if (item.lastUpdate)
    html += `<div class="detail-row"><span class="label">Última act.:</span><span class="value">${esc(item.lastUpdate)}</span></div>`;

  html += `<div class="detail-divider"></div>`;
  html += `<div class="detail-row"><span class="label">Costo base:</span><span class="value">${fmt(price.baseCost)}</span></div>`;
  if (price.gananciaProveedor > 0)
    html += `<div class="detail-row"><span class="label">Ganancia proveedor:</span><span class="value">${fmt(price.gananciaProveedor)}</span></div>`;
  html += `<div class="detail-row"><span class="label">IVA (15%):</span><span class="value">${fmt(price.iva)}</span></div>`;
  html += `<div class="detail-row"><span class="label">PVP (con IVA):</span><span class="value" style="font-weight:700;color:var(--primary);font-size:14px;">${fmt(price.subtotalEquipo)}</span></div>`;
  if (price.hasInstalacion)
    html += `<div class="detail-row"><span class="label">Requiere instalación:</span><span class="value">🟩 Sí</span></div>`;
  if (price.hasGanancia)
    html += `<div class="detail-row"><span class="label">Tiene ganancia:</span><span class="value">Sí</span></div>`;
  html += `</div>`;

  $('productDetailBody').innerHTML = html;
  $('productDetailModal').classList.add('open');
}

/**
 * Close the product detail modal.
 * @returns {void}
 */
export function closeProductDetail() {
  $('productDetailModal').classList.remove('open');
}

/**
 * Open the cart item detail modal showing full pricing for a cart item.
 * @param {number} idx - Cart item index
 * @returns {void}
 */
export function openCartItemDetail(idx) {
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
  const nl2br = s => esc(s).replace(/\n/g, '<br>');

  let html = `<div class="detail-grid">
    <div class="detail-row"><span class="label">Código:</span><span class="value" style="font-family:ui-monospace,monospace;">${esc(item.sourceId)}</span></div>`;
  if (item.model)
    html += `<div class="detail-row"><span class="label">Modelo:</span><span class="value">${esc(item.model)}</span></div>`;
  html += `<div class="detail-row" style="grid-column:1/-1;"><span class="label">${item.isService ? 'Servicio:' : 'Producto:'}</span><span class="value" style="font-weight:600;">${esc(item.description)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Categoría:</span><span class="value">${esc(item.category)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Subcategoría:</span><span class="value">${esc(item.subcategory)}</span></div>`;
  if (item.supplier)
    html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value">${esc(item.supplier)}</span></div>`;
  if (!item.supplier)
    html += `<div class="detail-row"><span class="label">Proveedor:</span><span class="value" style="color:#d97706;">Sin proveedor</span></div>`;
  if (item.descriptionExtended) {
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">Descripción detallada:</span><div class="detail-obs-text">${nl2br(item.descriptionExtended)}</div></div>`;
  }
  if (item.observations) {
    html += `<div class="detail-obs" style="grid-column:1/-1;"><span class="label">Observaciones:</span><div class="detail-obs-text">${nl2br(item.observations)}</div></div>`;
  }

  html += `<div class="detail-divider"></div>`;
  html += `<div class="detail-row"><span class="label">Costo Unit.:</span><span class="value">${fmt(pricing.baseCost)}</span></div>`;
  if (item.hasGanancia)
    html += `<div class="detail-row"><span class="label">Margen (${effectiveMargin}%):</span><span class="value">${fmt(pricing.gananciaProveedor)}</span></div>`;
  html += `<div class="detail-row"><span class="label">Cantidad:</span><span class="value">${c.qty}</span></div>`;
  html += `<div class="detail-row"><span class="label">Costo Total:</span><span class="value" style="font-weight:700;">${fmt(pricing.baseCost * c.qty)}</span></div>`;
  if (item.hasGanancia) {
    html += `<div class="detail-row"><span class="label">Ganancia:</span><span class="value">${fmt(pricing.gananciaProveedor * c.qty)}</span></div>`;
  }
  html += `<div class="detail-row"><span class="label">PVP:</span><span class="value" style="font-weight:700;color:var(--primary);">${fmt(pricing.priceBeforeIva * c.qty)}</span></div>`;
  if (item.hasInstalacion) {
    html += `<div class="detail-row"><span class="label">Instalación:</span><span class="value">${c.installActive ? '🟩 Activa' : '⬛ Inactiva'}</span></div>`;
  }
  html += `</div>`;

  $('productDetailBody').innerHTML = html;
  $('productDetailModal').classList.add('open');
}

/**
 * Open the help/user manual modal.
 * @returns {void}
 */
export function openHelpModal() {
  $('helpModal').classList.add('open');
}

/**
 * Close the help modal.
 * @returns {void}
 */
export function closeHelpModal() {
  $('helpModal').classList.remove('open');
}

/**
 * Toggle a collapsible help section.
 * @param {HTMLElement} btn - The section header button
 * @returns {void}
 */
export function toggleHelpSection(btn) {
  const content = btn.nextElementSibling;
  const arrow = btn.querySelector('.help-arrow');
  const isOpen = content.style.display === 'block';
  content.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
}

/**
 * Open the templates modal and render the template list.
 * @returns {void}
 */
export function openTemplatesModal() {
  $('templatesModal').classList.add('open');
  renderTemplateList();
}

/**
 * Close the templates modal.
 * @returns {void}
 */
export function closeTemplatesModal() {
  $('templatesModal').classList.remove('open');
}

/**
 * Re-render the template list with current filter values.
 * @returns {void}
 */
export function filterTemplates() {
  renderTemplateList();
}

/**
 * Render the template list from Supabase with search/type/industry filters.
 * @returns {Promise<void>}
 */
export async function renderTemplateList() {
  const search = ($('tplSearch')?.value || '').toLowerCase();
  const type = $('tplType')?.value || '';
  const industry = $('tplIndustry')?.value || '';
  let templates = await getAllTemplates();
  if (search)
    templates = templates.filter(
      t => t.name.toLowerCase().includes(search) || t.description.toLowerCase().includes(search)
    );
  if (type) templates = templates.filter(t => t.clientType === type);
  if (industry) templates = templates.filter(t => t.industry === industry);

  const list = $('templateList');
  if (!list) return;
  if (!templates.length) {
    list.innerHTML = '<div class="tpl-empty">No se encontraron plantillas con los filtros seleccionados.</div>';
    return;
  }

  const typeLabels = { pequeña: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
  const industryLabels = {
    banco: 'Banco',
    comercio: 'Comercio',
    oficina: 'Oficina',
    industrial: 'Industrial',
    salud: 'Salud',
  };

  list.innerHTML = templates
    .map(t => {
      const isSample = t.isSample;
      const canDelete = true;
      const creatorInfo = t.createdByName
        ? `<span class="tpl-badge tpl-badge-productos" style="background:#f3f4f6;color:#374151;"> por ${esc(t.createdByName)}</span>`
        : '';
      const resolvedCount = (t.productos || []).filter(ti => CATALOG.some(c => c.sourceId === ti.sourceId)).length;
      const countLabel = `${resolvedCount} productos`;
      return `
    <div class="tpl-card" onclick="openTemplatePreview('${t.id}')">
      <div class="tpl-card-header">
        <div class="tpl-card-title">${esc(t.name)}</div>
        <div class="tpl-card-actions" onclick="event.stopPropagation()">
          <button onclick="openTemplatePreview('${t.id}')" title="Vista previa">👁️</button>
          <button onclick="loadTemplateDirect('${t.id}')" title="Cargar plantilla">📥</button>
          <button onclick="downloadTemplate('${t.id}')" title="Descargar copia">🖨️</button>
          ${canDelete ? `<button onclick="deleteTemplateConfirm('${t.id}')" title="Eliminar" style="color:var(--danger)">🗑️</button>` : ''}
        </div>
      </div>
      <div class="tpl-card-desc">${esc(t.description)}</div>
      <div class="tpl-card-meta">
        <span class="tpl-badge tpl-badge-type">${typeLabels[t.clientType] || t.clientType}</span>
        <span class="tpl-badge tpl-badge-industry">${industryLabels[t.industry] || t.industry}</span>
        <span class="tpl-badge tpl-badge-productos">${countLabel}</span>
        ${isSample ? '<span class="tpl-badge tpl-badge-productos" style="background:#e0e7ff;color:#3730a3;">Ejemplo</span>' : '<span class="tpl-badge tpl-badge-custom">Personalizada</span>'}
        ${creatorInfo}
      </div>
    </div>`;
    })
    .join('');
}

/**
 * Open the template preview modal for a specific template.
 * @param {string} id - Template UUID
 * @returns {Promise<void>}
 */
export async function openTemplatePreview(id) {
  const tpl = await getTemplate(id);
  if (!tpl) return;
  _currentPreviewTemplateId = id;
  $('tplPreviewTitle').textContent = tpl.name;

  const typeLabels = { pequeña: 'Pequeña', mediana: 'Mediana', grande: 'Grande' };
  const industryLabels = {
    banco: 'Banco',
    comercio: 'Comercio',
    oficina: 'Oficina',
    industrial: 'Industrial',
    salud: 'Salud',
  };

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

  // Separate products from installation services
  const productItems = tpl.productos.filter(item => !item.isInstallService);
  const installItems = tpl.productos.filter(item => item.isInstallService);

  html += `<table class="tpl-preview-table"><thead><tr>
    <th>#</th><th>ID</th><th>Nombre</th><th>Cant.</th><th>Costo U.</th><th>PVP U.</th><th>Subtotal</th>
  </tr></thead><tbody>`;

  let totalEquipos = 0;
  let totalIVA = 0;
  let totalInstCost = 0;
  let totalInstProfit = 0;
  let rowNum = 1;

  productItems.forEach(item => {
    const catItem = CATALOG.find(c => c.sourceId === item.sourceId);
    if (!catItem) return;
    const qty = item.qty || 1;

    const pricing = calcItemPrice(catItem, {
      supplierMargin: getTplSupplierMargin(catItem.supplier),
      installMargin: tplInstallMargin,
      techCost: item.techCost || 0,
      installActive: item.installActive || false,
    });

    totalEquipos += pricing.subtotalEquipo * qty - pricing.iva * qty;
    totalIVA += pricing.iva * qty;
    if (item.installActive && pricing.instalacionPrice > 0) {
      totalInstCost += (item.techCost || 0) * qty;
      totalInstProfit += pricing.gananciaInstalacion * qty;
    }

    html += `<tr>
      <td>${rowNum++}</td>
      <td style="font-family:ui-monospace,monospace;font-size:11px;">${esc(catItem.sourceId)}</td>
      <td>${esc(catItem.description)}</td>
      <td>${qty}</td>
      <td>${fmt(catItem.cost)}</td>
      <td>${fmt(pricing.subtotalEquipo)}</td>
      <td>${fmt(pricing.subtotalEquipo * qty)}</td>
    </tr>`;
  });

  html += `</tbody></table>`;

  // Installation services section
  let totalInstallServicesPvp = 0;
  if (installItems.length > 0) {
    html += `<div class="tpl-preview-install-section">
      <div class="tpl-preview-install-title">🔧 Servicios de Instalación</div>
      <table class="tpl-preview-table"><thead><tr>
        <th>#</th><th>Servicio</th><th>Cant.</th><th>Precio Total</th>
      </tr></thead><tbody>`;
    let instRow = 1;
    installItems.forEach(item => {
      const svcName = item.description || item.sourceId || 'Servicio';
      const svcQty = item.qty || 1;
      const svcMargin = item.customMargin ?? tplInstallMargin;
      const pricing = calcInstallServicePrice(item, svcMargin);
      const svcTotal = pricing.total * svcQty;
      totalInstallServicesPvp += svcTotal;
      html += `<tr>
        <td>${instRow++}</td>
        <td>${esc(svcName)}</td>
        <td>${svcQty}</td>
        <td>${fmt(svcTotal)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  const grandTotal = totalEquipos + totalIVA + totalInstCost + totalInstProfit + totalInstallServicesPvp;
  html += `<div class="tpl-preview-totals">
    <div class="tpl-preview-total-row"><span>Equipos/Materiales:</span><span>${fmt(totalEquipos)}</span></div>
    <div class="tpl-preview-total-row"><span>IVA (15%):</span><span>${fmt(totalIVA)}</span></div>`;
  if (totalInstCost > 0 || totalInstProfit > 0) {
    html += `<div class="tpl-preview-total-row"><span>Costo instalación (técnica):</span><span>${fmt(totalInstCost)}</span></div>`;
    html += `<div class="tpl-preview-total-row"><span>Margen instalación (${tplInstallMargin}%):</span><span>${fmt(totalInstProfit)}</span></div>`;
  }
  if (totalInstallServicesPvp > 0) {
    html += `<div class="tpl-preview-total-row"><span>Servicios de instalación:</span><span>${fmt(totalInstallServicesPvp)}</span></div>`;
  }
  html += `<div class="tpl-preview-total-row tpl-preview-total-final"><span>Total:</span><span>${fmt(grandTotal)}</span></div>
  </div>`;

  $('tplPreviewBody').innerHTML = html;
  $('templatePreviewModal').classList.add('open');
}

/**
 * Close the template preview modal.
 * @returns {void}
 */
export function closeTemplatePreview() {
  $('templatePreviewModal').classList.remove('open');
  _currentPreviewTemplateId = null;
}

/**
 * Load the currently previewed template into the cart.
 * @returns {Promise<void>}
 */
export async function loadTemplateFromPreview() {
  if (!_currentPreviewTemplateId) return;
  await loadTemplateDirect(_currentPreviewTemplateId);
  closeTemplatePreview();
}

/**
 * Load a template by ID into the cart, replacing current items after confirmation.
 * @param {string} id - Template UUID
 * @returns {Promise<void>}
 */
export async function loadTemplateDirect(id) {
  const tpl = await getTemplate(id);
  if (!tpl) return;
  if (
    cart.length > 0 &&
    !(await showConfirm('Esto reemplazará la cotización actual. ¿Continuar?', 'Cargar plantilla', 'Cargar'))
  )
    return;

  // Fill client fields
  $('clientName').value = tpl.client.name || '';
  $('clientRuc').value = tpl.client.ruc || '';
  $('clientAddress').value = tpl.client.address || '';
  $('clientContact').value = tpl.client.contact || '';
  $('clientPhone').value = tpl.client.phone || '';
  $('clientEmail').value = tpl.client.email || '';

  // Resolve template items to cart (skip missing silently)
  cart.length = 0;
  for (const ti of tpl.productos) {
    if (ti.isInstallService) {
      cart.push({
        isInstallService: true,
        id: ti.sourceId || ti.id || 'inst-' + Math.random().toString(36).slice(2, 7),
        description: ti.description || ti.servicio || 'Servicio de Instalación',
        category: ti.category || 'INSTALACIONES',
        subcategory: ti.subcategory || '',
        cost: ti.cost || ti.costo_unitario || 0,
        qty: ti.qty || 1,
        customCost: ti.customCost ?? null,
        customMargin: ti.customMargin ?? null,
      });
      continue;
    }
    const catIdx = CATALOG.findIndex(c => c.sourceId === ti.sourceId);
    if (catIdx >= 0) {
      cart.push({
        catalogIdx: catIdx,
        qty: ti.qty || 1,
        installActive: ti.installActive || false,
        techCost: ti.techCost || 0,
      });
    }
  }

  // Restore margins
  if (tpl.supplierMargins) setSupplierMargins({ ...tpl.supplierMargins });
  if (tpl.installMargin != null) setInstallationMarginPct(tpl.installMargin);

  window.renderCatalog?.();
  window.renderCart?.();
  window.renderMarginConfig?.();
  window.saveDraft?.();
  toast('✅ Plantilla cargada: ' + tpl.name, 'success');
  closeTemplatesModal();
}

/**
 * Download a template as a local copy (placeholder).
 * @param {string} id - Template UUID
 * @returns {void}
 */
export async function downloadTemplate(id) {
  closeTemplatePreview();
  await loadTemplateDirect(id);
  setTimeout(() => {
    window.print();
  }, 350);
}

/**
 * Delete a template after confirmation.
 * @param {string} id - Template UUID
 * @returns {Promise<void>}
 */
export async function deleteTemplateConfirm(id) {
  if (!(await showConfirm('¿Eliminar esta plantilla?', 'Eliminar plantilla', 'Eliminar'))) return;
  try {
    await deleteTemplate(id);
    renderTemplateList();
    toast('Plantilla eliminada');
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}
