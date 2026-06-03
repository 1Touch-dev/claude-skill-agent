import React, { useState } from 'react';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { getAdminToken, setAdminSession } from '../lib/api';

const ROLES = [
  { id: 'admin', label: 'Admin', hint: 'Full control-plane access' },
  { id: 'operator', label: 'Operator', hint: 'Manage runs, approvals, integrations' },
  { id: 'viewer', label: 'Viewer', hint: 'Read-only operational visibility' },
];

const FEATURES = [
  'Skill registry & lifecycle governance',
  'Agent profiles, runs, and routing',
  'Approvals, audit logs, and compliance',
  'Integrations registry & health checks',
];

function Login() {
  const location = useLocation();
  const history = useHistory();
  const [token, setToken] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getAdminToken()) {
    const from = location.state?.from?.pathname || '/';
    return <Redirect to={from} />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!token.trim()) {
      setError('Enter your organization admin token to continue.');
      return;
    }
    setError('');
    setSubmitting(true);
    setAdminSession(token.trim(), role);
    const dest = location.state?.from?.pathname || '/';
    history.replace(dest);
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Product overview">
        <div className="login-brand__inner">
          <div className="login-brand__mark" aria-hidden="true">
            ECS
          </div>
          <p className="login-brand__eyebrow">Enterprise Claude Skills Platform</p>
          <h1 className="login-brand__title">Multi-tenant AI Control Plane</h1>
          <p className="login-brand__tagline">
            Govern Skills • Agents • Approvals • Integrations • Governance
          </p>
          <ul className="login-brand__features">
            {FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="login-brand__footer">
            Secure enterprise operations console for licensing, metering, routing, and audit.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <header className="login-card__header">
            <h2>Sign in</h2>
            <p>Authenticate with your workspace admin token.</p>
          </header>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="token">Admin token</label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (error) setError('');
                }}
                className="login-input"
                placeholder="Enter ADMIN_TOKEN"
                autoComplete="current-password"
                disabled={submitting}
              />
              <span className="login-field__hint">
                Use the <code>ADMIN_TOKEN</code> from your environment (default: <code>changeme</code>).
              </span>
            </div>

            <fieldset className="login-roles">
              <legend>Access role</legend>
              <div className="login-roles__grid" role="radiogroup" aria-label="Access role">
                {ROLES.map((r) => (
                  <label
                    key={r.id}
                    className={`login-role ${role === r.id ? 'login-role--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={role === r.id}
                      onChange={() => setRole(r.id)}
                      disabled={submitting}
                    />
                    <span className="login-role__label">{r.label}</span>
                    <span className="login-role__hint">{r.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="login-alert login-alert--error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Continue to control plane'}
            </button>
          </form>

          <p className="login-card__legal">
            MVP authentication — bearer token session. Enterprise SSO planned for production.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
