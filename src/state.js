// === SHARED APPLICATION STATE ===
// All modules import from here to access shared state.

/** @type {Array<Object>} Full product catalog loaded from Supabase */
export const CATALOG = [];

/** @type {number} Number of catalog items per page */
export let catalogPageSize = 10;

/** @type {number} Current catalog page (1-indexed) */
export let catalogPage = 1;

/**
 * Set the number of catalog items per page.
 * @param {number} v - Page size value
 */
export function setCatalogPageSize(v) {
  catalogPageSize = v;
}

/**
 * Set the current catalog page.
 * @param {number} v - Page number (1-indexed)
 */
export function setCatalogPage(v) {
  catalogPage = v;
}

/**
 * Get the current catalog page size.
 * @returns {number} Current page size
 */
export function getCatalogPageSize() {
  return catalogPageSize;
}

/**
 * Get the current catalog page number.
 * @returns {number} Current page (1-indexed)
 */
export function getCatalogPage() {
  return catalogPage;
}

/** @type {Array<Object>} Shopping cart items */
export let cart = [];

/** @type {Object|null} Current authenticated user session */
export let currentSession = null;

/** @type {string|null} ID of the currently loaded saved quote */
export let currentQuoteId = [];

/** @type {Array<Object>} Cached list of saved quotes */
export let historyQuotesCache = [];

/** @type {Object<string, number>} Per-supplier margin percentages */
export let supplierMargins = {};

/** Default supplier margin percentage (15%) */
export const DEFAULT_SUPPLIER_MARGIN = 15;

/** Default installation margin percentage (35%) */
export const DEFAULT_INSTALL_MARGIN = 35;

/** @type {number} Global installation margin percentage */
export let installationMarginPct = DEFAULT_INSTALL_MARGIN;

/** @type {boolean} Whether installation pricing is active */
export let installationEnabled = false;

/** @type {'none'|'percent'|'fixed'} Discount type */
export let discountType = 'none';

/** @type {number} Discount value (percentage or fixed amount) */
export let discountValue = 0;

/** @type {Array<Object>} Installation services catalog from Supabase */
export let instalacionesCatalog = [];

/** @type {Array<Object>} Shared kits list */
export let kits = [];

/** @type {string} Current kit search filter */
export let _kitSearchTerm = '';

/** Map of quote status codes to display labels */
export const STATUS_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  vista: 'Vista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

/** Ordered list of status codes for dropdown rendering */
export const STATUS_ORDER = ['borrador', 'enviada', 'vista', 'aceptada', 'rechazada', 'vencida'];

/**
 * Set the shopping cart items.
 * @param {Array<Object>} v - Array of cart item objects
 */
export function setCart(v) {
  cart = v;
}

/**
 * Set the current authenticated user session.
 * @param {Object|null} v - Session object with userId, email, rol, etc.
 */
export function setCurrentSession(v) {
  currentSession = v;
}

/**
 * Set the current saved quote ID.
 * @param {string|null} v - UUID of the saved quote
 */
export function setCurrentQuoteId(v) {
  currentQuoteId = v;
}

/**
 * Set the cached history quotes list.
 * @param {Array<Object>} v - Array of saved quote objects
 */
export function setHistoryQuotesCache(v) {
  historyQuotesCache = v;
}

/**
 * Set per-supplier margin percentages.
 * @param {Object<string, number>} v - Map of supplier name to margin %
 */
export function setSupplierMargins(v) {
  supplierMargins = v;
}

/**
 * Set the global installation margin percentage.
 * @param {number} v - Margin percentage (e.g. 35 for 35%)
 */
export function setInstallationMarginPct(v) {
  installationMarginPct = v;
}

/**
 * Enable or disable installation pricing.
 * @param {boolean} v - Whether installation is active
 */
export function setInstallationEnabled(v) {
  installationEnabled = v;
}

/**
 * Set the discount type.
 * @param {'none'|'percent'|'fixed'} v - Discount type
 */
export function setDiscountType(v) {
  discountType = v;
}

/**
 * Set the discount value.
 * @param {number} v - Discount amount or percentage
 */
export function setDiscountValue(v) {
  discountValue = v;
}

/**
 * Set the shared kits list.
 * @param {Array<Object>} v - Array of kit objects
 */
export function setKits(v) {
  kits = v;
}

/**
 * Set the installation services catalog.
 * @param {Array<Object>} v - Array of installation service objects
 */
export function setInstalacionesCatalog(v) {
  instalacionesCatalog = v;
}

/**
 * Set the kit search filter term.
 * @param {string} v - Search term for filtering kits
 */
export function setKitSearchTerm(v) {
  _kitSearchTerm = v;
}
