import React from 'react';

function Dashboard() {
  return (
    <main className="page">
      <div className="page__header">
        <h2>Dashboard</h2>
        <p>Welcome to the Enterprise Claude Skills Platform admin dashboard.</p>
      </div>
      <section className="stats-grid">
        <article className="stat-card">
          <h3>Catalog Governance</h3>
          <p>Manage skills, packages, suites, and overlays with enterprise controls.</p>
        </article>
        <article className="stat-card">
          <h3>Commercial Operations</h3>
          <p>Track customers, workspaces, entitlements, and credit pools in one place.</p>
        </article>
        <article className="stat-card">
          <h3>Execution Monitoring</h3>
          <p>Inspect runs, approvals, audit logs, integrations, and reporting pipelines.</p>
        </article>
      </section>
    </main>
  );
}

export default Dashboard;