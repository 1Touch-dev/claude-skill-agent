import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Nav() {
  const links = [
    ['/', 'Dashboard', true],
    ['/skills', 'Skills'],
    ['/packages', 'Packages'],
    ['/suites', 'Suites'],
    ['/overlays', 'Overlays'],
    ['/customers', 'Customers'],
    ['/workspaces', 'Workspaces'],
    ['/entitlements', 'Entitlements'],
    ['/credit-pools', 'Credit Pools'],
    ['/agents', 'Agents'],
    ['/runs', 'Runs'],
    ['/tasks', 'Tasks'],
    ['/routing', 'Routing Demo'],
    ['/approvals', 'Approvals'],
    ['/integrations', 'Integrations'],
    ['/audit', 'Audit Logs'],
    ['/reports', 'Reports'],
  ];

  return (
    <nav className="app-nav">
      {links.map(([to, label, exact]) => (
        <NavLink
          key={to}
          to={to}
          exact={!!exact}
          className="app-nav__link"
          activeClassName="app-nav__link--active"
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
