import { doLogin, validateSession, logout } from './modules/auth.js';
import supabase from './lib/supabase.js';

// === CATÁLOGO === (cargado desde Supabase, con fallback en localStorage)
const CATALOG = [];

async function loadCatalogFromDB() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category');
    if (error) throw error;
    if (data && data.length > 0) {
      CATALOG.length = 0;
      data.forEach(row => {
        CATALOG.push({
          code: row.code || '',
          category: row.category,
          description: row.description,
          cost: row.cost || 0,
          pvp35: row.pvp35 || 0,
          pvp15: row.pvp15 || 0,
          lastUpdate: row.last_update || null,
          daysOld: row.days_old,
          supplier: row.supplier || '',
          isService: row.is_service || false,
          unit: row.unit || '',
        });
      });
      return true;
    }
  } catch (e) {
    console.warn('No se pudo cargar catálogo desde DB:', e.message);
  }
  return false;
}


// === ESTADO ===
let currentMargin = 35;
let cart = [];
let currentSession = null;
let currentQuoteId = null;
let historyQuotesCache = []; // cache para filtros locales

const STATUS_LABELS = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  vista: 'Vista',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

function getStatusLabel(s) { return STATUS_LABELS[s] || s; }
function statusBadge(s) { return `<span class="status-badge status-${s}">${getStatusLabel(s)}</span>`; }

function quoteTotal(q) {
  const items = q.items || [];
  return items.reduce((s, c) => {
    const item = CATALOG[c.catalogIdx];
    if (!item) return s;
    return s + (q.margin === 35 ? item.pvp35 : item.pvp15) * c.qty;
  }, 0) * 1.15;
}

function isAdmin() { return currentSession?.rol === 'admin'; }

// ====== CONFIGURACIÓN GEMESEG ======
// Autenticación manejada por Supabase (ver src/modules/auth.js)

// === UTILIDADES ===
const $ = id => document.getElementById(id);
const fmt = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function freshness(daysOld) {
  if (daysOld === null || daysOld === undefined) return 'stale';
  if (daysOld <= 30) return 'fresh';
  if (daysOld <= 180) return 'aging';
  return 'stale';
}

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2400);
}

function generateCotNumber() {
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const key = 'cot_seq_' + ymd;
  let seq = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(seq));
  return 'COT-' + ymd + '-' + String(seq).padStart(3,'0');
}

function getPrice(item) {
  return currentMargin === 35 ? item.pvp35 : item.pvp15;
}

// === RENDER CATÁLOGO ===
function renderCatalog() {
  const q = $('search').value.toLowerCase().trim();
  const cat = $('categoryFilter').value;
  const list = $('catalogList');
  const filtered = CATALOG.filter(item => {
    if (cat && item.category !== cat) return false;
    if (!q) return true;
    return (item.code || '').toLowerCase().includes(q) ||
           item.description.toLowerCase().includes(q);
  });
  $('catalogCount').textContent = filtered.length + ' ítems' + (filtered.length !== CATALOG.length ? ' (de ' + CATALOG.length + ')' : '');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>No se encontraron productos</div>';
    return;
  }
  list.innerHTML = filtered.slice(0, 200).map((item, idx) => {
    const realIdx = CATALOG.indexOf(item);
    const fr = freshness(item.daysOld);
    const dateLabel = item.lastUpdate || 's/f';
    const supplier = item.supplier ? '· ' + item.supplier : '';
    const code = item.code || '(sin código)';
    return `
      <div class="cat-item">
        <div class="cat-item-info">
          <div class="cat-item-code">${code}</div>
          <div class="cat-item-desc">${item.description}</div>
          <div class="cat-item-meta"><span><span class="freshness ${fr}"></span>${dateLabel}</span><span>${supplier}</span><span style="opacity:0.6">${item.category.split('(')[0].trim()}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="cat-item-price">
            <div class="pvp">${fmt(getPrice(item))}</div>
            <div class="cost">costo ${fmt(item.cost)}</div>
          </div>
          <button class="add-btn" onclick="addToCart(${realIdx})">+ Agregar</button>
        </div>
      </div>
    `;
  }).join('');
  if (filtered.length > 200) {
    list.innerHTML += '<div class="empty-state" style="padding:14px;font-size:11px;">Mostrando 200 de ' + filtered.length + ' resultados. Refina la búsqueda.</div>';
  }
}

