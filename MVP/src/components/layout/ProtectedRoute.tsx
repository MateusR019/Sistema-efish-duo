// Protege rotas que exigem login.
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, authReady, isApproved } = useAppContext();
  const location = useLocation();

  if (!authReady) {
    return <div className="text-sm text-slate-500">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isApproved) {
    return <Navigate to="/cadastro-analise" replace />;
  }

  return children;
};
