import './styles.css';
import './app.js';

import { doLogin, validateSession, logout } from './modules/auth.js';

window.doLogin = doLogin;
window.logout = logout;

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('loginPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
  });

  const session = await validateSession();
  if (session) {
    window._enterApp(session);
  } else {
    document.getElementById('loginUser').focus();
  }
});
