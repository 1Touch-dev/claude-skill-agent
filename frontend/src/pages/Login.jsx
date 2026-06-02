import React, { useState } from 'react';
import { Redirect, useLocation } from 'react-router-dom';

const TOKEN_KEY = 'admin_token';

function Login() {
  const location = useLocation();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  if (localStorage.getItem(TOKEN_KEY)) {
    const from = location.state?.from?.pathname || '/';
    return <Redirect to={from} />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!token.trim()) {
      setError('Enter the admin token from your .env file (ADMIN_TOKEN).');
      return;
    }
    localStorage.setItem(TOKEN_KEY, token.trim());
    window.location.href = location.state?.from?.pathname || '/';
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-card__eyebrow">Admin Access</p>
        <h2>Sign in to the control plane</h2>
        <p className="status status--muted">
          Use the <code>ADMIN_TOKEN</code> value from <code>.env</code> (default: <code>changeme</code>).
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="token">Admin token</label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="field-input"
            autoComplete="off"
          />
          {error && <p className="status status--error">{error}</p>}
          <button type="submit" className="btn-primary">Sign in</button>
        </form>
      </section>
      <section className="login-side">
        <h3>Enterprise Claude Skills Platform</h3>
        <p>
          Manage skill catalog governance, customer entitlements, agent operations, approvals, and reporting with a
          single enterprise control plane.
        </p>
      </section>
    </main>
  );
}

export default Login;
