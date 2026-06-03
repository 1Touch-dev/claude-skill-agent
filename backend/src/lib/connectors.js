/** MVP integration test layer — demonstrates connectivity checks without production OAuth. */

const SUPPORTED = ['asana', 'github', 'slack', 'monday', 'trello'];

function hasCredential(vault) {
  if (!vault || typeof vault !== 'object') return false;
  return Boolean(
    vault.token ||
      vault.access_token ||
      vault.bot_token ||
      vault.api_key ||
      (vault.token_type && Object.keys(vault).length > 1)
  );
}

function testProvider(provider, vault) {
  const p = String(provider || '').toLowerCase();
  if (!SUPPORTED.includes(p)) {
    return {
      ok: false,
      status: 'error',
      message: `Unsupported provider: ${provider}`,
      mode: 'mvp-mock',
    };
  }
  if (!hasCredential(vault)) {
    return {
      ok: false,
      status: 'disconnected',
      message: 'No credentials configured in vault',
      mode: 'mvp-mock',
    };
  }

  // MVP: simulate provider handshake when credentials exist
  const simulatedLatencyMs = 120 + Math.floor(Math.random() * 80);
  return {
    ok: true,
    status: 'connected',
    message: `${p} credential profile detected — MVP mock connection OK (not live OAuth)`,
    mode: 'mvp-mock',
    latency_ms: simulatedLatencyMs,
    checked_at: new Date().toISOString(),
  };
}

module.exports = { SUPPORTED, hasCredential, testProvider };
