import React, { useState } from 'react';
import { apiGet } from '../lib/api';

export default function Audit(){
  const [runId, setRunId] = useState('');
  const [logs, setLogs] = useState([]);
  const [err, setErr] = useState('');
  const load = () => {
    if (!runId) return; setErr(''); setLogs([]);
    apiGet(`/runs/${runId}/audit`).then(setLogs).catch(e=>setErr(String(e)));
  };
  return (
    <main className="page">
      <div className="page__header">
        <h2>Audit Logs</h2>
      </div>
      <section className="panel">
        <div className="row-inline">
          <input className="field-input" placeholder="Run ID" value={runId} onChange={e=>setRunId(e.target.value)} />
          <button className="btn-primary" onClick={load}>Load</button>
        </div>
        {err && <div className="status status--error">{err}</div>}
        <ul className="audit-list">
          {logs.map((l,i)=> <li key={i}>{l.event_at}: {l.event_type} — {JSON.stringify(l.data)}</li>)}
        </ul>
      </section>
    </main>
  );
}
