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
    <div style={{ padding:20 }}>
      <h2>Audit Logs</h2>
      <div>
        <input placeholder="Run ID" value={runId} onChange={e=>setRunId(e.target.value)} />
        <button onClick={load}>Load</button>
      </div>
      {err && <div style={{ color:'red' }}>{err}</div>}
      <ul>
        {logs.map((l,i)=> <li key={i}>{l.event_at}: {l.event_type} — {JSON.stringify(l.data)}</li>)}
      </ul>
    </div>
  );
}
