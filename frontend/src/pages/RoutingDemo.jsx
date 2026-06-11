import React, { useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

// Plane CE external UI base (update if host/port changes)
const PLANE_UI = 'http://54.167.31.169:8083';
const PLANE_WORKSPACE = 'claude-skills';
const PLANE_PROJECT = 'WS0002';

function planeIssueUrl(issueId) {
  if (!issueId) return null;
  return `${PLANE_UI}/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT}/issues/${issueId}/`;
}

function PmBadge({ task }) {
  if (!task.plane_issue_id) {
    return <span style={{ color: '#999', fontSize: '0.8rem' }}>—</span>;
  }
  const url = planeIssueUrl(task.plane_issue_id);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Plane issue ${task.plane_issue_id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: '#eef2ff',
        color: '#4338ca',
        border: '1px solid #c7d2fe',
        borderRadius: '4px',
        padding: '2px 7px',
        fontSize: '0.78rem',
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      ✈ #{task.plane_issue_sequence_id || '?'}
    </a>
  );
}

export default function RoutingDemo() {
  const [tasks, setTasks] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    workspace_id: 2,
    title: 'MVP routing demo task',
    description: 'Demonstrate task intake and agent routing',
    skill_key: 'mkt_campaign_brief',
    risk_tier: 1,
  });

  async function loadTasks() {
    try {
      const data = await apiGet('/tasks');
      setTasks(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (e) {
      setErr(String(e));
    }
  }

  React.useEffect(() => {
    loadTasks();
  }, []);

  async function createTask(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const task = await apiPost('/tasks', {
        workspace_id: Number(form.workspace_id),
        customer_id: 1,
        title: form.title,
        description: form.description,
        risk_tier: Number(form.risk_tier),
        routing_mode: 'auto',
        status: 'queued',
        created_by: 'mvp-demo',
      });
      setMsg(`Task #${task.id} created.`);
      loadTasks();
    } catch (e2) {
      setErr(String(e2));
    }
  }

  async function routeTask(taskId) {
    setErr('');
    setResult(null);
    try {
      const route = await apiPost('/route', {
        workspace_id: Number(form.workspace_id),
        task_id: taskId,
        skill_key: form.skill_key,
        min_autonomy: 0,
        risk_tier: Number(form.risk_tier),
      });
      const applied = await apiPost('/route/apply', {
        task_id: taskId,
        workspace_id: Number(form.workspace_id),
        skill_key: form.skill_key,
        min_autonomy: 0,
        risk_tier: Number(form.risk_tier),
      });
      setResult({ route, applied });
      setMsg(`Task #${taskId} routed to agent ${route.agent_name || route.agent_id}. Syncing to Plane…`);
      // Reload after a short delay to pick up the Plane issue ID written by auto-sync
      setTimeout(loadTasks, 2000);
    } catch (e2) {
      setErr(String(e2));
    }
  }

  return (
    <main className="page">
      <div className="page__header">
        <h2>Routing Demo</h2>
        <p>Create task intake, compute route recommendation, and persist orchestration run.</p>
      </div>
      {err && <div className="status status--error">{err}</div>}
      {msg && <div className="status status--muted">{msg}</div>}

      <section className="panel">
        <h3>Create Task Intake</h3>
        <form className="form-grid" onSubmit={createTask}>
          <label>
            Workspace ID
            <input
              className="field-input"
              type="number"
              value={form.workspace_id}
              onChange={(e) => setForm({ ...form, workspace_id: e.target.value })}
            />
          </label>
          <label>
            Title
            <input
              className="field-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Skill key
            <input
              className="field-input"
              value={form.skill_key}
              onChange={(e) => setForm({ ...form, skill_key: e.target.value })}
            />
          </label>
          <button type="submit" className="btn-primary">
            Create Task
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Recent Tasks</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>PM (Plane)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No tasks yet.</td>
                </tr>
              )}
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: t.status === 'completed' ? '#dcfce7'
                        : t.status === 'running' ? '#fef9c3'
                        : t.status === 'failed' ? '#fee2e2'
                        : '#f3f4f6',
                      color: t.status === 'completed' ? '#15803d'
                        : t.status === 'running' ? '#854d0e'
                        : t.status === 'failed' ? '#dc2626'
                        : '#374151',
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td><PmBadge task={t} /></td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => routeTask(t.id)}>
                      Route &amp; Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '6px' }}>
          ✈ badge = synced to{' '}
          <a href={`${PLANE_UI}/${PLANE_WORKSPACE}/projects/`} target="_blank" rel="noopener noreferrer">
            Plane CE
          </a>
          {' '}— click to open work item
        </p>
      </section>

      {result && (
        <section className="panel">
          <h3>Last Routing Result</h3>
          {result.applied?.plane_issue_id && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              padding: '10px 14px',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '6px',
            }}>
              <span style={{ fontWeight: 600, color: '#4338ca' }}>✈ Synced to Plane</span>
              <a
                href={planeIssueUrl(result.applied.plane_issue_id)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4338ca', fontWeight: 600 }}
              >
                Open Work Item →
              </a>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                Issue ID: {result.applied.plane_issue_id.slice(0, 8)}…
              </span>
            </div>
          )}
          {!result.applied?.plane_issue_id && (
            <div style={{
              marginBottom: '12px',
              padding: '8px 14px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              color: '#6b7280',
              fontSize: '0.85rem',
            }}>
              ⏳ Plane sync in progress (fire-and-forget — reload tasks in a moment)
            </div>
          )}
          <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