function renderCategories() {
  const cats = [...new Set(CATALOG.map(i => i.category))].sort();
  const sel = $('categoryFilter');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.length > 60 ? c.slice(0, 60) + '…' : c;
    sel.appendChild(opt);
  });
}

// === CART ===
function addToCart(idx) {
  const item = CATALOG[idx];
  const existing = cart.find(c => c.catalogIdx === idx);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ catalogIdx: idx, qty: 1, unit: item.unit || 'u' });
  }
  renderCart();
  saveDraft();
  toast('✓ ' + item.description.slice(0,40) + (item.description.length > 40 ? '…' : '') + ' agregado', 'success');
}

function updateQty(idx, qty) {
  const q = parseFloat(qty) || 0;
  if (q <= 0) { removeItem(idx); return; }
  cart[idx].qty = q;
  renderCart();
  saveDraft();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  renderCart();
  saveDraft();
}

function renderCart() {
  const c = $('itemsContainer');
  $('itemsCount').textContent = cart.length + ' ítem' + (cart.length === 1 ? '' : 's');
  if (cart.length === 0) {
    c.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><div>Aún no hay productos en la cotización.</div><div style="margin-top:4px;font-size:11px;">Busca y agrega productos del catálogo (panel izquierdo)</div></div>';
    renderTotals();
    return;
  }
  c.innerHTML = `
    <table class="items-table">
      <thead>
        <tr>
          <th class="item-num">#</th>
          <th>Descripción</th>
          <th class="center" style="width:60px;">Unidad</th>
          <th class="center" style="width:70px;">Cant</th>
          <th class="right" style="width:90px;">Valor unit.</th>
          <th class="right" style="width:100px;">Total</th>
          <th style="width:40px;"></th>
        </tr>
      </thead>
      <tbody>
        ${cart.map((c, idx) => {
          const item = CATALOG[c.catalogIdx];
          const price = getPrice(item);
          const total = price * c.qty;
          return `
            <tr>
              <td class="item-num">${idx+1}</td>
              <td class="item-desc">
                ${item.description}
                ${item.code ? '<small>' + item.code + (item.supplier ? ' · ' + item.supplier : '') + '</small>' : ''}
              </td>
              <td class="center">${c.unit || 'u'}</td>
              <td class="center"><input type="number" min="0" step="any" value="${c.qty}" class="qty-input" onchange="updateQty(${idx}, this.value)"></td>
              <td class="right">${fmt(price)}</td>
              <td class="right"><strong>${fmt(total)}</strong></td>
              <td><button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar">✕</button></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  renderTotals();
}

function renderTotals() {
  const subtotal = cart.reduce((s, c) => {
    const item = CATALOG[c.catalogIdx];
    return s + getPrice(item) * c.qty;
  }, 0);
  const iva = subtotal * 0.15;
  const total = subtotal + iva;
  $('subtotalView').textContent = fmt(subtotal);
  $('ivaView').textContent = fmt(iva);
  $('totalView').textContent = fmt(total);
}

function setModality(m) {
  currentMargin = m;
  renderCatalog();
  renderCart();
  saveDraft();
}

// === IMPRIMIR: actualizar print-only ===
function syncPrintView() {
  $('printCotNum').textContent = $('cotNum').value || '—';
  $('printCotDate').textContent = $('cotDate').value || '—';
  $('printClientName').textContent = $('clientName').value || '—';
  $('printClientRuc').textContent = $('clientRuc').value || '—';
  $('printClientAddress').textContent = $('clientAddress').value || '—';
  $('printClientContact').textContent = $('clientContact').value || '—';
  $('printClientPhone').textContent = $('clientPhone').value || '—';
  $('printClientEmail').textContent = $('clientEmail').value || '—';
}
window.addEventListener('beforeprint', syncPrintView);

// === GUARDAR / CARGAR ===
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
    margin: currentMargin,
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
  currentMargin = q.margin || 35;
  document.querySelector('input[name="modality"][value="' + currentMargin + '"]').checked = true;
  cart = q.items || [];
  renderCatalog();
  renderCart();
}

function saveDraft() {
  localStorage.setItem('quote_draft', JSON.stringify(buildQuoteData()));
}

