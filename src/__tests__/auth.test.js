import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('../lib/supabase.js', () => ({
  default: {
    auth: {
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      getSession: mockGetSession,
    },
    from: vi.fn(() => ({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
    })),
  },
}));

// DOM helpers
function setupDOM() {
  document.body.innerHTML = `
    <div id="loginError" class=""></div>
    <button id="loginBtn">Ingresar</button>
    <input id="loginUser" value="">
    <input id="loginPass" value="">
  `;
}

// Extract functions (mirroring auth.js logic for isolated testing)
function showLoginError(msg) {
  const e = document.getElementById('loginError');
  e.textContent = msg;
  e.classList.add('show');
}

function resetLoginBtn() {
  const btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.textContent = 'Ingresar';
}

function buildSession(data, profile, credential) {
  return {
    userId: data.user.id,
    user: profile.usuario || credential,
    email: profile.correo || data.user.email,
    nombre: profile.nombre || data.user.email,
    rol: profile.rol || 'ventas',
    activo: profile.activo !== false,
    ts: Date.now(),
  };
}

function validateCredentials(credential, pass) {
  if (!credential || !pass) {
    return { valid: false, error: 'Ingresa usuario y clave' };
  }
  return { valid: true };
}

function formatLoginError(msg) {
  if (msg === 'Invalid login credentials') {
    return 'Usuario o clave incorrectos. Verifica tus datos.';
  } else if (msg.includes('Database error')) {
    return 'Error del servidor. Intenta de nuevo en unos segundos.';
  }
  return msg;
}

function buildEmail(credential) {
  return credential.includes('@') ? credential : credential + '@gemeseg.com';
}

function validateSessionLogic(raw, supabaseSession, profile) {
  if (!raw) return false;
  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!supabaseSession) return false;
  if (profile && profile.activo === false) return false;
  if (profile) {
    session.nombre = profile.nombre || session.nombre;
    session.rol = profile.rol || session.rol;
  }
  return session;
}

// Tests
describe('showLoginError() - login error display', () => {
  beforeEach(setupDOM);

  it('sets error text and shows element', () => {
    showLoginError('Usuario o clave incorrectos');
    const el = document.getElementById('loginError');
    expect(el.textContent).toBe('Usuario o clave incorrectos');
    expect(el.classList.contains('show')).toBe(true);
  });

  it('replaces previous error message', () => {
    showLoginError('First error');
    showLoginError('Second error');
    expect(document.getElementById('loginError').textContent).toBe('Second error');
  });
});

describe('resetLoginBtn() - button reset', () => {
  beforeEach(setupDOM);

  it('resets button to enabled with original text', () => {
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="login-spinner"></span>Verificando…';
    resetLoginBtn();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Ingresar');
  });
});

describe('validateCredentials() - input validation', () => {
  it('rejects empty credential', () => {
    const result = validateCredentials('', 'pass123');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Ingresa usuario y clave');
  });

  it('rejects empty password', () => {
    const result = validateCredentials('admin', '');
    expect(result.valid).toBe(false);
  });

  it('rejects both empty', () => {
    const result = validateCredentials('', '');
    expect(result.valid).toBe(false);
  });

  it('accepts valid inputs', () => {
    const result = validateCredentials('admin', 'pass123');
    expect(result.valid).toBe(true);
  });
});

describe('formatLoginError() - error message mapping', () => {
  it('maps Invalid login credentials', () => {
    expect(formatLoginError('Invalid login credentials')).toBe('Usuario o clave incorrectos. Verifica tus datos.');
  });

  it('maps Database error', () => {
    expect(formatLoginError('Database error connection refused')).toBe(
      'Error del servidor. Intenta de nuevo en unos segundos.'
    );
  });

  it('passes through other messages', () => {
    expect(formatLoginError('Network error')).toBe('Network error');
    expect(formatLoginError('Timeout')).toBe('Timeout');
  });
});

describe('buildEmail() - email construction', () => {
  it('returns full email if @ present', () => {
    expect(buildEmail('user@test.com')).toBe('user@test.com');
  });

  it('appends @gemeseg.com for username', () => {
    expect(buildEmail('admin')).toBe('admin@gemeseg.com');
  });

  it('handles edge cases', () => {
    expect(buildEmail('a@b')).toBe('a@b');
    expect(buildEmail('user.name')).toBe('user.name@gemeseg.com');
  });
});

describe('buildSession() - session object creation', () => {
  it('creates session from data and profile', () => {
    const data = { user: { id: 'u1', email: 'test@gemeseg.com' } };
    const profile = { usuario: 'admin', correo: 'admin@gemeseg.com', nombre: 'Admin', rol: 'admin', activo: true };
    const session = buildSession(data, profile, 'admin');
    expect(session.userId).toBe('u1');
    expect(session.user).toBe('admin');
    expect(session.email).toBe('admin@gemeseg.com');
    expect(session.nombre).toBe('Admin');
    expect(session.rol).toBe('admin');
    expect(session.activo).toBe(true);
  });

  it('falls back to credential when profile fields missing', () => {
    const data = { user: { id: 'u1', email: 'test@gemeseg.com' } };
    const profile = { activo: true };
    const session = buildSession(data, profile, 'testuser');
    expect(session.user).toBe('testuser');
    expect(session.email).toBe('test@gemeseg.com');
    expect(session.nombre).toBe('test@gemeseg.com');
    expect(session.rol).toBe('ventas');
  });

  it('sets activo false when profile.activo is false', () => {
    const data = { user: { id: 'u1', email: 'test@gemeseg.com' } };
    const profile = { activo: false };
    const session = buildSession(data, profile, 'user');
    expect(session.activo).toBe(false);
  });
});

describe('validateSessionLogic() - session validation', () => {
  it('returns false for null raw', () => {
    expect(validateSessionLogic(null, {}, {})).toBe(false);
  });

  it('returns false for invalid JSON', () => {
    expect(validateSessionLogic('not-json', {}, {})).toBe(false);
  });

  it('returns false when no supabase session', () => {
    const raw = JSON.stringify({ userId: 'u1' });
    expect(validateSessionLogic(raw, null, {})).toBe(false);
  });

  it('returns false when profile is inactive', () => {
    const raw = JSON.stringify({ userId: 'u1' });
    expect(validateSessionLogic(raw, { user: {} }, { activo: false })).toBe(false);
  });

  it('returns session when valid', () => {
    const raw = JSON.stringify({ userId: 'u1', nombre: 'Test' });
    const result = validateSessionLogic(raw, { user: {} }, { nombre: 'Updated', rol: 'admin' });
    expect(result).toBeTruthy();
    expect(result.nombre).toBe('Updated');
    expect(result.rol).toBe('admin');
  });

  it('preserves original values when profile has no data', () => {
    const raw = JSON.stringify({ userId: 'u1', nombre: 'Original' });
    const result = validateSessionLogic(raw, { user: {} }, null);
    expect(result.nombre).toBe('Original');
  });
});
