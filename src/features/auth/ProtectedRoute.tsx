import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Skeleton } from '../../shared/ui';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  // FE-002: Three states ('loading' | 'authenticated' | 'unauthenticated') prevent login screen flash on F5
  if (status === 'loading') {
    return (
      <div className="container" style={{ padding: 'var(--space-10) var(--space-4)' }}>
        <Skeleton height="2.5rem" width="300px" style={{ marginBottom: 'var(--space-6)' }} />
        <Skeleton height="240px" width="100%" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
};
