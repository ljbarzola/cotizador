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
    const statusOptions = STATUS_ORDER.map(s =>
      `<option value="${s}" ${s === status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
    ).join('');
    return `
      <div class="history-item">
        <div class="history-item-info">
          <div class="history-item-client">${client.name || '(sin nombre)'}</div>
          <div class="history-item-meta">${q.cot_num || '(sin número)'} · ${q.items?.length || 0} ítems · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', {hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <select class="status-select" onchange="changeStatus('${q.id}', this.value)">${statusOptions}</select>
        <div class="history-item-actions">
          <button onclick="loadSaved('${q.id}')">Cargar</button>
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

async function changeStatus(id, newStatus) {
  const label = STATUS_LABELS[newStatus];
  try {
    const { error } = await supabase.from('saved_quotes').update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw error;

    const q = historyQuotesCache.find(q => q.id === id);
    if (q) q.status = newStatus;

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

function handleSyncClick() {
  openCatalogViewer();
}

// === CATALOG VIEWER (read-only, all users) ===
function openCatalogViewer() {
  $('catalogViewerModal').classList.add('open');
  loadViewerProducts();
  if (isAdmin()) {
    $('btnGoToEditor').style.display = 'inline-flex';
  } else {
    $('btnGoToEditor').style.display = 'none';
  }
}

function closeCatalogViewer() {
  $('catalogViewerModal').classList.remove('open');
}

let viewerProducts = [];

async function loadViewerProducts() {
  $('viewerBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">Cargando...</td></tr>';
  try {
    const { data, error } = await supabase.from('products').select('*').order('category');
    if (error) throw error;
    viewerProducts = data || [];

    const cats = [...new Set(viewerProducts.map(p => p.category))].sort();
    const sel = $('viewerCategory');
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c.length > 50 ? c.slice(0, 50) + '…' : c;
      sel.appendChild(opt);
    });

    renderViewerTable();
  } catch (e) {
    $('viewerBody').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:red;">Error: ' + e.message + '</td></tr>';
  }
}

function renderViewerTable() {
  const q = $('viewerSearch').value.toLowerCase().trim();
  const cat = $('viewerCategory').value;

  let filtered = viewerProducts;
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (q) filtered = filtered.filter(p =>
    (p.code || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q)
  );

  $('viewerCount').textContent = filtered.length + ' productos' + (filtered.length !== viewerProducts.length ? ' (de ' + viewerProducts.length + ')' : '');

  const tbody = $('viewerBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;">No se encontraron productos</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const code = p.code || '(sin código)';
    const fr = freshness(p.days_old);
    const dateLabel = p.last_update || 's/f';
    return `
      <tr>
        <td>${code}</td>
        <td>${p.category || ''}</td>
        <td>${p.description || ''}</td>
        <td class="right">${fmt(p.cost || 0)}</td>
        <td class="right">${fmt(p.pvp35 || 0)}</td>
        <td class="right">${fmt(p.pvp15 || 0)}</td>
        <td>${dateLabel}</td>
        <td style="text-align:center;"><span class="freshness ${fr}"></span>${p.days_old ?? '—'}</td>
        <td>${p.supplier || ''}</td>
      </tr>
    `;
  }).join('');
}

window.openCatalogViewer = openCatalogViewer;
window.closeCatalogViewer = closeCatalogViewer;
window.renderViewerTable = renderViewerTable;

// === RESET CATÁLOGO ===
function resetCatalog() {
  if (!confirm('¿Restaurar el catálogo desde la base de datos?')) return;
  localStorage.removeItem('custom_catalog');
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

  // Populate dropdown
  const roleLabel = session.rol === 'admin' ? 'Administrador' : 'Vendedor';
  const roleBadge = $('userChipRole');
  if (roleBadge) roleBadge.textContent = roleLabel;
  const ddName = $('dropdownName');
  if (ddName) ddName.textContent = session.nombre || session.user;
  const ddRole = $('dropdownRole');
  if (ddRole) ddRole.textContent = roleLabel + ' · ' + (session.email || '');
  const btnEditCatalog = $('btnEditCatalog');
  if (btnEditCatalog) btnEditCatalog.style.display = session.rol === 'admin' ? 'block' : 'none';

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

  $('search').addEventListener('input', renderCatalog);
  $('categoryFilter').addEventListener('change', renderCatalog);
  $('viewerSearch').addEventListener('input', renderViewerTable);
  $('viewerCategory').addEventListener('change', renderViewerTable);
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
}

// El encabezado del PDF es fijo (logo GEMESEG + teléfono), no requiere lógica.
function applyEmpresaHeader() {}

// === CATALOG EDITOR (admin only) ===
let editorProducts = [];
let editorChanges = {}; // { idx: { field: newValue } }
let editorDeleted = new Set();

function openCatalogEditor() {
  if (!isAdmin()) { toast('Acceso solo para administradores', 'danger'); return; }
  $('catalogEditorModal').classList.add('open');
  loadEditorProducts();
}

function closeCatalogEditor() {
  if (Object.keys(editorChanges).size > 0 || editorDeleted.size > 0) {
    if (!confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return;
  }
  $('catalogEditorModal').classList.remove('open');
  editorProducts = [];
  editorChanges = {};
  editorDeleted = new Set();
}

async function loadEditorProducts() {
  $('editorBody').innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">Cargando...</td></tr>';
  try {
    const { data, error } = await supabase.from('products').select('*').order('category');
    if (error) throw error;
    editorProducts = data || [];
    editorChanges = {};
    editorDeleted = new Set();

    // Populate category filter
    const cats = [...new Set(editorProducts.map(p => p.category))].sort();
    const sel = $('editorCategory');
    sel.innerHTML = '<option value="">Todas las categorías</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c.length > 50 ? c.slice(0, 50) + '…' : c;
      sel.appendChild(opt);
    });

    renderEditorTable();
  } catch (e) {
    $('editorBody').innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;color:red;">Error: ' + e.message + '</td></tr>';
  }
}

