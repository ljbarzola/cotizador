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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw new Error('No se pudo cargar el perfil: ' + error.message);
  return data;
}

export async function doLogin() {
  const credential = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  document.getElementById('loginError').classList.remove('show');

  if (!credential || !pass) {
    showLoginError('Ingresa usuario/email y clave');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="login-spinner"></span>Verificando…';

  try {
    const email = credential.includes('@') ? credential : credential + '@gemeseg.local';

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      showLoginError('Usuario o clave incorrectos.');
      resetLoginBtn();
      return;
    }

    const profile = await fetchUserProfile(data.user.id);

    if (!profile.activo) {
      await supabase.auth.signOut();
      showLoginError('Tu acceso fue desactivado. Contacta al administrador.');
      resetLoginBtn();
      return;
    }

    const session = {
      userId: data.user.id,
      user: credential,
      nombre: profile.nombre,
      rol: profile.rol,
      activo: profile.activo,
      ts: Date.now(),
    };
    localStorage.setItem('usuario_nombre', profile.nombre);
    localStorage.setItem('usuario_rol', profile.rol);
    localStorage.setItem('session', JSON.stringify(session));
    return session;
  } catch (e) {
    showLoginError('Error al iniciar sesión: ' + e.message);
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
  } catch (e) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      localStorage.removeItem('session');
      return false;
    }

    const profile = await fetchUserProfile(data.session.user.id);
    if (!profile.activo) {
      localStorage.removeItem('session');
      return false;
    }

    session.nombre = profile.nombre;
    session.rol = profile.rol;
    localStorage.setItem('usuario_nombre', profile.nombre);
    localStorage.setItem('usuario_rol', profile.rol);
    return session;
  } catch (e) {
    if (Date.now() - session.ts < 7 * 86400000) return session;
    localStorage.removeItem('session');
    return false;
  }
}

export function logout() {
  if (!confirm('¿Cerrar sesión?')) return;
  supabase.auth.signOut();
  localStorage.removeItem('session');
  localStorage.removeItem('usuario_nombre');
  localStorage.removeItem('usuario_rol');
  location.reload();
}
