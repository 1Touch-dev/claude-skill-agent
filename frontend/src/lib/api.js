const API_BASE = process.env.REACT_APP_API_BASE || '';
export const TOKEN_KEY = 'admin_token';
const ROLE_KEY = 'admin_role';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminRole() {
  return localStorage.getItem(ROLE_KEY) || 'admin';
}

export function setAdminSession(token, role = 'admin') {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

function authHeaders() {
  const token = getAdminToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const role = getAdminRole();
  if (role) headers['x-user-role'] = role;
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_BASE}/api${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    throw new Error(
      `Cannot reach API at ${url}. Start the backend (port 3000) and confirm REACT_APP_API_BASE in frontend/.env.`
    );
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) {
    let message = `${options.method || 'GET'} ${path} failed: ${res.status}`;
    try {
      const body = text ? JSON.parse(text) : {};
      if (body.message) message = body.message;
      else if (body.error) message = body.error;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }
  if (!text) return null;
  return JSON.parse(text);
}

export async function apiGet(path) {
  return request(path, { method: 'GET' });
}

export async function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body || {}) });
}

export async function apiPut(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body || {}) });
}

export async function apiDelete(path) {
  return request(path, { method: 'DELETE' });
}
