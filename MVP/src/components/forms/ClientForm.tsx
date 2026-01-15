import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { ClientData } from '../../types';

type Props = {
  initialValues: ClientData;
  onSubmit: (data: ClientData) => void;
  submitLabel?: string;
};

type Errors = Partial<Record<keyof ClientData, string>>;

const defaultErrors: Errors = {};

export const ClientForm = ({
  initialValues,
  onSubmit,
  submitLabel = 'Continuar',
}: Props) => {
  const [values, setValues] = useState<ClientData>(initialValues);
  const [errors, setErrors] = useState<Errors>(defaultErrors);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: keyof ClientData, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const newErrors: Errors = {};
    if (!values.nome.trim()) newErrors.nome = 'Informe seu nome completo.';
    if (!values.email.trim()) newErrors.email = 'Informe um e-mail válido.';
    if (!values.empresa.trim())
      newErrors.empresa = 'Informe o nome da empresa.';
    if (!values.telefone.trim())
      newErrors.telefone = 'Informe um telefone para contato.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit(values);
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 bg-white';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nome completo *
          </label>
          <input
            type="text"
            value={values.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            className={inputClass}
          />
          {errors.nome && (
            <p className="text-xs text-rose-500">{errors.nome}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Email *</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass}
          />
          {errors.email && (
            <p className="text-xs text-rose-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Empresa *
          </label>
          <input
            type="text"
            value={values.empresa}
            onChange={(e) => handleChange('empresa', e.target.value)}
            className={inputClass}
          />
          {errors.empresa && (
            <p className="text-xs text-rose-500">{errors.empresa}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Telefone *
          </label>
          <input
            type="tel"
            value={values.telefone}
            onChange={(e) => handleChange('telefone', e.target.value)}
            className={inputClass}
          />
          {errors.telefone && (
            <p className="text-xs text-rose-500">{errors.telefone}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            CNPJ/CPF (opcional)
          </label>
          <input
            type="text"
            value={values.cnpjCpf ?? ''}
            onChange={(e) => handleChange('cnpjCpf', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {submitLabel}
      </button>
    </form>
  );
};
