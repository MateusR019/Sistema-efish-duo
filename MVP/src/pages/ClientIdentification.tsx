// Coleta dados do cliente para o pedido.
import { useNavigate } from 'react-router-dom';
import { ClientForm } from '../components/forms/ClientForm';
import { useAppContext } from '../context/AppContext';

export const ClientIdentification = () => {
  const { client, updateClient } = useAppContext();
  const navigate = useNavigate();

  const handleSubmit = (data: typeof client) => {
    updateClient(data);
    navigate('/perfil');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          Identificação do cliente
        </h2>
        <p className="text-sm text-slate-500">
          Precisamos dos seus dados básicos para gerar o orçamento e enviar o
          PDF finalizado.
        </p>
      </div>

      <ClientForm
        initialValues={client}
        onSubmit={handleSubmit}
        submitLabel="Salvar e continuar"
      />
    </div>
  );
};
