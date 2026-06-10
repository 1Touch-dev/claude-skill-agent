'use strict';

const config = {
  enabled: process.env.PLANE_API_URL && process.env.PLANE_API_TOKEN && process.env.PLANE_WORKSPACE_SLUG,
  apiUrl: (process.env.PLANE_API_URL || 'http://54.167.31.169:8083').replace(/\/$/, ''),
  apiToken: process.env.PLANE_API_TOKEN || '',
  workspaceSlug: process.env.PLANE_WORKSPACE_SLUG || '',
  webhookSecret: process.env.PLANE_WEBHOOK_SECRET || '',
  defaultProjectNetwork: 'secret', // secret|public
  requestTimeoutMs: parseInt(process.env.PLANE_TIMEOUT_MS || '8000', 10),
};

module.exports = config;
