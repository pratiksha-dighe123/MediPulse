const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://medipulse-1sje.onrender.com'
  : 'http://localhost:5000';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

const apiFetch = async (path, options = {}) => {
  const { method = 'GET', body, token, headers = {} } = options;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to reach backend server');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
};

const getDefaultRouteByRole = (role) => {
  if (role === 'doctor') return '/doctor/dashboard';
  if (role === 'patient') return '/patient/dashboard';
  if (role === 'hospital') return '/hospital/dashboard';
  if (role === 'driver') return '/ambulance/driver/dashboard';
  return '/';
};

export { API_BASE_URL, apiFetch, getDefaultRouteByRole };
