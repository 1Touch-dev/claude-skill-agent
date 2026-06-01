import React from 'react';
import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <nav className="nav">
      <Link to="/">Dashboard</Link>
      <Link to="/skills">Skills</Link>
      <Link to="/packages">Packages</Link>
      <Link to="/suites">Suites</Link>
      <Link to="/overlays">Overlays</Link>
      <Link to="/customers">Customers</Link>
      <Link to="/workspaces">Workspaces</Link>
      <Link to="/entitlements">Entitlements</Link>
      <Link to="/credit-pools">Credit Pools</Link>
      <Link to="/agents">Agents</Link>
      <Link to="/runs">Runs</Link>
      <Link to="/approvals">Approvals</Link>
      <Link to="/integrations">Integrations</Link>
      <Link to="/audit">Audit Logs</Link>
      <Link to="/reports">Reports</Link>
    </nav>
  );
}