function renderEditorTable() {
  const q = $('editorSearch').value.toLowerCase().trim();
  const cat = $('editorCategory').value;

  let filtered = editorProducts.map((p, idx) => ({ ...p, _idx: idx }));
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (q) filtered = filtered.filter(p =>
    (p.code || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q)
  );

  $('editorCount').textContent = filtered.length + ' productos' + (filtered.length !== editorProducts.length ? ' (de ' + editorProducts.length + ')' : '');

  const tbody = $('editorBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">No se encontraron productos</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const idx = p._idx;
    const ch = editorChanges[idx] || {};
    const isDel = editorDeleted.has(idx);
    const rowClass = isDel ? 'row-deleted' : (Object.keys(ch).length > 0 ? 'row-modified' : '');
    const g = (field) => ch[field] !== undefined ? ch[field] : (p[field] ?? '');
    return `
      <tr class="${rowClass}" data-idx="${idx}">
        <td><input value="${escAttr(g('code'))}" onchange="editorField(${idx},'code',this.value)"></td>
        <td><input value="${escAttr(g('category'))}" onchange="editorField(${idx},'category',this.value)"></td>
        <td><input value="${escAttr(g('description'))}" onchange="editorField(${idx},'description',this.value)"></td>
        <td><input type="number" step="0.01" value="${g('cost')}" onchange="editorField(${idx},'cost',parseFloat(this.value)||0)"></td>
        <td><input type="number" step="0.01" value="${g('pvp35')}" onchange="editorField(${idx},'pvp35',parseFloat(this.value)||0)"></td>
        <td><input type="number" step="0.01" value="${g('pvp15')}" onchange="editorField(${idx},'pvp15',parseFloat(this.value)||0)"></td>
        <td><input type="date" value="${g('last_update') || ''}" onchange="editorField(${idx},'last_update',this.value||null)"></td>
        <td><input type="number" value="${g('days_old') ?? ''}" onchange="editorField(${idx},'days_old',this.value?parseInt(this.value):null)"></td>
        <td><input value="${escAttr(g('supplier'))}" onchange="editorField(${idx},'supplier',this.value)"></td>
        <td style="text-align:center;"><input type="checkbox" ${g('is_service') ? 'checked' : ''} onchange="editorField(${idx},'is_service',this.checked)"></td>
        <td><button class="del-btn" onclick="editorToggleDelete(${idx})" title="${isDel ? 'Restaurar' : 'Eliminar'}">${isDel ? '↩' : '✕'}</button></td>
      </tr>
    `;
  }).join('');
}

