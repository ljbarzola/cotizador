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
  setCotNumIsTentative,
  setLoadedQuoteOwnerProfile,
} from '../state.js';
import supabase from '../lib/supabase.js';
import { $, fmt, esc, toast, showConfirm, isAdmin, previewNextCotNumber } from '../utils.js';
import { calcItemPrice } from './helpers.js';
import { resolveTemplateProductos } from './quote.js';

/**
 * Calculate the total price of a saved quote (items + installation).
 * Handles both regular items and kit items.
 * @param {Object} q - Quote object with items array
 * @returns {number} Sum of all item totals (before IVA + installation)
 */
export function quoteTotal(q) {
  if (!q) return 0;
  let subtotalEquipo = 0;
  let totalIva = 0;
  let totalInstalacion = 0;
  let totalInstalacionesCat = 0;

  const installMarginPct = q.installMargin ?? q.margin?.installMargin ?? 35;
  const supplierMarginsMap = q.supplierMargins || q.margin?.supplierMargins || {};

  const items = q.productos || q.items || [];

  items.forEach(c => {
    if (c.isInstallService) {
      const baseCost = c.customCost ?? c.cost ?? c.costo_unitario ?? 0;
      const margin = c.customMargin ?? installMarginPct;
      const subtotal = baseCost + baseCost * (margin / 100);
      const iva = Math.round(subtotal * 0.15 * 100) / 100;
      const totalSvc = (subtotal + iva) * (c.qty || 1);
      totalInstalacionesCat += totalSvc;
      return;
    }

    if (c.isKit) {
      (c.kitComponents || []).forEach(cc => {
        // catalogIdx es una posición del catálogo al momento de guardar; si
        // se borró algún producto anterior desde entonces, esa posición ya
        // no es el mismo producto. Se prioriza sourceId (identificador
        // estable) y solo se usa catalogIdx como respaldo para cotizaciones
        // guardadas antes de que se empezara a guardar sourceId.
        let it = cc.sourceId ? CATALOG.find(p => p.sourceId === cc.sourceId) : null;
        if (!it) it = CATALOG[cc.catalogIdx];
        if (!it) return;
        const compQty = (cc.qty ?? 1) * (c.qty || 1);
        const compTechCost = cc.techCost ?? 0;
        const compInstallActive = cc.installActive ?? false;
        const compMargin = cc.customMargin ?? supplierMarginsMap[it.supplier || 'Sin proveedor'] ?? 15;
        const pricing = calcItemPrice(it, {
          supplierMargin: compMargin,
          installMargin: installMarginPct,
          techCost: compTechCost,
          installActive: compInstallActive,
        });
        subtotalEquipo += pricing.priceBeforeIva * compQty;
        totalIva += pricing.iva * compQty;
        if (compInstallActive && pricing.instalacionPrice > 0) {
          totalInstalacion += pricing.instalacionPrice;
        }
      });
      return;
    }

    let item = c.sourceId ? CATALOG.find(p => p.sourceId === c.sourceId) : null;
    if (!item) item = CATALOG[c.catalogIdx];
    if (!item) return;

    const qty = c.qty || 1;
    const effectiveMargin = c.customMargin ?? supplierMarginsMap[item.supplier || 'Sin proveedor'] ?? 15;
    const pricing = calcItemPrice(item, {
      supplierMargin: effectiveMargin,
      installMargin: installMarginPct,
      techCost: c.techCost || 0,
      installActive: c.installActive || false,
    });

    subtotalEquipo += pricing.priceBeforeIva * qty;
    totalIva += pricing.iva * qty;
    if (c.installActive && pricing.instalacionPrice > 0) {
      totalInstalacion += pricing.instalacionPrice;
    }
  });

  const totalBeforeDiscount = subtotalEquipo + totalIva + totalInstalacion + totalInstalacionesCat;

  let discount = 0;
  if (q.discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, q.discountValue || 0));
    discount = Math.round(totalBeforeDiscount * (pct / 100) * 100) / 100;
  } else if (q.discountType === 'fixed') {
    const fixed = Math.max(0, q.discountValue || 0);
    discount = Math.min(totalBeforeDiscount, fixed);
  }

  return Math.max(0, Math.round((totalBeforeDiscount - discount) * 100) / 100);
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

    let combined = saved || [];
    // Admin ya ve todas las cotizaciones arriba, así que no hace falta
    // traer también las compartidas/editables explícitamente para ellos.
    if (!isAdmin(currentSession)) {
      const [shared, editable] = await Promise.all([fetchSharedWithMe(userId), fetchEditableByMe(userId)]);
      const ownIds = new Set(combined.map(q => q.id));
      combined = combined.concat(shared).concat(editable.filter(q => !ownIds.has(q.id)));
      combined.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
    setHistoryQuotesCache(combined);
    renderHistoryList(historyQuotesCache);
  } catch (e) {
    $('historyList').innerHTML = '<div class="empty-state">Error: ' + e.message + '</div>';
  }
}

