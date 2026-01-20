// Define as rotas e o layout principal do app.
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/layout/AdminRoute';
import { BackButton } from './components/layout/BackButton';
import { ProfilePage } from './pages/ProfilePage';
import { CatalogPage } from './pages/CatalogPage';
import { ReviewPage } from './pages/ReviewPage';
import { AuthPage } from './pages/AuthPage';
import { AddProductPage } from './pages/AddProductPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { RegistrationsPage } from './pages/RegistrationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { useAppContext } from './context/AppContext';

function App() {
  const location = useLocation();
  const { isAuthenticated, isApproved } = useAppContext();
  const isDashboardRoute = location.pathname.endsWith('/dashboard');
  const showBackButton = !['/auth', '/catalogo', '/cadastro-analise'].includes(
    location.pathname,
  );

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {!isDashboardRoute && <Header />}
      <main
        className={
          isDashboardRoute
            ? 'min-h-screen'
            : 'mx-auto max-w-6xl space-y-6 px-4 py-8'
        }
      >
        {!isDashboardRoute && showBackButton && (
          <div className="flex justify-start">
            <BackButton />
          </div>
        )}
        {isDashboardRoute ? (
          <Routes>
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    isAuthenticated
                      ? isApproved
                        ? '/catalogo'
                        : '/cadastro-analise'
                      : '/auth'
                  }
                  replace
                />
              }
            />
          </Routes>
        ) : (
          <section
            className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-card ${
              location.pathname === '/auth' ? 'mx-auto max-w-3xl' : ''
            }`}
          >
            <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/cadastro-analise" element={<PendingApprovalPage />} />
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    isAuthenticated
                      ? isApproved
                        ? '/catalogo'
                        : '/cadastro-analise'
                      : '/auth'
                  }
                  replace
                />
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalogo"
              element={
                <ProtectedRoute>
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resumo"
              element={
                <ProtectedRoute>
                  <ReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos/novo"
              element={
                <AdminRoute>
                  <AddProductPage />
                </AdminRoute>
              }
            />
            <Route
              path="/produtos/editar/:id"
              element={
                <AdminRoute>
                  <AddProductPage />
                </AdminRoute>
              }
            />
            <Route
              path="/cadastros"
              element={
                <AdminRoute>
                  <RegistrationsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <DashboardPage />
                </AdminRoute>
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    isAuthenticated
                      ? isApproved
                        ? '/catalogo'
                        : '/cadastro-analise'
                      : '/auth'
                  }
                  replace
                />
              }
            />
            </Routes>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
