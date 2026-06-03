import React, { useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

export default function RoutingDemo() {
  const [tasks, setTasks] = useState([]);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    workspace_id: 2,
    title: 'MVP routing demo task',
    description: 'Demonstrate task intake and agent routing',
    skill_key: 'cs_response_helper',
    risk_tier: 1,
  });

  async function loadTasks() {
    try {
      const data = await apiGet('/tasks');
      setTasks(Array.isArray(data) ? data.slice(0, 8) : []);
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
      setMsg(`Task #${taskId} routed to agent ${route.agent_name || route.agent_id}.`);
      loadTasks();
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.title}</td>
                  <td>{t.status}</td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => routeTask(t.id)}>
                      Route & Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result && (
        <section className="panel">
          <h3>Last Routing Result</h3>
          <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
