// === EDIT ACCESS MODULE ===
// Conceder/revocar acceso de edición sobre TODAS mis cotizaciones (pasadas,
// actuales y futuras) a otro usuario. Distinto de sharing.js (que comparte
// una cotización puntual, solo para ver + duplicar): esto es un permiso
// dinámico a nivel de dueño, evaluado en cada consulta vía quote_edit_grants.

import { currentSession } from '../state.js';
import supabase from '../lib/supabase.js';
import { $, esc, toast } from '../utils.js';

/**
 * Open the "Compartir edición de mis cotizaciones" modal: loads the list of
 * active users to grant access to and the grants already given.
 * @returns {Promise<void>}
 */
export async function openEditAccessModal() {
  $('editAccessCurrentList').innerHTML = '<div class="empty-state">Cargando...</div>';
  $('editAccessModal').classList.add('open');
  await Promise.all([loadEditAccessUserOptions(), loadCurrentEditGrants()]);
}

/**
 * Close the "Compartir edición de mis cotizaciones" modal.
 * @returns {void}
 */
export function closeEditAccessModal() {
  $('editAccessModal').classList.remove('open');
}

/**
 * Populate the user picker with active users other than the current one.
 * @returns {Promise<void>}
 */
async function loadEditAccessUserOptions() {
  const select = $('editAccessUserSelect');
  if (!select) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, correo')
      .eq('activo', true)
      .order('nombre', { ascending: true });
    if (error) throw error;
    const others = (data || []).filter(u => u.id !== currentSession?.userId);
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
 * Render the list of users who currently have edit access to all my quotes,
 * with a revoke button each.
 * @returns {Promise<void>}
 */
async function loadCurrentEditGrants() {
  const list = $('editAccessCurrentList');
  if (!list) return;
  try {
    const { data, error } = await supabase
      .from('quote_edit_grants')
      .select('id, editor_id')
      .eq('owner_id', currentSession.userId);
    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) {
      list.innerHTML = '<div class="empty-state">Aún no le diste acceso de edición a nadie.</div>';
      return;
    }
    const ids = rows.map(r => r.editor_id);
    const { data: users } = await supabase.from('profiles').select('id, nombre, correo').in('id', ids);
    const nameById = {};
    (users || []).forEach(u => (nameById[u.id] = u.nombre || u.correo));
    list.innerHTML = rows
      .map(
        r => `
      <div class="share-current-row">
        <span class="share-current-name">${esc(nameById[r.editor_id] || 'Usuario')}</span>
        <button class="icon-btn" title="Revocar acceso de edición" onclick="revokeEditAccess('${r.id}')">✕</button>
      </div>`
      )
      .join('');
  } catch (e) {
    list.innerHTML = '<div class="empty-state">Error: ' + esc(e.message) + '</div>';
  }
}

/**
 * Grant the user selected in the modal edit access to ALL of my quotes.
 * Upserts on (owner_id, editor_id) so re-granting to the same person is a
 * no-op instead of a duplicate row.
 * @returns {Promise<void>}
 */
export async function grantEditAccess() {
  const editorId = $('editAccessUserSelect')?.value;
  if (!editorId) {
    toast('Elige un usuario para dar acceso', 'danger');
    return;
  }
  try {
    const { error } = await supabase.from('quote_edit_grants').upsert(
      {
        owner_id: currentSession.userId,
        editor_id: editorId,
      },
      { onConflict: 'owner_id,editor_id' }
    );
    if (error) throw error;
    toast('✓ Acceso de edición concedido', 'success');
    await loadCurrentEditGrants();
  } catch (e) {
    toast('Error al dar acceso: ' + e.message, 'danger');
  }
}

/**
 * Revoke a previously granted edit access.
 * @param {string} grantId - UUID of the quote_edit_grants row
 * @returns {Promise<void>}
 */
export async function revokeEditAccess(grantId) {
  try {
    const { error } = await supabase.from('quote_edit_grants').delete().eq('id', grantId);
    if (error) throw error;
    toast('✓ Acceso revocado', 'success');
    await loadCurrentEditGrants();
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  }
}
