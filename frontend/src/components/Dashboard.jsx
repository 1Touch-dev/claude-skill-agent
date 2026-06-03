import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/dashboard/summary')
      .then(setData)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const t = data?.totals || {};

  const cards = [
    { label: 'Total Skills', value: t.skills, link: '/skills' },
    { label: 'Active Skills', value: t.active_skills, link: '/skills' },
    { label: 'Agents', value: t.agents, link: '/agents' },
    { label: 'Runs', value: t.runs, link: '/runs' },
    { label: 'Pending Approvals', value: t.pending_approvals, link: '/approvals' },
    { label: 'Integrations', value: t.integrations, link: '/integrations' },
    { label: 'Connected Integrations', value: t.connected_integrations, link: '/integrations' },
    { label: 'Workspaces', value: t.workspaces, link: '/workspaces' },
    { label: 'Customers', value: t.customers, link: '/customers' },
  ];

  return (
    <main className="page">
      <div className="page__header">
        <h2>Executive Dashboard</h2>
        <p>Live control-plane metrics from the Enterprise Claude Skills API.</p>
      </div>
      {err && <div className="status status--error">{err}</div>}
      {loading ? (
        <p className="status status--muted">Loading dashboard metrics…</p>
      ) : (
        <>
          <section className="metrics-grid">
            {cards.map((c) => (
              <Link key={c.label} to={c.link} className="metric-card">
                <span className="metric-card__label">{c.label}</span>
                <span className="metric-card__value">{c.value ?? 0}</span>
              </Link>
            ))}
          </section>
          <section className="panel-grid">
            <article className="panel">
              <h3>Runs by State</h3>
              <ul className="simple-list">
                {(data?.runs_by_state || []).map((r) => (
                  <li key={r.state}>
                    <span>{r.state}</span>
                    <strong>{r.count}</strong>
                  </li>
                ))}
                {!(data?.runs_by_state || []).length && (
                  <li className="status status--muted">No runs yet.</li>
                )}
              </ul>
            </article>
            <article className="panel">
              <h3>Skills by Lifecycle</h3>
              <ul className="simple-list">
                {(data?.skills_by_lifecycle || []).map((r) => (
                  <li key={r.lifecycle}>
                    <span>{r.lifecycle}</span>
                    <strong>{r.count}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>
          <p className="status status--muted">
            Last updated: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
          </p>
        </>
      )}
    </main>
  );
}

export default Dashboard;
