import { Edit3 } from 'lucide-react';
import type { ClientData } from '../../types';

type Props = {
  client: ClientData;
  onEdit?: () => void;
  showEditButton?: boolean;
};

export const ClientSummary = ({
  client,
  onEdit,
  showEditButton = false,
}: Props) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">Cliente</p>
        <h3 className="text-xl font-semibold text-slate-900">{client.nome}</h3>
      </div>
      {showEditButton && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-500 hover:text-brand-600"
        >
          <Edit3 className="h-4 w-4" />
          Editar
        </button>
      )}
    </div>
    <dl className="mt-4 grid gap-3 md:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">
          Email
        </dt>
        <dd className="text-sm font-medium text-slate-900">{client.email}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">
          Empresa
        </dt>
        <dd className="text-sm font-medium text-slate-900">{client.empresa}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">
          Telefone
        </dt>
        <dd className="text-sm font-medium text-slate-900">
          {client.telefone}
        </dd>
      </div>
      {client.cnpjCpf && (
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            CNPJ/CPF
          </dt>
          <dd className="text-sm font-medium text-slate-900">
            {client.cnpjCpf}
          </dd>
        </div>
      )}
    </dl>
  </div>
);
