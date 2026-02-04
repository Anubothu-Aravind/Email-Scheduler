import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactElement } from 'react';

export const RequireAuth = ({ children }: { children: ReactElement }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};