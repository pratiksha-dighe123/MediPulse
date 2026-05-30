const AUTH_KEY = 'das_auth_session';

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
};

const getAuthSession = () => {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
};

const setAuthSession = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.id || !payload?.role) {
    throw new Error('Invalid token payload');
  }

  const session = {
    token,
    id: payload.id,
    role: payload.role,
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
};

const clearAuthSession = () => {
  localStorage.removeItem(AUTH_KEY);
};

export { getAuthSession, setAuthSession, clearAuthSession };
