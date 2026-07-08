import './styles.css';
import './app.js';

import { doLogin, validateSession, logout } from './modules/auth.js';

window.doLogin = doLogin;
window.logout = logout;

window.addEventListener('DOMContentLoaded', async () => {
  // Logo loading - two different logos
  const LOGO_LOGIN = '/cotizador/content/logo-gemeseg-back-white.png';
  const LOGO_APP = '/cotizador/content/logo-gemeseg-back-blue.png';
  const FALLBACK_LOGIN = 'GE<span class="m">M</span>ESEG';
  const FALLBACK_APP = 'GE<span class="m">M</span>ESEG <span class="brand-sub">Tecnología</span>';

  async function tryLoadLogo(path) {
    try {
      const res = await fetch(path, { method: 'HEAD' });
      if (res.ok) return path;
    } catch {}
    return null;
  }

  const [logoLogin, logoApp] = await Promise.all([
    tryLoadLogo(LOGO_LOGIN),
    tryLoadLogo(LOGO_APP),
  ]);

  const loginLogo = document.getElementById('loginLogo');
  const topbarLogo = document.getElementById('topbarLogo');
  const printLogo = document.getElementById('printLogo');

  if (loginLogo) loginLogo.innerHTML = logoLogin
    ? `<img src="${logoLogin}" alt="GEMESEG" class="logo-img logo-img-login">`
    : FALLBACK_LOGIN;

  const appLogoHtml = logoApp
    ? `<img src="${logoApp}" alt="GEMESEG" class="logo-img logo-img-topbar">`
    : FALLBACK_APP;
  if (topbarLogo) topbarLogo.innerHTML = appLogoHtml;

  if (printLogo) printLogo.innerHTML = logoApp
    ? `<img src="${logoApp}" alt="GEMESEG" class="logo-img logo-img-print">`
    : FALLBACK_LOGIN;

  document.getElementById('loginBtn').addEventListener('click', doLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });

  const toggleBtn = document.getElementById('togglePass');
  const passInput = document.getElementById('loginPass');
  if (toggleBtn && passInput) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = passInput.type === 'password';
      passInput.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Panel divider resize
  const divider = document.getElementById('panelDivider');
  const main = document.querySelector('.main');
  if (divider && main) {
    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      divider.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = main.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const totalWidth = rect.width;
      const pct = Math.min(Math.max((x / totalWidth) * 100, 20), 80);
      main.style.gridTemplateColumns = pct + 'fr 6px ' + (100 - pct) + 'fr';
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      divider.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  // History filter listeners
  ['filterClient', 'filterVendor', 'filterDateFrom', 'filterDateTo', 'filterStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => window.applyHistoryFilters?.());
    if (el) el.addEventListener('change', () => window.applyHistoryFilters?.());
  });

  const session = await validateSession();
  if (session) {
    window._enterApp(session);
  } else {
    document.getElementById('loginUser').focus();
  }
});
