// === HISTORY MODULE ===
// Saved quotes, loading, status changes, new quote.

import {
  CATALOG,
  cart,
  currentSession,
  currentQuoteId,
  historyQuotesCache,
  DEFAULT_INSTALL_MARGIN,
  STATUS_LABELS,
  STATUS_ORDER,
} from '../state.js';
import {
  setCurrentQuoteId,
  setCart,
  setSupplierMargins,
  setInstallationMarginPct,
  setDiscountType,
  setDiscountValue,
  setHistoryQuotesCache,
} from '../state.js';
import supabase from '../lib/supabase.js';
import { $, fmt, esc, toast, showConfirm, isAdmin, generateNextCotNumberFromDB } from '../utils.js';
import { calcItemPrice } from './helpers.js';

/**
 * Calculate the total price of a saved quote (items + installation).
 * Handles both regular items and kit items.
 * @param {Object} q - Quote object with items array
 * @returns {number} Sum of all item totals (before IVA + installation)
 */
export function quoteTotal(q) {
  let sum = 0;
  (q.productos || []).forEach(c => {
    if (c.isKit) {
      (c.kitComponents || []).forEach(cc => {
        if (cc.catalogIdx >= 0 && cc.catalogIdx < CATALOG.length) {
          const it = CATALOG[cc.catalogIdx];
          const p = calcItemPrice(it);
          sum += p.priceBeforeIva * (c.qty || 1);
        }
      });
    } else if (c.catalogIdx >= 0 && c.catalogIdx < CATALOG.length) {
      const item = CATALOG[c.catalogIdx];
      const effectiveMargin = c.customMargin ?? (q.supplierMargins || {})[item.supplier || 'Sin proveedor'] ?? 15;
      const pricing = calcItemPrice(item, {
        supplierMargin: effectiveMargin,
        installMargin: q.installMargin ?? 35,
        techCost: c.techCost || 0,
        installActive: c.installActive || false,
      });
      sum += pricing.priceBeforeIva * (c.qty || 1);
      if (c.installActive && pricing.instalacionPrice > 0) {
        sum += pricing.instalacionPrice * (c.qty || 1);
      }
    }
  });
  return sum;
}

/**
 * Open the saved-quotes modal and load quotes from Supabase.
 * @returns {Promise<void>}
 */
