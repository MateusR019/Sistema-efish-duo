// Tela de login e cadastro de usuarios.
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

type Mode = 'login' | 'register';

export const AuthPage = () => {
  const { login, registerUser } = useAppContext();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/catalogo';

  const resetMessages = () => {
    setFeedback(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Informe seu nome completo.');
          return;
        }
        const normalizedCnpj = cnpj.replace(/\D/g, '');
        if (!normalizedCnpj || normalizedCnpj.length !== 14) {
          setError('Informe um CNPJ valido.');
          return;
        }
        if (password !== confirmPassword) {
          setError('As senhas não conferem.');
          return;
        }
        const result = await registerUser({
          nome: name,
          email,
          password,
          cnpj: normalizedCnpj,
        });
        if (!result.success) {
          setError(result.message ?? 'Não foi possível cadastrar.');
          return;
        }
        setFeedback('Cadastro realizado com sucesso!');
        navigate('/cadastro-analise', { replace: true });
      } else {
        const result = await login({ email, password });
        if (!result.success) {
          setError(result.message ?? 'Login inválido.');
          return;
        }
        setFeedback('Login realizado. Redirecionando...');
        navigate(redirectTo, { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-card">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-600">
          Acesso restrito
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {mode === 'login' ? 'Entre' : 'Crie sua conta'}
        </h1>
        <p className="text-sm text-slate-500">
          {mode === 'login'
            ? 'Informe suas credenciais para liberar o catálogo de orçamento.'
            : 'Cadastre-se rapidamente para começar a gerar orçamentos.'}
        </p>
      </div>

      <div className="mb-4 flex rounded-full bg-slate-100 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            resetMessages();
          }}
          className={`flex-1 rounded-full py-2 ${
            mode === 'login'
              ? 'bg-white text-brand-600 shadow'
              : 'text-slate-500'
          }`}
        >
          Já tenho conta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            resetMessages();
          }}
          className={`flex-1 rounded-full py-2 ${
            mode === 'register'
              ? 'bg-white text-brand-600 shadow'
              : 'text-slate-500'
          }`}
        >
          Quero me cadastrar
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div>
            <label className="text-sm font-medium text-slate-700">
              Nome completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        )}
        {mode === 'register' && (
          <div>
            <label className="text-sm font-medium text-slate-700">CNPJ</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="00.000.000/0000-00"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            required
          />
        </div>
        {mode === 'register' && (
          <div>
            <label className="text-sm font-medium text-slate-700">
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              required
            />
          </div>
        )}

        {(feedback || error) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error ?? feedback}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? 'Processando...'
            : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
        </button>
      </form>
    </div>
  );
};