/**
 * Fetch quotes shared with the given user, tagged with the owner's display
 * name. Sharing always grants the same capability (view + create a copy),
 * so there is no per-share permission to track here.
 * @param {string} userId - Current user's UUID
 * @returns {Promise<Array<Object>>} Shared quote objects with _sharedBy
 */
async function fetchSharedWithMe(userId) {
  const { data: shares, error } = await supabase
    .from('saved_quote_shares')
    .select('owner_id, saved_quotes(*)')
    .eq('shared_with', userId);
  if (error) throw error;
  const rows = (shares || []).filter(s => s.saved_quotes);
  if (rows.length === 0) return [];
  const ownerIds = [...new Set(rows.map(s => s.owner_id))];
  const { data: owners } = await supabase.from('profiles').select('id, nombre').in('id', ownerIds);
  const nameById = {};
  (owners || []).forEach(o => (nameById[o.id] = o.nombre));
  return rows.map(s => ({
    ...s.saved_quotes,
    _sharedBy: nameById[s.owner_id] || '',
  }));
}

/**
 * Fetch quotes owned by someone else who granted me full edit access,
 * tagged with the owner's display name via _editableOwnedBy. Unlike
 * fetchSharedWithMe, these quotes can be loaded and saved (edited) just
 * like the current user's own quotes — the RLS UPDATE policy on
 * saved_quotes allows it as long as a matching quote_edit_grants row exists.
 * @param {string} userId - Current user's UUID
 * @returns {Promise<Array<Object>>} Editable quote objects with _editableOwnedBy
 */
