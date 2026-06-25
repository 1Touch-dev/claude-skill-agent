import React, { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';

const PLANE_UI = 'http://54.167.31.169:8083';
const PLANE_WORKSPACE = 'claude-skills';
const PLANE_PROJECT = 'WS0002';

function planeIssueUrl(issueId) {
  if (!issueId) return null;
  return `${PLANE_UI}/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT}/issues/${issueId}/`;
}

const STATUS_STYLE = {
  completed: { background: '#dcfce7', color: '#15803d' },
  running:   { background: '#fef9c3', color: '#854d0e' },
  failed:    { background: '#fee2e2', color: '#dc2626' },
  approved:  { background: '#e0f2fe', color: '#0369a1' },
  pending:   { background: '#fef3c7', color: '#92400e' },
  queued:    { background: '#f3f4f6', color: '#374151' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.queued;
  return (
    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, ...s }}>
      {status}
    </span>
  );
}

function PmCell({ task }) {
  if (!task.plane_issue_id) {
    return (
      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Not synced</span>
    );
  }
  const url = planeIssueUrl(task.plane_issue_id);
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
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
        ✈ #{task.plane_issue_sequence_id || '?'} Open in Plane →
      </a>
    </span>
  );
}

const BADGE_BASE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '4px',
  padding: '2px 7px',
  fontSize: '0.78rem',
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  marginBottom: '2px',
};

function IntegrationsCell({ task }) {
  const badges = [];

  if (task.github_pr_url && task.github_pr_number) {
    badges.push(
      <a
        key="gh"
        href={task.github_pr_url}
        target="_blank"
        rel="noopener noreferrer"
        title={`GitHub PR #${task.github_pr_number}`}
        style={{ ...BADGE_BASE, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
      >
        ⑂ PR #{task.github_pr_number}
      </a>
    );
  }

  if (task.slack_thread_ts) {
    badges.push(
      <span
        key="slack"
        title={`Slack thread ts: ${task.slack_thread_ts}`}
        style={{ ...BADGE_BASE, background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', cursor: 'default' }}
      >
        # Slack thread
      </span>
    );
  }

  if (badges.length === 0) {
    return <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>;
  }

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {badges}
    </span>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await apiGet('/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'synced'
    ? tasks.filter((t) => !!t.plane_issue_id)
    : filter === 'unsynced'
      ? tasks.filter((t) => !t.plane_issue_id)
      : tasks;

  const syncedCount = tasks.filter((t) => !!t.plane_issue_id).length;

  return (
    <main className="page">
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Tasks</h2>
          <p>All task intakes with PM sync status. ✈ badge = synced to Plane CE. ⑂ = GitHub PR linked. # = Slack thread.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            {syncedCount}/{tasks.length} synced to Plane
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
          <a
            href={`${PLANE_UI}/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT}/issues/`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            Open Plane ↗
          </a>
        </div>
      </div>

      {err && <div className="status status--error">{err}</div>}

      <section className="panel">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['all', 'synced', 'unsynced'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: filter === f ? '#4338ca' : '#fff',
                color: filter === f ? '#fff' : '#374151',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              {f === 'all' ? `All (${tasks.length})` : f === 'synced' ? `Synced (${syncedCount})` : `Not synced (${tasks.length - syncedCount})`}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Title</th>
                <th style={{ width: '90px' }}>Workspace</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '160px' }}>PM (Plane)</th>
                <th style={{ width: '160px' }}>Integrations</th>
                <th style={{ width: '150px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                    Loading tasks…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                    No tasks found.
                  </td>
                </tr>
              )}
              {!loading && filtered.map((t) => (
                <tr key={t.id} style={!t.plane_issue_id ? { opacity: 0.75 } : {}}>
                  <td style={{ fontWeight: 600 }}>#{t.id}</td>
                  <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.82rem' }}>ws-{t.workspace_id}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><PmCell task={t} /></td>
                  <td><IntegrationsCell task={t} /></td>
                  <td style={{ color: '#6b7280', fontSize: '0.78rem' }}>
                    {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '6px' }}>
          Plane CE running at{' '}
          <a href={`${PLANE_UI}`} target="_blank" rel="noopener noreferrer">
            {PLANE_UI}
          </a>
        </p>
      </section>
    </main>
  );
}
