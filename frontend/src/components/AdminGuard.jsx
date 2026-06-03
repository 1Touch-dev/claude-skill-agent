import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { getAdminToken } from '../lib/api';

export { getAdminToken };

function AdminGuard({ children }) {
  const location = useLocation();
  const token = getAdminToken();

  if (!token) {
    return <Redirect to={{ pathname: '/login', state: { from: location } }} />;
  }

  return <>{children}</>;
}

export default AdminGuard;
