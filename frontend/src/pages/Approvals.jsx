import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

export default function Approvals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    apiGet('/approvals')
      .then(setRows)
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function decide(id, decision) {
    setBusyId(id);
    setMsg('');
    try {
      await apiPost(`/approvals/${id}/decide`, {
        decision,
        decided_by: 'mvp-operator',
        reason: decision === 'approved' ? 'MVP approval granted' : 'MVP approval rejected',
      });
      setMsg(`Approval #${id} ${decision}.`);
      load();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="page">
      <div className="page__header">
        <h2>Approval Queue</h2>
        <p>Review and decide high-risk skill runs. Decisions update run state and audit logs.</p>
      </div>
      {err && <div className="status status--error">{err}</div>}
      {msg && <div className="status status--muted">{msg}</div>}
      {loading ? (
        <p className="status status--muted">Loading approvals…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Run</th>
                <th>Skill</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.run_id}</td>
                  <td>{r.skill_name || '—'}</td>
                  <td>
                    <span className={`badge badge--${r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warn' : 'muted'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : '—'}</td>
                  <td className="actions-cell">
                    {r.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="status status--muted">Decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="status status--muted">No approval gates.</p>}
        </div>
      )}
    </main>
  );
}
