import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';

const TOKEN_KEY = 'admin_token';

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function AdminGuard({ children }) {
  const location = useLocation();
  const token = getAdminToken();

  if (!token) {
    return <Redirect to={{ pathname: '/login', state: { from: location } }} />;
  }

  return <>{children}</>;
}

export default AdminGuard;
