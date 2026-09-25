// === SHARING MODULE ===
// Compartir cotizaciones guardadas con usuarios específicos. Compartir
// siempre otorga la misma capacidad: ver la cotización y, si se quiere
// trabajar sobre ella, crear una copia propia editable (duplicateSharedQuote
// en history.js) — la original nunca es editada por el receptor, solo leída.

import { currentSession } from '../state.js';
import supabase from '../lib/supabase.js';
import { $, esc, toast } from '../utils.js';

/** @type {string|null} Quote currently open in the share modal */
let _shareQuoteId = null;

/**
 * Open the "Compartir cotización" modal for a given quote: loads the list
 * of active users to share with and the current shares for this quote.
 * @param {string} quoteId - UUID of the owned quote to share
 * @returns {Promise<void>}
 */
export async function openShareQuoteModal(quoteId) {
  _shareQuoteId = quoteId;
  $('shareCurrentList').innerHTML = '<div class="empty-state">Cargando...</div>';
  $('shareQuoteModal').classList.add('open');
  await Promise.all([loadShareUserOptions(), loadCurrentShares()]);
}

/**
 * Close the "Compartir cotización" modal.
 * @returns {void}
 */
export function closeShareQuoteModal() {
  $('shareQuoteModal').classList.remove('open');
  _shareQuoteId = null;
}

/**
 * Populate the user picker with active users other than the current one.
 * @returns {Promise<void>}
 */
async function loadShareUserOptions() {
  const select = $('shareUserSelect');
  if (!select) return;
  try {
    const [{ data, error }, { data: editGrants }] = await Promise.all([
      supabase.from('profiles').select('id, nombre, correo').eq('activo', true).order('nombre', { ascending: true }),
      supabase.from('quote_edit_grants').select('editor_id').eq('owner_id', currentSession?.userId),
    ]);
    if (error) throw error;
    // Quien ya tiene acceso de edición total a TODAS mis cotizaciones no
    // necesita (ni tiene sentido) que además se le comparta esta puntual
    // para solo ver — ya puede verla y editarla.
    const alreadyFullAccess = new Set((editGrants || []).map(g => g.editor_id));
    const others = (data || []).filter(u => u.id !== currentSession?.userId && !alreadyFullAccess.has(u.id));
    if (others.length === 0) {
      select.innerHTML = '<option value="">No hay otros usuarios activos</option>';
      return;
    }
    const placeholder = '<option value="" selected disabled>Selecciona un usuario...</option>';
    select.innerHTML =
      placeholder + others.map(u => `<option value="${u.id}">${esc(u.nombre || u.correo)}</option>`).join('');
  } catch (e) {
    toast('Error cargando usuarios: ' + e.message, 'danger');
  }
}

/**
 * Render the list of users this quote is currently shared with, with a
 * revoke button each.
 * @returns {Promise<void>}
 */
async function loadCurrentShares() {
  const list = $('shareCurrentList');
  if (!list || !_shareQuoteId) return;
  try {
    const { data, error } = await supabase
      .from('saved_quote_shares')
      .select('id, shared_with')
      .eq('quote_id', _shareQuoteId);
    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) {
      list.innerHTML = '<div class="empty-state">Aún no compartida con nadie.</div>';
      return;
    }
    const ids = rows.map(r => r.shared_with);
    const { data: users } = await supabase.from('profiles').select('id, nombre, correo').in('id', ids);
    const nameById = {};
    (users || []).forEach(u => (nameById[u.id] = u.nombre || u.correo));
    list.innerHTML = rows
      .map(
        r => `
      <div class="share-current-row">
        <span class="share-current-name">${esc(nameById[r.shared_with] || 'Usuario')}</span>
        <button class="icon-btn" title="Revocar acceso" onclick="revokeQuoteShare('${r.id}')">✕</button>
      </div>`
      )
      .join('');
  } catch (e) {
    list.innerHTML = '<div class="empty-state">Error: ' + esc(e.message) + '</div>';
  }
}

/**
 * Share the currently open quote with the user selected in the modal.
 * Upserts on (quote_id, shared_with) so re-sharing with the same person is
 * a no-op instead of a duplicate row.
 * @returns {Promise<void>}
 */
export async function addQuoteShare() {
  const sharedWith = $('shareUserSelect')?.value;
  if (!_shareQuoteId || !sharedWith) {
    toast('Elige un usuario para compartir', 'danger');
    return;
  }
  try {
    const { error } = await supabase.from('saved_quote_shares').upsert(
      {
        quote_id: _shareQuoteId,
        owner_id: currentSession.userId,
        shared_with: sharedWith,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'quote_id,shared_with' }
    );
    if (error) throw error;
    toast('✓ Cotización compartida', 'success');
    await loadCurrentShares();
  } catch (e) {
    toast('Error al compartir: ' + e.message, 'danger');
  }
}

/**
 * Revoke a share, removing the recipient's access to the quote.
 * @param {string} shareId - UUID of the saved_quote_shares row
 * @returns {Promise<void>}
 */
export async function revokeQuoteShare(shareId) {
  try {
    const { error } = await supabase.from('saved_quote_shares').delete().eq('id', shareId);
    if (error) throw error;
    toast('✓ Acceso revocado', 'success');
    await loadCurrentShares();
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}
