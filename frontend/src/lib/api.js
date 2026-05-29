const API_BASE = process.env.REACT_APP_API_BASE || '';

export async function apiGet(path) {
  const url = `${API_BASE}/api${path}`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `Cannot reach API at ${url}. Start the backend (port 3000) and confirm REACT_APP_API_BASE in frontend/.env.`
    );
  }
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}
