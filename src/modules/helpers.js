// === PRICING HELPERS MODULE ===
// calcItemPrice, getSupplierMargin, marginBadge, quoteTotal

import { supplierMargins, DEFAULT_SUPPLIER_MARGIN, installationMarginPct, CATALOG } from '../state.js';

/**
 * Get the supplier margin percentage for a given supplier.
 * Falls back to DEFAULT_SUPPLIER_MARGIN (15%) if not configured.
 * @param {string} supplier - Supplier name (null/empty → "Sin proveedor")
 * @returns {number} Margin percentage
 */
export function getSupplierMargin(supplier) {
  const key = supplier || 'Sin proveedor';
  return supplierMargins[key] ?? DEFAULT_SUPPLIER_MARGIN;
}

/**
 * Calculate the full price breakdown for a catalog item.
 * Services: cost + IVA only.
 * Equipos/Materiales: cost → supplier margin → IVA → optional installation.
 * @param {Object} item - Catalog item (cost, isService, hasGanancia, hasInstalacion, supplier)
 * @param {Object} [opts={}] - Override options
 * @param {number} [opts.supplierMargin] - Override supplier margin %
 * @param {number} [opts.installMargin] - Override installation margin %
 * @param {number} [opts.techCost=0] - Technician/installation base cost
 * @param {boolean} [opts.installActive=false] - Whether installation is active
 * @returns {Object} Price breakdown with baseCost, gananciaProveedor, priceBeforeIva, iva, subtotalEquipo, techCost, gananciaInstalacion, instalacionPrice, total, hasGanancia, hasInstalacion
 */
export function calcItemPrice(item, opts = {}) {
  const supplierMargin = opts.supplierMargin ?? getSupplierMargin(item.supplier);
  const installMargin = opts.installMargin ?? installationMarginPct;
  const techCost = opts.techCost ?? 0;
  const installActive = opts.installActive ?? false;

  if (item.isService) {
    const price = item.cost;
    const iva = Math.round(price * 0.15 * 100) / 100;
    return {
      baseCost: price,
      gananciaProveedor: 0,
      priceBeforeIva: price,
      iva,
      subtotalEquipo: price + iva,
      techCost: 0,
      gananciaInstalacion: 0,
      instalacionPrice: 0,
      total: price + iva,
      hasGanancia: false,
      hasInstalacion: false,
    };
  }

  const baseCost = item.cost;
  const gananciaProveedor = item.hasGanancia ? Math.round(baseCost * (supplierMargin / 100) * 100) / 100 : 0;
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
    baseCost,
    gananciaProveedor,
    priceBeforeIva,
    iva,
    subtotalEquipo,
    techCost,
    gananciaInstalacion,
    instalacionPrice,
    total: subtotalEquipo + instalacionPrice,
    hasGanancia: item.hasGanancia,
    hasInstalacion: item.hasInstalacion,
  };
}

/**
 * Generate margin badge HTML for a catalog item.
 * Shows supplier margin %, installation flag, or "Sin margen".
 * @param {Object} item - Catalog item
 * @returns {string} HTML string for badge display
 */
export function marginBadge(item) {
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

/**
 * Calculate price for an installation service from the catalog.
 * No IVA, applies margin only.
 * @param {Object} item - Install service item (cost, description)
 * @param {number} marginPct - Margin percentage
 * @returns {{baseCost: number, ganancia: number, total: number, iva: number}}
 */
export function calcInstallServicePrice(item, marginPct) {
  const baseCost = (item.customCost ?? item.cost) || 0;
  const ganancia = Math.round(baseCost * (marginPct / 100) * 100) / 100;
  return { baseCost, ganancia, total: baseCost + ganancia, iva: 0 };
}

/**
 * Calculate the total price of a quote (all items).
 * @param {Object} q - Quote object with items array
 * @returns {number} Sum of all item totals
 */
export function quoteTotal(q) {
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
