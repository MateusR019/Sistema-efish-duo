// Tela exibida quando o cadastro esta em analise.
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { formatDocument } from '../utils/format';

export const PendingApprovalPage = () => {
  const { authReady, isAuthenticated, isApproved, currentUser, logout } =
    useAppContext();
  const isRejected = currentUser?.status === 'REJECTED';

  if (!authReady) {
    return <div className="text-sm text-slate-500">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isApproved) {
    return <Navigate to="/catalogo" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-brand-600">
          Cadastro
        </p>
        <h2 className="text-3xl font-semibold text-slate-900">
          {isRejected ? 'Cadastro recusado' : 'Cadastro em analise'}
        </h2>
        <p className="text-sm text-slate-500">
          {isRejected
            ? 'Seu cadastro foi recusado. Entre em contato com o suporte caso queira reenviar os dados.'
            : 'Seu cadastro foi recebido e esta em analise. Assim que for aprovado, voce podera acessar o catalogo.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Dados enviados
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {currentUser?.nome ?? 'Usuario'}
        </p>
        <p className="text-sm text-slate-600">{currentUser?.email}</p>
        {currentUser?.cnpjCpf && (
          <p className="text-sm text-slate-600">
            CNPJ: {formatDocument(currentUser.cnpjCpf)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {!isRejected && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
          >
            Atualizar status
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Sair
        </button>
      </div>
    </div>
  );
};