async function fetchEditableByMe(userId) {
  const { data: grants, error } = await supabase.from('quote_edit_grants').select('owner_id').eq('editor_id', userId);
  if (error) throw error;
  const ownerIds = [...new Set((grants || []).map(g => g.owner_id))];
  if (ownerIds.length === 0) return [];
  const { data: owners } = await supabase.from('profiles').select('id, nombre').in('id', ownerIds);
  const nameById = {};
  (owners || []).forEach(o => (nameById[o.id] = o.nombre));
  const { data: quotes, error: qErr } = await supabase.from('saved_quotes').select('*').in('user_id', ownerIds);
  if (qErr) throw qErr;
  return (quotes || []).map(q => ({
    ...q,
    _editableOwnedBy: nameById[q.user_id] || '',
  }));
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
      const isShared = !!q._sharedBy;
      const isEditGranted = !!q._editableOwnedBy;
      const sharedBadge = isShared
        ? ` <span class="margin-badge history-shared-badge">🔗 Compartida por ${esc(q._sharedBy)}</span>`
        : isEditGranted
          ? ` <span class="margin-badge history-editable-badge">✏️ Editable · de ${esc(q._editableOwnedBy)}</span>`
          : '';
      const statusMarkup = isShared
        ? `<span class="status-select status-readonly">${esc(STATUS_LABELS[status] || status)}</span>`
        : `<select class="status-select" aria-label="Cambiar estado de cotización" onchange="changeStatus('${q.id}', this.value)">${STATUS_ORDER.map(
            s => `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
          ).join('')}</select>`;
      const isOwnQuote = q.user_id === currentSession?.userId;
      // El acceso de edición prestado (isEditGranted) da permiso para editar
      // el contenido, pero no para borrar la cotización de otro ni para
      // compartirla a su vez — eso sigue siendo del dueño (o de un admin,
      // que llega aquí sin isEditGranted porque ya ve todo por la consulta
      // principal en openSavedModal, sin pasar por el merge de "editables").
      const actions = isShared
        ? `<button onclick="duplicateSharedQuote('${q.id}')">Crear copia</button>`
        : `<button onclick="loadSaved('${q.id}')">Cargar</button>
           ${isEditGranted ? `<button onclick="duplicateSharedQuote('${q.id}')">Crear copia</button>` : ''}
           ${isOwnQuote ? `<button onclick="openShareQuoteModal('${q.id}')">🔗 Compartir</button>` : ''}
           ${!isEditGranted ? `<button style="color:var(--danger);border-color:var(--danger);" onclick="deleteSaved('${q.id}')">Eliminar</button>` : ''}`;
      return `
      <div class="history-item history-producto">
        <div class="history-item-info history-producto-info">
          <div class="history-item-client history-producto-client">${esc(client.name || '(sin nombre)')}${sharedBadge}</div>
          <div class="history-item-meta history-producto-meta">${esc(q.cot_num || '(sin número)')} · ${q.productos?.length || 0} Productos · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}${vendor ? ' · <span style="color:var(--primary);font-weight:500;">' + esc(vendor) + '</span>' : ''}</div>
        </div>
        ${statusMarkup}
        <div class="history-item-actions history-producto-actions">
          ${actions}
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
    setCotNumIsTentative(false);
    if (data.user_id && data.user_id !== currentSession?.userId) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('nombre, cargo, telefono')
        .eq('id', data.user_id)
        .maybeSingle();
      setLoadedQuoteOwnerProfile(owner || null);
    } else {
      setLoadedQuoteOwnerProfile(null);
    }
    // catalogIdx guardado es solo una posición en el catálogo de cuando se
    // guardó la cotización; si algún producto anterior fue borrado desde
    // entonces, esa posición ahora apunta a OTRO producto. Se re-resuelve por
    // sourceId (guardado desde este fix en adelante) contra el catálogo
    // actual, igual que ya se hace al cargar una plantilla.
    const { cart: resolvedProductos, unmatched } = resolveTemplateProductos(data.productos || [], CATALOG);
    window.loadQuoteData?.({
      cotNum: data.cot_num,
      cotDate: data.cot_date,
      client: data.client,
      supplierMargins: data.supplier_margins,
      installMargin: data.install_margin,
      productos: resolvedProductos,
    });
    closeSavedModal();
    if (unmatched.length > 0) {
      toast(`⚠️ ${unmatched.length} producto(s) de esta cotización ya no existen en el catálogo`, 'warning');
    }
    toast('✓ Cotización cargada: ' + data.cot_num);
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}

/**
 * Duplicate a quote shared with the current user into a brand-new,
 * independent quote owned by them. The original quote is only read, never
 * updated — the copy gets a fresh cot_num and is loaded into the cart as an
 * unsaved new quote (currentQuoteId cleared), so pressing "Guardar" inserts
 * a new row instead of touching the shared original.
 * @param {string} id - UUID of the shared saved quote to copy
 * @returns {Promise<void>}
 */
export async function duplicateSharedQuote(id) {
  try {
    const { data, error } = await supabase.from('saved_quotes').select('*').eq('id', id).single();
    if (error) throw error;
    setCurrentQuoteId(null);
    setCotNumIsTentative(true);
    setLoadedQuoteOwnerProfile(null);
    const { cart: resolvedProductos, unmatched } = resolveTemplateProductos(data.productos || [], CATALOG);
    const newCotNum = await previewNextCotNumber();
    window.loadQuoteData?.({
      cotNum: newCotNum,
      cotDate: new Date().toISOString().split('T')[0],
      client: data.client,
      supplierMargins: data.supplier_margins,
      installMargin: data.install_margin,
      productos: resolvedProductos,
    });
    closeSavedModal();
    if (unmatched.length > 0) {
      toast(`⚠️ ${unmatched.length} producto(s) de esta cotización ya no existen en el catálogo`, 'warning');
    }
    toast('✓ Copia creada — edítala y guárdala como tuya');
  } catch (e) {
    toast('Error al duplicar: ' + e.message, 'danger');
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
  setLoadedQuoteOwnerProfile(null);
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
  $('cotNum').value = await previewNextCotNumber();
  setCotNumIsTentative(true);
  $('cotDate').value = new Date().toISOString().split('T')[0];
  window.renderCatalog?.();
  window.renderCart?.();
  window.saveDraft?.();
}
