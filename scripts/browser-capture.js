// Injected via CDP Runtime.evaluate — returns network + session snapshot
(function capture() {
  const token = localStorage.getItem('admin_token');
  const role = localStorage.getItem('admin_role');
  const resources = performance.getEntriesByType('resource')
    .filter((e) => e.name.includes('/api/') || e.name.includes(':3000/api'))
    .map((e) => ({
      url: e.name,
      status: e.responseStatus || null,
      durationMs: Math.round(e.duration),
      size: e.transferSize || 0,
    }));
  const errors = window.__capturedErrors || [];
  return JSON.stringify({ tokenPresent: !!token, role, resources, consoleErrors: errors, path: location.pathname });
})();
