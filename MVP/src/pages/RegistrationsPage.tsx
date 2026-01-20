// Lista de cadastros pendentes para admins.
import { useEffect, useState } from 'react';
import {
  approveRegistration,
  fetchPendingRegistrations,
  rejectRegistration,
  type PendingRegistration,
} from '../services/registrationsService';
import { formatDateTime, formatDocument } from '../utils/format';

export const RegistrationsPage = () => {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const data = await fetchPendingRegistrations();
      setRegistrations(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel carregar os cadastros pendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await approveRegistration(id);
      setRegistrations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel aprovar este cadastro.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await rejectRegistration(id);
      setRegistrations((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel rejeitar este cadastro.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Cadastros
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Pedidos de cadastro
          </h2>
          <p className="text-sm text-slate-600">
            Aprove ou recuse o acesso de novos usuarios.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRegistrations}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
        >
          Atualizar lista
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Carregando cadastros...
        </div>
      ) : registrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          Nenhum cadastro pendente no momento.
        </div>
      ) : (
        <div className="grid gap-4">
          {registrations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {item.nome}
                  </p>
                  <p className="text-sm text-slate-600">{item.email}</p>
                  {item.cnpj && (
                    <p className="text-sm text-slate-600">
                      CNPJ: {formatDocument(item.cnpj)}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Enviado em {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    disabled={actionId === item.id}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-200"
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    disabled={actionId === item.id}
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Negar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