export async function openSavedModal() {
  const userId = currentSession?.userId;
  if (!userId) {
    toast('No hay sesión activa', 'danger');
    return;
  }
  $('historyList').innerHTML = '<div class="empty-state">Cargando...</div>';
  $('historyStats').innerHTML = '';
  $('savedModal').classList.add('open');
  try {
    let query = supabase.from('saved_quotes').select('*');
    if (!isAdmin(currentSession)) query = query.eq('user_id', userId);
    const { data: saved, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    setHistoryQuotesCache(saved || []);
    renderHistoryList(historyQuotesCache);
  } catch (e) {
    $('historyList').innerHTML = '<div class="empty-state">Error: ' + e.message + '</div>';
  }
}

/**
 * Render the history list with status counts and quote cards.
 * @param {Array<Object>} quotes - Array of saved quote objects
 * @returns {void}
 */
export function renderHistoryList(quotes) {
  const list = $('historyList');
  const stats = $('historyStats');
  const counts = {};
  quotes.forEach(q => {
    counts[q.status] = (counts[q.status] || 0) + 1;
  });
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
  list.innerHTML = quotes
    .map(q => {
      const client = q.client || {};
      const d = new Date(q.updated_at || q.saved_at);
      const total = quoteTotal(q);
      const status = q.status || 'borrador';
      const vendor = q.vendor_name || '';
      const statusOptions = STATUS_ORDER.map(
        s => `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
      ).join('');
      return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-client">${esc(client.name || '(sin nombre)')}</div>
          <div class="history-item-meta">${esc(q.cot_num || '(sin número)')} · ${q.productos?.length || 0} Productos · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}${vendor ? ' · <span style="color:var(--primary);font-weight:500;">' + esc(vendor) + '</span>' : ''}</div>
        </div>
        <select class="status-select" aria-label="Cambiar estado de cotización" onchange="changeStatus('${q.id}', this.value)">${statusOptions}</select>
        <div class="history-item-actions">
          <button onclick="loadSaved('${q.id}')">Cargar</button>
          <button style="color:var(--danger);border-color:var(--danger);" onclick="deleteSaved('${q.id}')">Eliminar</button>
        </div>
      </div>`;
    })
    .join('');
}

/**
 * Apply client/status/date filters to the cached quotes and re-render.
 * @returns {void}
 */
export function applyHistoryFilters() {
  const clientQ = $('filterClient').value.toLowerCase().trim();
  const vendorQ = $('filterVendor').value.toLowerCase().trim();
  const status = $('filterStatus').value;
  const dateFrom = $('filterDateFrom').value;
  const dateTo = $('filterDateTo').value;
  let filtered = historyQuotesCache.filter(q => {
    const client = q.client || {};
    if (clientQ && !(client.name || '').toLowerCase().includes(clientQ)) return false;
    if (vendorQ && !(q.vendor_name || '').toLowerCase().includes(vendorQ)) return false;
    if (status && q.status !== status) return false;
    if (dateFrom) {
      const d = q.cot_date || (q.updated_at || '').slice(0, 10);
      if (d && d < dateFrom) return false;
    }
    if (dateTo) {
      const d = q.cot_date || (q.updated_at || '').slice(0, 10);
      if (d && d > dateTo) return false;
    }
    return true;
  });
  renderHistoryList(filtered);
}

/**
 * Change the status of a saved quote in Supabase and update the cache.
 * @param {string} id - Quote UUID
 * @param {string} newStatus - New status code
 * @returns {Promise<void>}
 */
export async function changeStatus(id, newStatus) {
  try {
    const { error } = await supabase
      .from('saved_quotes')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    const q = historyQuotesCache.find(q => q.id === id);
    if (q) q.status = newStatus;
    applyHistoryFilters();
    toast('✓ Estado: ' + STATUS_LABELS[newStatus], 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}

/**
 * Close the saved-quotes modal.
 * @returns {void}
 */
export function closeSavedModal() {
  $('savedModal').classList.remove('open');
}

/**
 * Load a saved quote by ID into the cart.
 * @param {string} id - Quote UUID
 * @returns {Promise<void>}
 */
export async function loadSaved(id) {
  try {
    const { data, error } = await supabase.from('saved_quotes').select('*').eq('id', id).single();
    if (error) throw error;
    setCurrentQuoteId(data.id);
    window.loadQuoteData?.({
      cotNum: data.cot_num,
      cotDate: data.cot_date,
      client: data.client,
      supplierMargins: data.supplier_margins,
      installMargin: data.install_margin,
      productos: data.productos,
    });
    closeSavedModal();
    toast('✓ Cotización cargada: ' + data.cot_num);
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}

/**
 * Delete a saved quote from Supabase after confirmation.
 * @param {string} id - Quote UUID
 * @returns {Promise<void>}
 */
export async function deleteSaved(id) {
  if (!(await showConfirm('¿Eliminar esta cotización del historial?', 'Eliminar cotización', 'Eliminar'))) return;
  try {
    const { data, error } = await supabase.from('saved_quotes').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      console.warn('[HISTORY] Supabase delete returned 0 rows for id=', id);
    }
    if (currentQuoteId === id) setCurrentQuoteId(null);
    setHistoryQuotesCache(historyQuotesCache.filter(q => q.id !== id));
    applyHistoryFilters();
    toast('✓ Cotización eliminada', 'success');
  } catch (e) {
    console.error('[HISTORY] Error deleting quote:', e);
    toast('Error al eliminar: ' + e.message, 'danger');
  }
}

/**
 * Start a new blank quote (clears cart, resets margins/discounts).
 * @returns {Promise<void>}
 */
export async function newQuote() {
  if (cart.length > 0 && !(await showConfirm('¿Limpiar todo y empezar nueva cotización?', 'Nueva cotización', 'Crear')))
    return;
  setCart([]);
  setCurrentQuoteId(null);
  setSupplierMargins({});
  setInstallationMarginPct(DEFAULT_INSTALL_MARGIN);
  setDiscountType('none');
  setDiscountValue(0);
  if ($('discountType')) $('discountType').value = 'none';
  if ($('discountValue')) {
    $('discountValue').value = 0;
    $('discountValue').disabled = true;
  }
  if ($('quoteConditions'))
    $('quoteConditions').value =
      'Validez de la oferta: 15 días calendario desde la fecha de emisión.\nForma de pago: 50% anticipo, 50% contra entrega (configurable según monto).\nPlazo de entrega: Por confirmar al momento de la orden.\nGarantía equipos: 12 a 24 meses según fabricante.\nGarantía mano de obra: 90 días.\nIVA: 15% incluido en el total.\nMoneda: Dólares de los Estados Unidos (USD).';
  if ($('quoteNotes')) $('quoteNotes').value = '';
  [
    'cotNum',
    'cotDate',
    'clientName',
    'clientRuc',
    'clientAddress',
    'clientContact',
    'clientPhone',
    'clientEmail',
  ].forEach(id => ($(id).value = ''));
  $('cotNum').value = await generateNextCotNumberFromDB();
  $('cotDate').value = new Date().toISOString().split('T')[0];
  window.renderCatalog?.();
  window.renderCart?.();
  window.saveDraft?.();
}
