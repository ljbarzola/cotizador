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
  if (error) {
    console.error('Profile fetch error:', error.message, error);
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
    console.log('Login attempt:', { email, passLength: pass.length });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      console.error('Supabase auth error:', error);
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

    console.log('Login OK, user:', data.user.id);

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
      activo: profile.activo !== false,
      ts: Date.now(),
    };
    localStorage.setItem('usuario_nombre', session.nombre);
    localStorage.setItem('usuario_rol', session.rol);
    localStorage.setItem('session', JSON.stringify(session));
    window._enterApp?.(session);
    return session;
  } catch (e) {
    console.error('Login exception:', e);
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
    if (profile && profile.activo === false) {
      localStorage.removeItem('session');
      return false;
    }

    if (profile) {
      session.nombre = profile.nombre || session.nombre;
      session.rol = profile.rol || session.rol;
      localStorage.setItem('usuario_nombre', session.nombre);
      localStorage.setItem('usuario_rol', session.rol);
    }
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
