// Cabecalho global com navegaÁ„o e status do usuario.
import { LogOut, PlusCircle, Settings, Shield, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const Header = () => {
  const {
    isAuthenticated,
    currentUser,
    logout,
    isAdmin,
    cartItems,
    isApproved,
  } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const onProductsPage = location.pathname === '/produtos/novo';
  const onRegistrationsPage = location.pathname === '/cadastros';
  const onCatalogPage = location.pathname === '/catalogo';
  const dashboardPath = location.pathname.startsWith('/efish')
    ? '/efish/dashboard'
    : '/dashboard';
  const showMobileCheckout =
    isAuthenticated && onCatalogPage && cartItems.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <header className="border-b border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="h-1 w-full bg-brand-500" />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-black">
        <div className="flex items-center gap-4">
          <img
            src="/duo-logo.png"
            alt="Logo DUO"
            className="h-14 w-auto"
          />
          <div className="hidden text-left md:block">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              Sistema de or√ßamentos
            </p>
            <p className="text-sm font-semibold text-slate-900">
              DUO INTERNATIONAL
            </p>
          </div>
        </div>
      </div>
      {showMobileCheckout && (
        <Link
          to="/resumo"
          className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg md:hidden"
        >
          Finalizar pedido
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white">
            {cartItems.length}
          </span>
        </Link>
      )}
      {isAuthenticated && (
        <div className="border-t border-slate-200 bg-white text-sm text-slate-700 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Usu√°rio autenticado
              </p>
              <p className="font-semibold text-slate-900">
                {currentUser?.nome ?? currentUser?.email}
              </p>
              <p className="text-xs text-slate-500">{currentUser?.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/perfil"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  location.pathname === '/perfil'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600'
                }`}
                title="Perfil"
              >
                <Settings className="h-4 w-4" />
              </Link>
              {isAdmin && isApproved && (
                <Link
                  to="/cadastros"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold transition ${
                    onRegistrationsPage
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:text-brand-600'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Cadastros
                </Link>
              )}
              {isAdmin && isApproved && (
                <a
                  href={dashboardPath}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:border-brand-500 hover:text-brand-600"
                >
                  Dashboard
                </a>
              )}
              {isAdmin && (
                <Link
                  to="/produtos/novo"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold transition ${
                    onProductsPage
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:text-brand-600'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar produto
                </Link>
              )}
              {!isAdmin && (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <Shield className="h-4 w-4 text-slate-500" />
                  Acesso comum
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 font-semibold text-white transition hover:bg-brand-600"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
