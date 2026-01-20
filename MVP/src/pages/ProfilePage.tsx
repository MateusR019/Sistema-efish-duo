// Perfil do usuario autenticado.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientForm } from '../components/forms/ClientForm';
import { ClientSummary } from '../components/summary/ClientSummary';
import { useAppContext } from '../context/AppContext';
import { clientIsComplete } from '../utils/format';

export const ProfilePage = () => {
  const { client, updateClient } = useAppContext();
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (data: typeof client) => {
    updateClient(data);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Perfil do cliente
          </h2>
          <p className="text-sm text-slate-500">
            Revise os dados antes de seguir para o catálogo. Você pode editá-los
            a qualquer momento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/catalogo')}
          disabled={!clientIsComplete(client)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Ir para o catálogo
        </button>
      </div>

      <ClientSummary
        client={client}
        showEditButton={!editing}
        onEdit={() => setEditing(true)}
      />

      {editing && (
        <div className="rounded-2xl border border-dashed border-brand-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Atualizar informações
          </h3>
          <p className="text-sm text-slate-500">
            As alterações são salvas automaticamente ao enviar o formulário.
          </p>
          <div className="mt-4">
            <ClientForm
              initialValues={client}
              onSubmit={handleSubmit}
              submitLabel="Salvar alterações"
            />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
