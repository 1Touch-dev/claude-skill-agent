import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPut } from '../lib/api';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [members, setMembers] = useState([]);  // Plane workspace members
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState({});    // agentId → bool
  const [draft, setDraft] = useState({});      // agentId → selected plane_member_id

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    Promise.all([
      apiGet('/agents'),
      apiGet('/pm/members').catch(() => []),  // graceful if Plane not configured
    ])
      .then(([agentList, memberList]) => {
        const list = Array.isArray(agentList) ? agentList : [];
        setAgents(list);
        setMembers(Array.isArray(memberList) ? memberList : []);
        // Initialise draft from current mappings
        const init = {};
        list.forEach((a) => { init[a.id] = a.plane_member_id || ''; });
        setDraft(init);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveMapping(agentId) {
    setSaving((s) => ({ ...s, [agentId]: true }));
    try {
      const memberId = draft[agentId] || null;
      const member = members.find((m) => m.id === memberId);
      await apiPut(`/agents/${agentId}/plane-member`, {
        plane_member_id: memberId,
        plane_member_email: member ? member.email : null,
      });
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, plane_member_id: memberId, plane_member_email: member?.email || null }
            : a
        )
      );
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving((s) => ({ ...s, [agentId]: false }));
    }
  }

  const memberLabel = (id) => {
    if (!id) return 'Not mapped';
    const m = members.find((m) => m.id === id);
    return m ? (m.display_name || m.email) : id.slice(0, 8) + '…';
  };

  if (loading) return <main className="page"><p className="status status--muted">Loading…</p></main>;

  return (
    <main className="page">
      <div className="page__header">
        <h2>Agent Profiles</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 4 }}>
          Map agents to Plane workspace members so routed work items are auto-assigned.
        </p>
        {err && <div className="status status--error">{err}</div>}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Key</th>
              <th>Autonomy</th>
              <th>Pooled</th>
              <th>Plane Member</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 && (
              <tr><td colSpan={7} style={{ color: '#9ca3af', textAlign: 'center' }}>No agents found.</td></tr>
            )}
            {agents.map((agent) => {
              const currentId = draft[agent.id] ?? agent.plane_member_id ?? '';
              const isDirty = currentId !== (agent.plane_member_id || '');
              return (
                <tr key={agent.id}>
                  <td>{agent.id}</td>
                  <td>{agent.name}</td>
                  <td><code style={{ fontSize: '0.8rem' }}>{agent.key}</code></td>
                  <td>{agent.autonomy_level}</td>
                  <td>{agent.pooled ? 'yes' : 'no'}</td>
                  <td>
                    {members.length === 0 ? (
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        {agent.plane_member_id ? memberLabel(agent.plane_member_id) : 'Not mapped'}
                      </span>
                    ) : (
                      <select
                        value={currentId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [agent.id]: e.target.value }))
                        }
                        style={{
                          fontSize: '0.85rem',
                          padding: '3px 6px',
                          borderRadius: 4,
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          minWidth: 160,
                        }}
                      >
                        <option value="">— Not mapped —</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.display_name || m.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    {members.length > 0 && (
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={!isDirty || saving[agent.id]}
                        onClick={() => saveMapping(agent.id)}
                        style={{ fontSize: '0.8rem', padding: '3px 10px' }}
                      >
                        {saving[agent.id] ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: 12 }}>
          Plane not connected — member dropdown unavailable. Configure{' '}
          <code>PLANE_API_TOKEN</code> and restart backend to enable mapping.
        </p>
      )}
    </main>
  );
}
