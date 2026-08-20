import supabase from '../lib/supabase.js';

export function showLoginError(msg) {
  const e = document.getElementById('loginError');
  e.textContent = msg;
  e.classList.add('show');
}

export function resetLoginBtn() {
  const btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.textContent = 'Ingresar';
}

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    return null;
  }
  return data;
}

export async function doLogin() {
  const credential = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  document.getElementById('loginError').classList.remove('show');

  if (!credential || !pass) {
    showLoginError('Ingresa usuario y clave');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="login-spinner"></span>Verificando…';

  try {
    const email = credential.includes('@') ? credential : credential + '@gemeseg.com';

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      let msg = error.message || error.error_description || 'Error desconocido';
      if (msg === 'Invalid login credentials') {
        msg = 'Usuario o clave incorrectos. Verifica tus datos.';
      } else if (msg.includes('Database error')) {
        msg = 'Error del servidor. Intenta de nuevo en unos segundos.';
      }
      showLoginError(msg);
      resetLoginBtn();
      return;
    }

    const profile = await fetchUserProfile(data.user.id);

    if (!profile) {
      showLoginError('No se encontro el perfil. Contacta al administrador.');
      resetLoginBtn();
      return;
    }

    if (profile.activo === false) {
      await supabase.auth.signOut();
      showLoginError('Tu acceso fue desactivado. Contacta al administrador.');
      resetLoginBtn();
      return;
    }

    const session = {
      userId: data.user.id,
      user: profile.usuario || credential,
      email: profile.correo || data.user.email,
      nombre: profile.nombre || data.user.email,
      rol: profile.rol || 'ventas',
      cargo: profile.cargo || '',
      telefono: profile.telefono || '+593 99 897 4909',
      activo: profile.activo !== false,
      ts: Date.now(),
    };
    localStorage.setItem('usuario_nombre', session.nombre);
    localStorage.setItem('usuario_rol', session.rol);
    localStorage.setItem('session', JSON.stringify(session));
    window._enterApp?.(session);
    return session;
  } catch (_e) {
    showLoginError('Error de conexion. Verifica tu internet.');
    resetLoginBtn();
    return null;
  }
}

export async function validateSession() {
  const raw = localStorage.getItem('session');
  if (!raw) return false;

  let session;
  try {
    session = JSON.parse(raw);
  } catch (_e) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      localStorage.removeItem('session');
      return false;
    }

    const profile = await fetchUserProfile(data.session.user.id);
    if (profile && profile.activo === false) {
      localStorage.removeItem('session');
      return false;
    }

    if (profile) {
      session.nombre = profile.nombre || session.nombre;
      session.rol = profile.rol || session.rol;
      session.cargo = profile.cargo || session.cargo || '';
      localStorage.setItem('usuario_nombre', session.nombre);
      localStorage.setItem('usuario_rol', session.rol);
    }
    return session;
  } catch (_e) {
    if (Date.now() - session.ts < 7 * 86400000) return session;
    localStorage.removeItem('session');
    return false;
  }
}

export async function logout() {
  if (!(await window.showConfirm('¿Cerrar sesión?', 'Cerrar sesión', 'Salir'))) return;
  supabase.auth.signOut();
  localStorage.removeItem('session');
  localStorage.removeItem('usuario_nombre');
  localStorage.removeItem('usuario_rol');
  location.reload();
}

// === FORGOT PASSWORD FLOW ===
let _forgotEmail = '';

function showStep(stepNum) {
  ['loginNormal', 'forgotStep1', 'forgotStep2', 'forgotStep3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.display = i === stepNum ? 'block' : 'none';
  });
  ['forgotError1', 'forgotError2', 'forgotError3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '';
      el.classList.remove('show');
    }
  });
}

export function showForgotPassword() {
  showStep(1);
  const emailInput = document.getElementById('forgotEmail');
  if (emailInput) {
    emailInput.value = '';
    emailInput.focus();
  }
}

export function backToLogin() {
  showStep(0);
  const userInput = document.getElementById('loginUser');
  if (userInput) userInput.focus();
}

export async function requestPasswordReset() {
  const credential = document.getElementById('forgotEmail').value.trim();
  const errEl = document.getElementById('forgotError1');
  const btn = document.querySelector('#forgotStep1 .login-btn');

  if (!credential) {
    errEl.textContent = 'Ingresa tu usuario o email';
    errEl.classList.add('show');
    return;
  }

  _forgotEmail = credential.includes('@') ? credential : credential + '@gemeseg.com';
  btn.disabled = true;
  btn.innerHTML = '<span class="login-spinner"></span>Enviando…';
  errEl.classList.remove('show');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(_forgotEmail, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) throw error;
    showStep(2);
  } catch (e) {
    let msg = e.message || 'Error al enviar enlace';
    if (msg.includes('not found') || msg.includes('invalid')) {
      msg = 'Email no registrado. Contacta al administrador.';
    }
    errEl.textContent = msg;
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📧 Enviar enlace de recuperación';
  }
}

export async function checkRecoveryToken() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('type=recovery')) return false;

  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    if (!accessToken) return false;

    const { error } = await supabase.auth.getSession();
    if (error) throw error;

    showStep(3);
    const passInput = document.getElementById('forgotNewPass');
    if (passInput) passInput.focus();
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } catch (_e) {
    return false;
  }
}

export async function setNewPassword() {
  const pass = document.getElementById('forgotNewPass').value;
  const confirm = document.getElementById('forgotConfirmPass').value;
  const errEl = document.getElementById('forgotError3');
  const btn = document.querySelector('#forgotStep3 .login-btn');

  if (!pass || pass.length < 6) {
    errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errEl.classList.add('show');
    return;
  }
  if (pass !== confirm) {
    errEl.textContent = 'Las contraseñas no coinciden';
    errEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="login-spinner"></span>Cambiando…';
  errEl.classList.remove('show');

  try {
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) throw error;
    await supabase.auth.signOut();
    localStorage.removeItem('session');
    localStorage.removeItem('usuario_nombre');
    localStorage.removeItem('usuario_rol');
    showStep(0);
    document.getElementById('loginPass').value = '';
    const toastEl = document.getElementById('toast');
    if (toastEl) {
      toastEl.textContent = '✅ Contraseña actualizada. Inicia sesión con tu nueva clave.';
      toastEl.className = 'toast toast-success show';
      clearTimeout(toastEl._timer);
      toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
  } catch (e) {
    errEl.textContent = 'Error: ' + (e.message || 'No se pudo cambiar la contraseña');
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔒 Cambiar contraseña';
  }
}

// Expose to window for HTML onclick
window.showForgotPassword = showForgotPassword;
window.backToLogin = backToLogin;
window.requestPasswordReset = requestPasswordReset;
window.setNewPassword = setNewPassword;
window.checkRecoveryToken = checkRecoveryToken;
