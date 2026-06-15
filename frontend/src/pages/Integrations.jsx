import React, { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';

const PROVIDERS = ['asana', 'github', 'slack', 'monday', 'trello'];

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'connected') return 'badge badge--success';
  if (s === 'error') return 'badge badge--danger';
  return 'badge badge--muted';
}

export default function Integrations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [form, setForm] = useState({
    workspace_id: 2,
    provider: 'github',
    name: '',
    endpoint_url: '',
    client_id: '',
    token: '',
  });

  const load = () => {
    setLoading(true);
    setErr('');
    apiGet('/integrations')
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setMsg('');
    try {
      await apiPost('/integrations', {
        workspace_id: Number(form.workspace_id),
        provider: form.provider,
        name: form.name || `${form.provider} connection`,
        endpoint_url: form.endpoint_url || defaultEndpoint(form.provider),
        client_id: form.client_id || null,
        credential_vault: form.token
          ? { token_type: 'Bearer', token: form.token }
          : {},
        status: form.token ? 'disconnected' : 'disconnected',
        active: true,
      });
      setMsg('Integration created. Run Test Connection to verify.');
      setForm((f) => ({ ...f, name: '', token: '' }));
      load();
    } catch (e2) {
      setErr(String(e2));
    }
  }

  async function handleTest(id) {
    setTestingId(id);
    setMsg('');
    try {
      const result = await apiPost(`/integrations/${id}/test`, {});
      setMsg(`${result.provider}: ${result.status} — ${result.message}`);
      load();
    } catch (e2) {
      setErr(String(e2));
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id) {
    try {
      await apiDelete(`/integrations/${id}`);
      setMsg('Integration removed.');
      load();
    } catch (e2) {
      setErr(String(e2));
    }
  }

  return (
    <main className="page">
      <div className="page__header">
        <h2>Integrations</h2>
        <p>
          External connector registry. <strong>GitHub</strong> and <strong>Slack</strong> use live API
          tests (<code>mode: live</code>); Asana, Monday, and Trello use mock validation in MVP.
        </p>
      </div>
      {err && <div className="status status--error">{err}</div>}
      {msg && <div className="status status--muted">{msg}</div>}

      <section className="panel">
        <h3>Add Integration</h3>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Workspace ID
            <input
              className="field-input"
              type="number"
              value={form.workspace_id}
              onChange={(e) => setForm({ ...form, workspace_id: e.target.value })}
              required
            />
          </label>
          <label>
            Provider
            <select
              className="field-input"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input
              className="field-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Production connector"
            />
          </label>
          <label>
            Endpoint URL
            <input
              className="field-input"
              value={form.endpoint_url}
              onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })}
              placeholder={defaultEndpoint(form.provider)}
            />
          </label>
          <label>
            Credential token (stored in vault)
            <input
              className="field-input"
              type="password"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
              placeholder="Optional for MVP test"
            />
          </label>
          <button type="submit" className="btn-primary">
            Create Integration
          </button>
        </form>
      </section>

      {loading ? (
        <p className="status status--muted">Loading integrations…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Provider</th>
                <th>Name</th>
                <th>Status</th>
                <th>Credentials</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.provider}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={statusClass(r.status)}>{r.status}</span>
                  </td>
                  <td>{r.credential_vault?.configured ? 'configured' : 'missing'}</td>
                  <td>{r.active ? 'yes' : 'no'}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={testingId === r.id}
                      onClick={() => handleTest(r.id)}
                    >
                      {testingId === r.id ? 'Testing…' : 'Test'}
                    </button>
                    <button type="button" className="btn-danger" onClick={() => handleDelete(r.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="status status--muted">No integrations configured.</p>}
        </div>
      )}
    </main>
  );
}

function defaultEndpoint(provider) {
  const map = {
    asana: 'https://app.asana.com/api/1.0',
    github: 'https://api.github.com',
    slack: 'https://slack.com/api',
    monday: 'https://api.monday.com/v2',
    trello: 'https://api.trello.com/1',
  };
  return map[provider] || '';
}