function loadDraft() {
  const raw = localStorage.getItem('quote_draft');
  if (!raw) { toast('No hay borrador guardado', 'danger'); return; }
  try {
    currentQuoteId = null;
    loadQuoteData(JSON.parse(raw));
    toast('Borrador cargado');
  } catch(e) { toast('Error al cargar borrador', 'danger'); }
}

async function saveQuote() {
  const data = buildQuoteData();
  if (!data.client.name || cart.length === 0) {
    toast('Llena el cliente y agrega al menos un ítem', 'danger');
    return;
  }
  if (!data.cotNum) {
    data.cotNum = generateCotNumber();
    $('cotNum').value = data.cotNum;
  }

  const userId = currentSession?.userId;
  if (!userId) { toast('Error: no hay sesión activa', 'danger'); return; }

  try {
    const row = {
      user_id: userId,
      cot_num: data.cotNum,
      cot_date: data.cotDate || null,
      client: data.client,
      margin: data.margin,
      items: data.items,
      status: 'borrador',
      updated_at: new Date().toISOString(),
    };

    if (currentQuoteId) {
      row.id = currentQuoteId;
      const { error } = await supabase.from('saved_quotes').update({
        cot_num: row.cot_num, cot_date: row.cot_date, client: row.client,
        margin: row.margin, items: row.items, updated_at: row.updated_at,
      }).eq('id', currentQuoteId);
      if (error) throw error;
      toast('✓ Cotización actualizada: ' + data.cotNum, 'success');
    } else {
      const { data: existing } = await supabase
        .from('saved_quotes')
        .select('id')
        .eq('user_id', userId)
        .eq('cot_num', data.cotNum)
        .maybeSingle();

      if (existing) {
        const action = confirm(
          'Ya existe una cotización "' + data.cotNum + '".\n\n' +
          '¿Deseas ACTUALIZAR la existente o CREAR una nueva?'
        );
        if (action) {
          const { error } = await supabase.from('saved_quotes').update({
            cot_num: row.cot_num, cot_date: row.cot_date, client: row.client,
            margin: row.margin, items: row.items, updated_at: row.updated_at,
          }).eq('id', existing.id);
          if (error) throw error;
          currentQuoteId = existing.id;
          toast('✓ Cotización actualizada: ' + data.cotNum, 'success');
        } else {
          data.cotNum = generateCotNumber();
          $('cotNum').value = data.cotNum;
          row.cot_num = data.cotNum;
          const { error } = await supabase.from('saved_quotes').insert(row);
          if (error) throw error;
          toast('✓ Cotización nueva guardada: ' + data.cotNum, 'success');
        }
      } else {
        const { error } = await supabase.from('saved_quotes').insert(row);
        if (error) throw error;
        toast('✓ Cotización guardada: ' + data.cotNum, 'success');
      }
    }
  } catch (e) {
    console.error('Error guardando cotización:', e);
    toast('Error al guardar: ' + e.message, 'danger');
  }
}

