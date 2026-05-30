const STORAGE_KEY = 'das_admin_session';

const decodeJwt = (token) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

const getSession = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const setSession = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded?.id || !decoded?.role) {
    throw new Error('Invalid authentication token');
  }

  const session = { token, id: decoded.id, role: decoded.role };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
};

const clearSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export { getSession, setSession, clearSession };
