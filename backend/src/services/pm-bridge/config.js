'use strict';

function parseAllowlist(raw) {
  if (!raw || !raw.trim()) return null; // null = allow all
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const config = {
  enabled: process.env.PLANE_API_URL && process.env.PLANE_API_TOKEN && process.env.PLANE_WORKSPACE_SLUG,
  apiUrl: (process.env.PLANE_API_URL || 'http://54.167.31.169:8083').replace(/\/$/, ''),
  apiToken: process.env.PLANE_API_TOKEN || '',
  workspaceSlug: process.env.PLANE_WORKSPACE_SLUG || '',
  webhookSecret: process.env.PLANE_WEBHOOK_SECRET || '',
  // null = allow all (dev default); non-null array = restrict to listed IPs/CIDRs
  webhookAllowedIps: parseAllowlist(process.env.PLANE_WEBHOOK_ALLOWED_IPS),
  defaultProjectNetwork: 'secret', // secret|public
  requestTimeoutMs: parseInt(process.env.PLANE_TIMEOUT_MS || '8000', 10),
};

module.exports = config;
