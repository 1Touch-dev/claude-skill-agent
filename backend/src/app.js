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
const { authenticateRequest, requireRole } = require('./middleware/auth');

function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/health', health);
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
  app.get('/', (_req, res) => res.json({ name: 'Enterprise Claude Skills API', status: 'ok' }));
  return app;
}

module.exports = { buildApp };