function escAttr(s) { return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

window.editorField = function(idx, field, value) {
  if (!editorChanges[idx]) editorChanges[idx] = {};
  editorChanges[idx][field] = value;
  const row = document.querySelector(`tr[data-idx="${idx}"]`);
  if (row && !editorDeleted.has(idx)) row.classList.add('row-modified');
};

window.editorToggleDelete = function(idx) {
  if (editorDeleted.has(idx)) {
    editorDeleted.delete(idx);
  } else {
    const p = editorProducts[idx];
    const label = (p.code || p.description || 'este producto').slice(0, 60);
    if (!confirm('¿Eliminar "' + label + '"?\n\nSe marcará para eliminación. Los cambios se aplican al guardar.')) return;
    editorDeleted.add(idx);
  }
  renderEditorTable();
};

window.addNewProduct = function() {
  const newIdx = editorProducts.length;
  editorProducts.push({
    id: null,
    code: '',
    category: $('editorCategory').value || '',
    description: '',
    cost: 0,
    pvp35: 0,
    pvp15: 0,
    last_update: null,
    days_old: null,
    supplier: '',
    is_service: false,
    unit: '',
  });
  editorChanges[newIdx] = { code: '', category: $('editorCategory').value || '', description: '', cost: 0, pvp35: 0, pvp15: 0 };
  renderEditorTable();
  // Scroll to bottom
  const container = $('editorTable').parentElement;
  container.scrollTop = container.scrollHeight;
};

window.saveCatalogEdits = async function() {
  if (!isAdmin()) { toast('Solo admin puede guardar', 'danger'); return; }

  const btn = document.querySelector('#catalogEditorModal .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    // 1. Delete marked rows
    for (const idx of editorDeleted) {
      const p = editorProducts[idx];
      if (p.id) {
        const { error } = await supabase.from('products').delete().eq('id', p.id);
        if (error) throw error;
      }
    }

    // 2. Update existing rows with changes
    const updates = [];
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr);
      const p = editorProducts[idx];
      if (editorDeleted.has(idx)) continue;
      if (p.id) {
        updates.push({ id: p.id, ...changes });
      }
    }

    // Batch updates
    for (const u of updates) {
      const { id, ...fields } = u;
      const { error } = await supabase.from('products').update(fields).eq('id', id);
      if (error) throw error;
    }

    // 3. Insert new rows (no id)
    const inserts = [];
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr);
      const p = editorProducts[idx];
      if (editorDeleted.has(idx)) continue;
      if (!p.id) {
        inserts.push({
          code: (changes.code ?? p.code) || null,
          category: changes.category ?? p.category,
          description: changes.description ?? p.description,
          cost: (changes.cost ?? p.cost) || 0,
          pvp35: (changes.pvp35 ?? p.pvp35) || 0,
          pvp15: (changes.pvp15 ?? p.pvp15) || 0,
          last_update: (changes.last_update ?? p.last_update) || null,
          days_old: changes.days_old ?? p.days_old ?? null,
          supplier: (changes.supplier ?? p.supplier) || '',
          is_service: (changes.is_service ?? p.is_service) || false,
          unit: p.unit || '',
        });
      }
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from('products').insert(inserts);
      if (error) throw error;
    }

    toast(`✓ Guardado: ${updates.length} editados, ${inserts.length} nuevos, ${editorDeleted.size} eliminados`, 'success');
    await loadEditorProducts(); // Reload
  } catch (e) {
    toast('Error al guardar: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar cambios';
  }
};

window.openCatalogEditor = openCatalogEditor;
window.closeCatalogEditor = closeCatalogEditor;
window.renderEditorTable = renderEditorTable;

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
window.resetCatalog = resetCatalog;
window.addToCart = addToCart;
window.updateQty = updateQty;
window.removeItem = removeItem;
window.loadSaved = loadSaved;
window.deleteSaved = deleteSaved;
window.changeStatus = changeStatus;
window.applyHistoryFilters = applyHistoryFilters;