async function openSavedModal() {
  const userId = currentSession?.userId;
  if (!userId) { toast('No hay sesión activa', 'danger'); return; }

  $('historyList').innerHTML = '<div class="empty-state">Cargando...</div>';
  $('historyStats').innerHTML = '';
  $('savedModal').classList.add('open');

  try {
    let query = supabase.from('saved_quotes').select('*');

    // Admin ve todo, vendedor solo lo suyo
    if (!isAdmin()) {
      query = query.eq('user_id', userId);
    }

    const { data: saved, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;

    historyQuotesCache = saved || [];
    renderHistoryList(historyQuotesCache);
  } catch (e) {
    $('historyList').innerHTML = '<div class="empty-state">Error al cargar: ' + e.message + '</div>';
  }
}

function renderHistoryList(quotes) {
  const list = $('historyList');
  const stats = $('historyStats');

  // Stats por estado
  const counts = {};
  quotes.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
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

  list.innerHTML = quotes.map(q => {
    const client = q.client || {};
    const d = new Date(q.updated_at || q.saved_at);
    const total = quoteTotal(q);
    const status = q.status || 'borrador';
    return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-client">${client.name || '(sin nombre)'}</div>
          <div class="history-item-meta">${q.cot_num || '(sin número)'} · ${q.items?.length || 0} ítems · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', {hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        ${statusBadge(status)}
        <div class="history-item-actions">
          <button onclick="loadSaved('${q.id}')">Cargar</button>
          <button class="btn-status" onclick="cycleStatus('${q.id}', '${status}')">Cambiar estado</button>
          <button style="color:var(--danger);border-color:var(--danger);" onclick="deleteSaved('${q.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function applyHistoryFilters() {
  const clientQ = $('filterClient').value.toLowerCase().trim();
  const vendorQ = $('filterVendor').value.toLowerCase().trim();
  const dateFrom = $('filterDateFrom').value;
  const dateTo = $('filterDateTo').value;
  const status = $('filterStatus').value;

  let filtered = historyQuotesCache.filter(q => {
    const client = q.client || {};
    if (clientQ && !(client.name || '').toLowerCase().includes(clientQ)) return false;
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

const STATUS_ORDER = ['borrador', 'enviada', 'vista', 'aceptada', 'rechazada', 'vencida'];

async function cycleStatus(id, current) {
  const idx = STATUS_ORDER.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_ORDER.length;
  const next = STATUS_ORDER[nextIdx];
  const label = STATUS_LABELS[next];

  // Confirmar cambio
  const ok = confirm('Cambiar estado a "' + label + '"?');
  if (!ok) return;

  try {
    const { error } = await supabase.from('saved_quotes').update({
      status: next,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;

    // Actualizar cache
    const q = historyQuotesCache.find(q => q.id === id);
    if (q) q.status = next;

    applyHistoryFilters();
    toast('✓ Estado cambiado a: ' + label, 'success');
  } catch (e) {
    toast('Error al cambiar estado: ' + e.message, 'danger');
  }
}

function closeSavedModal() {
  $('savedModal').classList.remove('open');
}

async function loadSaved(id) {
  try {
    const { data, error } = await supabase
      .from('saved_quotes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    currentQuoteId = data.id;
    loadQuoteData({
      cotNum: data.cot_num,
      cotDate: data.cot_date,
      client: data.client,
      margin: data.margin,
      items: data.items,
    });
    closeSavedModal();
    toast('✓ Cotización cargada: ' + data.cot_num);
  } catch (e) {
    toast('Error al cargar: ' + e.message, 'danger');
  }
}

async function deleteSaved(id) {
  if (!confirm('¿Eliminar esta cotización?')) return;
  try {
    const { error } = await supabase.from('saved_quotes').delete().eq('id', id);
    if (error) throw error;
    if (currentQuoteId === id) currentQuoteId = null;
    historyQuotesCache = historyQuotesCache.filter(q => q.id !== id);
    applyHistoryFilters();
    toast('Cotización eliminada');
  } catch (e) {
    toast('Error al eliminar: ' + e.message, 'danger');
  }
}

function newQuote() {
  if (cart.length > 0 && !confirm('¿Limpiar todo y empezar nueva cotización? El borrador actual se perderá.')) return;
  cart = [];
  currentQuoteId = null;
  ['cotNum','cotDate','clientName','clientRuc','clientAddress','clientContact','clientPhone','clientEmail'].forEach(id => $(id).value = '');
  $('cotNum').value = generateCotNumber();
  $('cotDate').value = new Date().toISOString().split('T')[0];
  currentMargin = 35;
  document.querySelector('input[name="modality"][value="35"]').checked = true;
  renderCatalog();
  renderCart();
  saveDraft();
}

function exportJSON() {
  const data = buildQuoteData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.cotNum || 'cotizacion') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// === CONFIG ===
const CONFIG_KEY = 'drive_config';
function getConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
  catch(e) { return {}; }
}
function setConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }

// === DRIVE MODAL ===
function openDriveModal() {
  const c = getConfig();
  $('driveUrlInput').value = c.driveUrl || '';
  $('driveResult').innerHTML = '';
  $('driveModal').classList.add('open');
}
function closeDriveModal() { $('driveModal').classList.remove('open'); }

async function testAndSaveUrl() {
  const url = $('driveUrlInput').value.trim();
  if (!url) { $('driveResult').innerHTML = errBox('Pega una URL antes de probar'); return; }
  if (!url.includes('docs.google.com')) { $('driveResult').innerHTML = errBox('La URL debe ser de Google Sheets (docs.google.com)'); return; }

  $('driveResult').innerHTML = '<div style="padding:12px;background:#f3f4f6;border-radius:6px;font-size:13px;">⏳ Probando conexión y procesando archivo…</div>';

  try {
    const text = await fetchCsv(url);
    const items = parseCatalogFromCSV(text);
    if (items.length === 0) throw new Error('No se detectaron productos válidos. Verifica que la hoja publicada tenga el formato esperado (Modelo, Producto/Servicio, Costo Unitario, Precio/Und).');
    // Guardar URL para sync automática futura
    const cfg = getConfig();
    cfg.driveUrl = url;
    setConfig(cfg);
    await applyNewCatalog(items, 'Google Drive');
  } catch(e) {
    $('driveResult').innerHTML = errBox(e.message + '<br><br>Si dice "Failed to fetch", probablemente abriste el cotizador como archivo local. La sincronización automática requiere hospedar la app online (ver instrucciones arriba). Mientras tanto, usa la pestaña "Cargar archivo".');
  }
}

function errBox(msg) {
  return `<div style="padding:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;font-size:13px;color:#991b1b;"><strong>Error:</strong> ${msg}</div>`;
}

// === TABS DE SINCRONIZACIÓN ===
function switchSyncTab(tab) {
  $('driveResult').innerHTML = '';
  if (tab === 'manual') {
    $('tabManual').classList.add('active');
    $('tabAuto').classList.remove('active');
    $('syncManual').style.display = 'block';
    $('syncAuto').style.display = 'none';
  } else {
    $('tabAuto').classList.add('active');
    $('tabManual').classList.remove('active');
    $('syncAuto').style.display = 'block';
    $('syncManual').style.display = 'none';
  }
}

// === CARGA MANUAL DE CSV (funciona desde archivo local) ===
function importLocalCsv() {
  const f = $('csvFileInput').files[0];
  if (!f) { $('driveResult').innerHTML = errBox('Selecciona un archivo CSV primero'); return; }
  $('driveResult').innerHTML = '<div style="padding:12px;background:#f3f4f6;border-radius:6px;font-size:13px;">⏳ Procesando archivo…</div>';
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const items = parseCatalogFromCSV(e.target.result);
      if (items.length === 0) throw new Error('No se detectaron productos válidos. Verifica que el CSV sea de la hoja de precios (con columnas Modelo, Producto/Servicio, Costo Unitario, Precio/Und).');
      await applyNewCatalog(items, 'archivo cargado');
    } catch(err) {
      $('driveResult').innerHTML = errBox(err.message);
    }
  };
  reader.onerror = () => { $('driveResult').innerHTML = errBox('No se pudo leer el archivo'); };
  reader.readAsText(f, 'utf-8');
}

// === APLICAR NUEVO CATÁLOGO (común para manual y automático) ===
async function applyNewCatalog(items, fuente) {
  const cats = [...new Set(items.map(i => i.category))];
  const services = items.filter(i => i.isService).length;
  CATALOG.length = 0;
  items.forEach(i => CATALOG.push(i));
  localStorage.setItem('custom_catalog', JSON.stringify(items));
  const cfg = getConfig();
  cfg.lastSync = new Date().toISOString();
  setConfig(cfg);

  // Guardar en Supabase
  try {
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const rows = items.map(i => ({
      code: i.code || null,
      category: i.category,
      description: i.description,
      cost: i.cost || 0,
      pvp35: i.pvp35 || 0,
      pvp15: i.pvp15 || 0,
      last_update: i.lastUpdate || null,
      days_old: i.daysOld ?? null,
      supplier: i.supplier || '',
      is_service: i.isService || false,
      unit: i.unit || '',
    }));
    const { error } = await supabase.from('products').insert(rows);
    if (error) console.warn('Error guardando catálogo en DB:', error.message);
  } catch (e) {
    console.warn('Error guardando catálogo en DB:', e.message);
  }

  $('categoryFilter').innerHTML = '<option value="">Todas las categorías</option>';
  renderCategories();
  renderCatalog();
  updateSyncStatus();
  $('driveResult').innerHTML = `
    <div style="padding:12px;background:#dcfce7;border:1px solid #86efac;border-radius:6px;font-size:13px;">
      <strong style="color:#166534;">✓ Catálogo actualizado desde ${fuente}</strong><br>
      <div style="margin-top:6px;">Productos: <strong>${items.length - services}</strong> · Servicios: <strong>${services}</strong> · Categorías: <strong>${cats.length}</strong></div>
    </div>`;
  toast('✓ Catálogo actualizado: ' + items.length + ' ítems', 'success');
  setTimeout(() => closeDriveModal(), 2200);
}

// === FETCH CSV (con respaldo automático para Google Sheets) ===
async function fetchCsv(url) {
  const bust = u => u + (u.includes('?') ? '&' : '?') + '_t=' + Date.now();
  try {
    const resp = await fetch(bust(url));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    if (!text || text.trim().length < 5) throw new Error('Respuesta vacía');
    return text;
  } catch(e) {
    // Respaldo: si era gviz, intentar el endpoint export
    if (url.includes('/gviz/tq')) {
      const exportUrl = url.replace(/\/gviz\/tq\?tqx=out:csv/, '/export?format=csv');
      const resp2 = await fetch(bust(exportUrl));
      if (!resp2.ok) throw new Error('No se pudo descargar el archivo (HTTP ' + resp2.status + '). Verifica que la hoja esté compartida como "cualquiera con el enlace".');
      return await resp2.text();
    }
    throw e;
  }
}

// === PARSER CSV ===
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i+1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* ignore */ }
      else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// === PARSER INTELIGENTE DEL CATÁLOGO ===
// Maneja el formato real de "COSTOS y PROFORMAS": columna "Modelo" (código),
// "Precio/Und" (PVP sin IVA), múltiples tablas, filas vacías intercaladas, notas.
function parseCatalogFromCSV(text) {
  const rows = parseCSV(text);
  const items = [];
  const today = new Date('2026-05-20');
  let currentCategory = 'Sin categoría';
  let colMap = null;
  const normalize = s => (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const COL_NAMES = ['modelo','producto / servicio','producto','servicio','unds','costo unitario','costo','margen ganancia 35%','precio/und','precio','iva','total a pagar','total','ultima act','proveedor'];

  for (const row of rows) {
    const nonEmpty = row.filter(c => (c || '').trim()).length;
    if (nonEmpty === 0) continue;
    const normRow = row.map(normalize);

    // 1. ¿Header de tabla? (acepta "Modelo" o "Código")
    const hasCode = normRow.some(c => c.includes('codigo') || c.includes('modelo'));
    const hasDesc = normRow.some(c => c.includes('producto') || c.includes('descrip') || c.includes('servicio'));
    const hasCost = normRow.some(c => c.includes('costo'));
    if (hasCode && hasDesc && hasCost) {
      colMap = {
        code: normRow.findIndex(c => c.includes('codigo') || c.includes('modelo')),
        desc: normRow.findIndex(c => c.includes('producto') || c.includes('descrip') || c.includes('servicio')),
        cost: normRow.findIndex(c => c.includes('costo')),
        // PVP sin IVA = "Precio/Und" (NO "margen", NO "total")
        pvp: normRow.findIndex(c => c.includes('precio') && !c.includes('total')),
        date: normRow.findIndex(c => c.includes('actualiz') || c.includes('ultima') || c.includes('ult act') || c.includes('fecha')),
        supplier: normRow.findIndex(c => c.includes('proveedor')),
      };
      if (colMap.pvp === -1) colMap.pvp = normRow.findIndex(c => c.includes('pvp') || c.includes('venta'));
      continue;
    }

    // 2. ¿Fila de datos? (tiene número válido en columna costo + descripción)
    if (colMap) {
      const costVal = parseFloat((row[colMap.cost] || '').replace(/[^\d.-]/g, ''));
      const descVal = (row[colMap.desc] || '').trim();
      if (!isNaN(costVal) && costVal > 0 && descVal.length >= 4) {
        let pvp35 = colMap.pvp !== -1 ? parseFloat((row[colMap.pvp] || '').replace(/[^\d.-]/g, '')) : NaN;
        if (isNaN(pvp35) || pvp35 <= 0) pvp35 = +(costVal * 1.35).toFixed(2);
        const dateRaw = colMap.date !== -1 ? (row[colMap.date] || '').trim() : '';
        let lastUpdate = null, daysOld = null;
        const dm = dateRaw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/) || dateRaw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (dm) {
          let y, m, d;
          if (/^\d{4}/.test(dm[0])) { y = +dm[1]; m = +dm[2]; d = +dm[3]; }
          else { d = +dm[1]; m = +dm[2]; y = +dm[3]; if (y < 100) y += 2000; }
          lastUpdate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          daysOld = Math.floor((today - new Date(y, m-1, d)) / 86400000);
        }
        const code = colMap.code !== -1 ? (row[colMap.code] || '').trim() : '';
        const supplier = colMap.supplier !== -1 ? (row[colMap.supplier] || '').trim() : '';
        const isService = /servicio|instalacion|instalación|mantenimiento|mano de obra|viatic/i.test(currentCategory);
        items.push({
          code: (code === '(s/c)' || code === '\u2014') ? '' : code,
          category: currentCategory,
          description: descVal,
          cost: costVal,
          pvp35: pvp35,
          pvp15: +(costVal * 1.15).toFixed(2),
          lastUpdate: lastUpdate,
          daysOld: daysOld,
          supplier: supplier === '\u2014' ? '' : supplier,
          isService: isService,
          unit: 'u',
        });
        continue;
      }
    }

    // 3. Header de categoría (cualquier otra fila con texto significativo)
    let catText = '';
    for (const cell of row) {
      const c = (cell || '').trim();
      if (c.length > catText.length && !c.match(/^[\d.,$\s]+$/) && !c.startsWith('@')) {
        const nc = normalize(c);
        if (!COL_NAMES.includes(nc) && !nc.includes('considerar margen')) {
          catText = c;
        }
      }
    }
    if (catText) currentCategory = catText;
  }
  return items;
}

// === SYNC PRINCIPAL ===
// === CLICK EN EL STATUS ===
// Si hay URL configurada y la app está hospedada (no file://), intenta sync directo.
// Si no, abre el modal para cargar manualmente.
function handleSyncClick() {
  const c = getConfig();
  const isLocal = location.protocol === 'file:';
  if (c.driveUrl && !isLocal) {
    syncCatalog(false);
  } else {
    openDriveModal();
  }
}

async function syncCatalog(silent) {
  const c = getConfig();
  if (!c.driveUrl) {
    if (silent) return;
    openDriveModal();
    return;
  }

  const status = $('syncStatus');
  status.classList.add('syncing');
  status.classList.remove('error', 'success');
  $('syncLabel').textContent = 'Actualizando…';

  try {
    const text = await fetchCsv(c.driveUrl);
    const items = parseCatalogFromCSV(text);
    if (items.length === 0) throw new Error('No se detectaron productos en el archivo');

    CATALOG.length = 0;
    items.forEach(i => CATALOG.push(i));
    localStorage.setItem('custom_catalog', JSON.stringify(items));

    c.lastSync = new Date().toISOString();
    setConfig(c);

    // Guardar en Supabase
    try {
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const rows = items.map(i => ({
        code: i.code || null,
        category: i.category,
        description: i.description,
        cost: i.cost || 0,
        pvp35: i.pvp35 || 0,
        pvp15: i.pvp15 || 0,
        last_update: i.lastUpdate || null,
        days_old: i.daysOld ?? null,
        supplier: i.supplier || '',
        is_service: i.isService || false,
        unit: i.unit || '',
      }));
      const { error } = await supabase.from('products').insert(rows);
      if (error) console.warn('Error guardando catálogo en DB:', error.message);
    } catch (e) {
      console.warn('Error guardando catálogo en DB:', e.message);
    }

    // Refrescar UI
    $('categoryFilter').innerHTML = '<option value="">Todas las categorías</option>';
    renderCategories();
    renderCatalog();
    status.classList.remove('syncing');
    status.classList.add('success');
    updateSyncStatus();

    if (!silent) toast('✓ Catálogo actualizado: ' + items.length + ' ítems', 'success');
    setTimeout(() => status.classList.remove('success'), 3000);
  } catch(e) {
    status.classList.remove('syncing');
    status.classList.add('error');
    $('syncLabel').textContent = 'Error en sync';
    if (!silent) toast('Error: ' + e.message, 'danger');
    setTimeout(() => { status.classList.remove('error'); updateSyncStatus(); }, 4000);
  }
}

function updateSyncStatus() {
  const c = getConfig();
  const hasCustom = !!localStorage.getItem('custom_catalog');
  if (!c.lastSync && !hasCustom) {
    $('syncIcon').textContent = '📥';
    $('syncLabel').textContent = 'Actualizar catálogo';
    return;
  }
  if (!c.lastSync) {
    $('syncIcon').textContent = '🔄';
    $('syncLabel').textContent = 'Actualizar catálogo';
    return;
  }
  const last = new Date(c.lastSync);
  const ageMs = Date.now() - last.getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageDays = Math.floor(ageHours / 24);
  let label;
  if (ageHours < 1) {
    label = 'Catálogo actualizado hoy';
    $('syncIcon').textContent = '✓';
  } else if (ageHours < 24) {
    label = `Actualizado hace ${ageHours}h`;
    $('syncIcon').textContent = '✓';
  } else if (ageDays === 1) {
    label = 'Actualizado ayer · click para actualizar';
    $('syncIcon').textContent = '🔄';
  } else {
    label = `Actualizado hace ${ageDays} días · click para actualizar`;
    $('syncIcon').textContent = '🔄';
  }
  $('syncLabel').textContent = label;
}

// === AUTO-SYNC AL ABRIR ===
function shouldAutoSync() {
  const c = getConfig();
  if (!c.driveUrl) return false;
  if (location.protocol === 'file:') return false; // fetch bloqueado en archivos locales
  if (!c.lastSync) return true;
  const ageMs = Date.now() - new Date(c.lastSync).getTime();
  return ageMs > 24 * 3600 * 1000; // 24 horas
}

// === RESET CATÁLOGO ===
function resetCatalog() {
  if (!confirm('¿Restaurar el catálogo original embebido y eliminar la configuración del Drive?')) return;
  localStorage.removeItem('custom_catalog');
  const c = getConfig();
  delete c.lastSync;
  setConfig(c);
  location.reload();
}

// === CARGAR CATÁLOGO PERSONALIZADO AL INICIO ===
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
  } catch(e) {}
  return false;
}

// === AUTENTICACIÓN ===
// Funciones importadas desde src/modules/auth.js (doLogin, validateSession, logout)

function enterApp(session) {
  currentSession = session;
  $('loginOverlay').classList.add('hidden');
  $('userChipName').textContent = session.nombre || session.user;
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp().catch(e => console.error('Boot error:', e));
}

window._enterApp = enterApp;

// === ARRANQUE DE LA APP (tras login) ===
async function bootApp() {
  // Cargar catálogo desde Supabase, fallback a localStorage
  const dbLoaded = await loadCatalogFromDB();
  if (!dbLoaded) {
    loadCustomCatalogIfExists();
  }
  renderCategories();
  updateSyncStatus();

  $('search').addEventListener('input', renderCatalog);
  $('categoryFilter').addEventListener('change', renderCatalog);
  document.querySelectorAll('.quote-panel input, .quote-panel textarea').forEach(el => {
    el.addEventListener('change', saveDraft);
  });
  document.querySelectorAll('#clientName,#clientRuc,#clientAddress,#clientContact,#clientPhone,#clientEmail,#cotNum,#cotDate').forEach(el => {
    el.addEventListener('input', syncPrintView);
  });

  const raw = localStorage.getItem('quote_draft');
  if (raw) {
    try {
      const draft = JSON.parse(raw);
      if (draft.items && draft.items.length > 0) loadQuoteData(draft);
    } catch(e) {}
  }
  if (!$('cotNum').value) $('cotNum').value = generateCotNumber();
  if (!$('cotDate').value) $('cotDate').value = new Date().toISOString().split('T')[0];

  renderCatalog();
  renderCart();
  syncPrintView();
  applyEmpresaHeader();

  // Auto-sync diaria del catálogo (solo si hay URL y no es local)
  if (shouldAutoSync()) {
    setTimeout(() => syncCatalog(true), 1500);
  }
}

// El encabezado del PDF es fijo (logo GEMESEG + teléfono), no requiere lógica.
function applyEmpresaHeader() {}

// === INIT ===
// Inicialización manejada por src/main.js

// Exponer funciones al scope global para onclick en HTML
window.setModality = setModality;
window.handleSyncClick = handleSyncClick;
window.openSavedModal = openSavedModal;
window.closeSavedModal = closeSavedModal;
window.newQuote = newQuote;
window.saveQuote = saveQuote;
window.loadDraft = loadDraft;
window.openDriveModal = openDriveModal;
window.closeDriveModal = closeDriveModal;
window.switchSyncTab = switchSyncTab;
window.importLocalCsv = importLocalCsv;
window.testAndSaveUrl = testAndSaveUrl;
window.resetCatalog = resetCatalog;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.loadSaved = loadSaved;
window.deleteSaved = deleteSaved;
window.cycleStatus = cycleStatus;
window.applyHistoryFilters = applyHistoryFilters;
