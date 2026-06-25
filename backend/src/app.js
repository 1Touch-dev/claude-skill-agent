const express = require('express');
const cors = require('cors');
const health = require('./routes/health');
const registry = require('./routes/registry');
const suites = require('./routes/suites');
const entitlements = require('./routes/entitlements');
const agents = require('./routes/agents');
const tasks = require('./routes/tasks');
const routing = require('./routes/routing');
const security = require('./routes/security');
const reports = require('./routes/reports');
const runs = require('./routes/runs');
const approvals = require('./routes/approvals');
const integrations = require('./routes/integrations');
const dashboard = require('./routes/dashboard');
const pm = require('./routes/pm');
const webhooks = require('./routes/webhooks');
const agentApi = require('./routes/agent-api');
const mcpRoutes = require('./routes/mcp');
const workflows = require('./routes/workflows');
const { authenticateRequest, requireRole } = require('./middleware/auth');

function buildApp() {
  const app = express();
  app.use(cors());

  // Webhook receiver — raw body before express.json(), no auth
  app.use('/webhooks', webhooks);

  app.use(express.json());
  app.use('/health', health);

  // Public Agent API — /v1 (API key auth, separate from admin UI)
  app.use('/v1', agentApi);

  app.use('/api', authenticateRequest);
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    return requireRole(['admin', 'operator'])(req, res, next);
  });
  app.use('/api', registry);
  app.use('/api', suites);
  app.use('/api', entitlements);
  app.use('/api', agents);
  app.use('/api', tasks);
  app.use('/api', routing);
  app.use('/api', security);
  app.use('/api', runs);
  app.use('/api', reports);
  app.use('/api', approvals);
  app.use('/api', integrations);
  app.use('/api', dashboard);
  app.use('/api', pm);
  app.use('/api', mcpRoutes);
  app.use('/api', workflows);
  app.get('/', (_req, res) => res.json({ name: 'Enterprise Claude Skills API', status: 'ok' }));
  return app;
}

module.exports = { buildApp };
