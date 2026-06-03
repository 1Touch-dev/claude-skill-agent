const DEFAULT_LOCAL_API = 'http://localhost:3000';
const API_PORT = process.env.REACT_APP_API_PORT || '3000';

function normalizeBase(url) {
  if (!url) return '';
  return String(url).replace(/\/+$/, '');
}

function isLocalHost(hostname) {
  return !hostname || hostname === 'localhost' || hostname === '127.0.0.1';
}

function hostFromUrl(base) {
  try {
    return new URL(base).hostname;
  } catch {
    return '';
  }
}

/**
 * API origin for fetch calls. On EC2 (or any remote host), uses the same
 * hostname as the admin UI with the API port so browsers never call localhost.
 */
export function resolveApiBase() {
  const configured = normalizeBase(process.env.REACT_APP_API_BASE || '');

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    const remoteUi = !isLocalHost(hostname);

    if (configured) {
      if (remoteUi && isLocalHost(hostFromUrl(configured))) {
        return `${protocol}//${hostname}:${API_PORT}`;
      }
      return configured;
    }

    if (remoteUi) {
      return `${protocol}//${hostname}:${API_PORT}`;
    }
    return DEFAULT_LOCAL_API;
  }

  return configured || DEFAULT_LOCAL_API;
}
