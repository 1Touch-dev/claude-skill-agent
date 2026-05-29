import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

export default function Reports(){
  const [credits, setCredits] = useState({ by_day:[], total:0 });
  const [adoption, setAdoption] = useState({ suites:[], overlays:[] });
  const [agents, setAgents] = useState({ byAgent:[] });
  const [gov, setGov] = useState({});
  const [billing, setBilling] = useState({ monthly:[] });
  const [err, setErr] = useState('');

  useEffect(()=>{
    Promise.all([
      apiGet('/reports/credits/summary'),
      apiGet('/reports/adoption'),
      apiGet('/reports/agents/utilization'),
      apiGet('/reports/governance'),
      apiGet('/reports/billing')
    ]).then(([c,a,ag,g,b])=>{ setCredits(c); setAdoption(a); setAgents(ag); setGov(g); setBilling(b); })
      .catch(e=>setErr(String(e)));
  },[]);

  return (
    <div style={{ padding:20 }}>
      <h2>Reporting & Analytics</h2>
      {err && <div style={{ color:'red' }}>{err}</div>}
      <section>
        <h3>Credit Consumption (30d)</h3>
        <div>Total: {credits.total}</div>
        <ul>
          {credits.by_day.map((d,i)=> <li key={i}>{d.day}: {d.credits}</li>)}
        </ul>
      </section>
      <section>
        <h3>Adoption</h3>
        <div>Top Suites</div>
        <ul>{adoption.suites.map((s,i)=><li key={i}>suite {s.suite_id}: {s.workspaces} workspaces</li>)}</ul>
        <div>Top Overlays</div>
        <ul>{adoption.overlays.map((o,i)=><li key={i}>overlay {o.overlay_id}: {o.workspaces} workspaces</li>)}</ul>
      </section>
      <section>
        <h3>Agent Utilization</h3>
        <table border="1" cellPadding="6"><thead><tr><th>Agent</th><th>Runs</th><th>Success %</th></tr></thead>
          <tbody>{agents.byAgent.map((a,i)=>(<tr key={i}><td>{a.agent_id}</td><td>{a.runs}</td><td>{a.success_rate}</td></tr>))}</tbody>
        </table>
      </section>
      <section>
        <h3>Governance (Approvals)</h3>
        <div>Required: {gov.approval_required || 0}, Granted: {gov.approval_granted || 0}, Denied: {gov.approval_denied || 0}</div>
      </section>
      <section>
        <h3>Billing (Monthly Usage)</h3>
        <table border="1" cellPadding="6"><thead><tr><th>Month</th><th>Workspace</th><th>Customer</th><th>Credits</th></tr></thead>
          <tbody>{billing.monthly.map((m,i)=>(<tr key={i}><td>{m.month}</td><td>{m.workspace_id}</td><td>{m.customer_id}</td><td>{m.credits}</td></tr>))}</tbody>
        </table>
      </section>
    </div>
  );
}
