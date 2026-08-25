// === SHARED UTILITY FUNCTIONS ===
import supabase from './lib/supabase.js';

/**
 * Get a DOM element by ID.
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} The DOM element
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Format a number as USD currency string.
 * @param {number} n - Number to format
 * @returns {string} Formatted string like "$1,234.56"
 */
export function fmt(n) {
  return '$' + (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} s - Input string
 * @returns {string} Escaped HTML-safe string
 */
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

/**
 * Escape special characters for use in HTML attributes.
 * @param {string} s - Input string
 * @returns {string} Escaped attribute-safe string
 */
export function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Show a toast notification.
 * @param {string} msg - Message to display
 * @param {'success'|'danger'|'warning'} [type='success'] - Toast style
 */
export function toast(msg, type = 'success') {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast toast-' + type + ' show';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2400);
}

let _confirmResolve = null;

/**
 * Show a custom confirm modal and return a Promise resolving to true/false.
 * @param {string} message - Confirmation message
 * @param {string} [title='Confirmar'] - Modal title
 * @param {string} [confirmText='Aceptar'] - Confirm button text
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
export function showConfirm(message, title, confirmText) {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    $('confirmMsg').textContent = message;
    $('confirmTitle').textContent = title || 'Confirmar';
    $('confirmBtn').textContent = confirmText || 'Aceptar';
    $('confirmModal').classList.add('open');
  });
}

/**
 * Resolve the confirm modal with a boolean value.
 * @param {boolean} val - True for confirm, false for cancel
 */
export function resolveConfirm(val) {
  $('confirmModal').classList.remove('open');
  if (_confirmResolve) {
    _confirmResolve(val);
    _confirmResolve = null;
  }
}

let _quoteDuplicateResolve = null;

/**
 * Show the duplicate-quote modal and return a Promise resolving to 'update' | 'create_new' | null.
 * @param {string} cotNum - The duplicate quote number
 * @returns {Promise<'update'|'create_new'|null>}
 */
export function showQuoteDuplicateModal(cotNum) {
  return new Promise(resolve => {
    _quoteDuplicateResolve = resolve;
    $('dupQuoteMsg').textContent = 'Ya existe "' + cotNum + '". ¿Qué deseas hacer?';
    $('duplicateQuoteModal').classList.add('open');
  });
}

/**
 * Resolve the duplicate-quote modal.
 * @param {'update'|'create_new'|null} val
 */
export function resolveQuoteDuplicate(val) {
  $('duplicateQuoteModal').classList.remove('open');
  if (_quoteDuplicateResolve) {
    _quoteDuplicateResolve(val);
    _quoteDuplicateResolve = null;
  }
}
window.resolveQuoteDuplicate = resolveQuoteDuplicate;

let _saveTemplateResolve = null;

/**
 * Show the save-template modal and return a Promise with template metadata.
 * @returns {Promise<{name:string, description:string, clientType:string, industry:string}>} Template info or null
 */
export function showSaveTemplateModal(prefix) {
  return new Promise(resolve => {
    _saveTemplateResolve = resolve;
    $('tplSaveName').value = prefix || '';
    $('tplSaveDesc').value = '';
    $('tplSaveType').value = 'mediana';
    $('tplSaveIndustry').value = 'comercio';
    $('tplSaveIndustryCustom').style.display = 'none';
    $('tplSaveIndustryCustom').value = '';
    $('tplSaveName').classList.remove('input-field-error');
    $('tplSaveDesc').classList.remove('input-field-error');
    $('saveTemplateModal').classList.add('open');
  });
}

/**
 * Resolve the save-template modal.
 * @param {Object|null} val - Template metadata or null to cancel
 */
export function toggleTplIndustryCustom() {
  const sel = $('tplSaveIndustry');
  const custom = $('tplSaveIndustryCustom');
  if (sel && custom) {
    custom.style.display = sel.value === '__other__' ? 'block' : 'none';
    if (sel.value === '__other__') custom.focus();
  }
}

/**
 * Resolve the save-template modal.
 * @param {Object|null} val - Template metadata or null to cancel
 */
function highlightMissingField(input) {
  if (!input) return;
  input.classList.add('input-field-error');
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus();
  const clearErr = () => {
    input.classList.remove('input-field-error');
    input.removeEventListener('input', clearErr);
  };
  input.addEventListener('input', clearErr);
}

export function resolveSaveTemplate(val) {
  if (val === true) {
    const fields = [
      { id: 'tplSaveName', msg: 'Escribe un nombre para la plantilla' },
      { id: 'tplSaveDesc', msg: 'Escribe una descripción para la plantilla' },
    ];
    for (const f of fields) {
      const el = $(f.id);
      const v = el ? el.value.trim() : '';
      if (!v) {
        highlightMissingField(el, f.msg);
        toast(f.msg, 'warning');
        return;
      }
    }
  }

  $('saveTemplateModal').classList.remove('open');
  if (_saveTemplateResolve) {
    if (val === true) {
      let industryVal = $('tplSaveIndustry')?.value || 'comercio';
      if (industryVal === '__other__') {
        const customInput = $('tplSaveIndustryCustom');
        industryVal = customInput ? customInput.value.trim() || 'Otro' : 'Otro';
      }
      _saveTemplateResolve({
        name: $('tplSaveName').value.trim(),
        desc: $('tplSaveDesc').value.trim(),
        type: $('tplSaveType').value,
        industry: industryVal,
      });
    } else {
      _saveTemplateResolve(null);
    }
    _saveTemplateResolve = null;
  }
}

/**
 * Check if the current user has admin role.
 * @param {Object} session - User session object
 * @returns {boolean} True if the user is an admin
 */
export function isAdmin(session) {
  return session?.rol === 'admin';
}

/**
 * Generate a sequential quote number: COT-YYYYMMDD-NNNN.
 * @param {number} [seq] - Optional global sequence number from DB. If omitted, falls back to localStorage counter.
 * @returns {string} New quote number
 */
export function generateCotNumber(seq) {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  if (seq) {
    return 'COT-' + dateStr + '-' + String(seq).padStart(4, '0');
  }
  const key = 'cot_counter_' + dateStr;
  let count = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, count);
  return 'COT-' + dateStr + '-' + String(count).padStart(4, '0');
}

/**
 * Generate next quote number using global DB sequence (atomic, no collisions).
 * Falls back to localStorage if DB is unavailable.
 * @returns {Promise<string>} New quote number
 */
export async function generateNextCotNumberFromDB() {
  try {
    const { data, error } = await supabase.rpc('next_quote_seq');
    if (error) throw error;
    return generateCotNumber(data);
  } catch (e) {
    console.warn('[COT_NUM] RPC failed, fallback local:', e.message);
    return generateCotNumber();
  }
}
