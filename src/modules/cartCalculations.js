// === CART CALCULATIONS MODULE ===
// Pure logic extracted from app.js for testability.
// No DOM dependencies, no state imports — all dependencies are parameters.

/**
 * Calculate item-level totals (PVP, IVA, installation) for all cart items.
 * Handles regular items, kit components, and installation services.
 * @param {Array<Object>} cart - Cart items array
 * @param {Array<Object>} catalog - Full product catalog
 * @param {Function} calcItemPriceFn - Pricing function (calcItemPrice)
 * @param {Function} getSupplierMarginFn - Margin lookup function
 * @param {number} installationMarginPct - Global installation margin %
 * @param {Function} calcInstallServicePriceFn - Install service pricing function
 * @returns {{subtotalEquipo: number, totalIva: number, totalInstalacion: number, totalInstalacionesCat: number}}
 */
export function calcItemTotals(
  cart,
  catalog,
  calcItemPriceFn,
  getSupplierMarginFn,
  installationMarginPct,
  calcInstallServicePriceFn
) {
  let subtotalEquipo = 0;
  let totalIva = 0;
  let totalInstalacion = 0;
  let totalInstalacionesCat = 0;

  cart.forEach(c => {
    if (c.isInstallService) {
      if (calcInstallServicePriceFn) {
        const margin = c.customMargin ?? installationMarginPct;
        const pricing = calcInstallServicePriceFn(c, margin);
        totalInstalacionesCat += pricing.total * (c.qty || 1);
      }
      return;
    }
    if (c.isKit) {
      (c.kitComponents || []).forEach(cc => {
        const it = catalog[cc.catalogIdx];
        if (!it) return;
        const compQty = (cc.qty ?? 1) * c.qty;
        const compTechCost = cc.techCost ?? 0;
        const compInstallActive = cc.installActive ?? false;
        const compPricing = calcItemPriceFn(it, {
          supplierMargin: cc.customMargin ?? getSupplierMarginFn(it.supplier),
          installMargin: installationMarginPct,
          techCost: compTechCost,
          installActive: compInstallActive,
        });
        subtotalEquipo += compPricing.priceBeforeIva * compQty;
        totalIva += compPricing.iva * compQty;
        totalInstalacion += compPricing.instalacionPrice;
      });
      return;
    }
    const item = catalog[c.catalogIdx];
    if (!item) return;
    const effectiveMargin = c.customMargin ?? getSupplierMarginFn(item.supplier);
    const pricing = calcItemPriceFn(item, {
      supplierMargin: effectiveMargin,
      installMargin: installationMarginPct,
      techCost: c.techCost,
      installActive: c.installActive,
    });
    subtotalEquipo += pricing.priceBeforeIva * c.qty;
    totalIva += pricing.iva * c.qty;
    totalInstalacion += pricing.instalacionPrice;
  });

  return { subtotalEquipo, totalIva, totalInstalacion, totalInstalacionesCat };
}

/**
 * Calculate discount amount based on type and value.
 * @param {number} totalGeneral - Total before discount
 * @param {'none'|'percent'|'fixed'} discountType - Discount type
 * @param {number} discountValue - Discount value (% or fixed)
 * @returns {number} Discount amount (capped at totalGeneral for fixed)
 */
export function calcDiscount(totalGeneral, discountType, discountValue) {
  if (discountType === 'percent' && discountValue > 0) {
    const cappedPct = Math.min(100, Math.max(0, discountValue));
    return Math.round(totalGeneral * (cappedPct / 100) * 100) / 100;
  }
  if (discountType === 'fixed' && discountValue > 0) {
    const cappedFixed = Math.max(0, discountValue);
    return Math.min(cappedFixed, Math.max(0, totalGeneral));
  }
  return 0;
}

/**
 * Calculate the subtotal (PVP + IVA + installation) for all cart items.
 * Used for discount preview.
 * @param {Array<Object>} cart - Cart items array
 * @param {Array<Object>} catalog - Full product catalog
 * @param {Function} calcItemPriceFn - Pricing function
 * @param {Function} getSupplierMarginFn - Margin lookup function
 * @param {number} installationMarginPct - Global installation margin %
 * @param {Function} calcInstallServicePriceFn - Install service pricing function
 * @returns {number} Subtotal amount
 */
export function calcSubtotal(
  cart,
  catalog,
  calcItemPriceFn,
  getSupplierMarginFn,
  installationMarginPct,
  calcInstallServicePriceFn
) {
  let subtotal = 0;
  cart.forEach(c => {
    if (c.isInstallService) {
      if (calcInstallServicePriceFn) {
        const margin = c.customMargin ?? installationMarginPct;
        const pricing = calcInstallServicePriceFn(c, margin);
        subtotal += pricing.total * (c.qty || 1);
      }
      return;
    }
    if (c.isKit) {
      (c.kitComponents || []).forEach(cc => {
        const it = catalog[cc.catalogIdx];
        if (!it) return;
        const compQty = (cc.qty ?? 1) * c.qty;
        const compTechCost = cc.techCost ?? 0;
        const compInstallActive = cc.installActive ?? false;
        const compPricing = calcItemPriceFn(it, {
          supplierMargin: cc.customMargin ?? getSupplierMarginFn(it.supplier),
          installMargin: installationMarginPct,
          techCost: compTechCost,
          installActive: compInstallActive,
        });
        subtotal += compPricing.priceBeforeIva * compQty + compPricing.iva * compQty + compPricing.instalacionPrice;
      });
      return;
    }
    const item = catalog[c.catalogIdx];
    if (!item) return;
    const effectiveMargin = c.customMargin ?? getSupplierMarginFn(item.supplier);
    const pricing = calcItemPriceFn(item, { supplierMargin: effectiveMargin });
    subtotal += pricing.priceBeforeIva * c.qty + pricing.iva * c.qty + pricing.instalacionPrice * c.qty;
  });
  return subtotal;
}
