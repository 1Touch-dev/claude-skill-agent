const API_BASE = process.env.REACT_APP_API_BASE || '';
const TOKEN_KEY = 'admin_token';

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} failed: ${res.status}`);
  return res.json();
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
