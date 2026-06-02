const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || 'false').toLowerCase() === 'true';
const API_KEYS = String(process.env.API_KEYS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

function authenticateRequest(req, res, next) {
  const token = extractBearerToken(req);
  const headerRole = String(req.headers['x-user-role'] || '').trim().toLowerCase();
  const role = ['admin', 'operator', 'viewer'].includes(headerRole) ? headerRole : 'viewer';

  req.auth = {
    token,
    role,
    authenticated: false,
  };

  if (!REQUIRE_AUTH) {
    req.auth.authenticated = true;
    if (!headerRole) req.auth.role = 'admin';
    return next();
  }

  const valid = !!token && (token === ADMIN_TOKEN || API_KEYS.includes(token));
  if (!valid) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid bearer token',
    });
  }

  req.auth.authenticated = true;
  if (!headerRole) req.auth.role = 'admin';
  return next();
}

function requireRole(allowedRoles) {
  const normalized = allowedRoles.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    const role = req.auth?.role || 'viewer';
    if (!normalized.includes(role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Required role: ${allowedRoles.join(', ')}`,
      });
    }
    return next();
  };
}

module.exports = {
  authenticateRequest,
  requireRole,
};
