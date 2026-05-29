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
    <main style={{ maxWidth: 420, margin: '2rem auto', padding: '0 1rem' }}>
      <h2>Admin sign in</h2>
      <p>Use the <code>ADMIN_TOKEN</code> value from <code>.env</code> (default: <code>changeme</code>).</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="token">Admin token</label>
        <input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ display: 'block', width: '100%', margin: '0.5rem 0 1rem', padding: '0.5rem' }}
          autoComplete="off"
        />
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}

export default Login;
