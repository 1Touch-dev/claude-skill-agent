import React from 'react';
import { useHistory } from 'react-router-dom';
import { clearAdminSession, getAdminRole } from '../lib/api';

function Header() {
  const history = useHistory();
  const role = getAdminRole();

  function logout() {
    clearAdminSession();
    history.push('/login');
  }

  return (
    <header className="app-header">
      <p className="app-header__eyebrow">Control Plane</p>
      <h1 className="app-header__title">Enterprise Claude Skills</h1>
      <p className="app-header__subtitle">Governance, metering, approvals, and operations</p>
      <div className="app-header__actions">
        <span className="badge badge--info">Role: {role}</span>
        <button type="button" className="btn-secondary btn-small" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}

export default Header;
