import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const AdminRoute = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, isAdmin } = useAppContext();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/catalogo" replace />;
  }

  return children;
};
