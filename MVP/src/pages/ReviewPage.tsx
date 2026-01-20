// Resumo final do pedido antes de enviar.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientSummary } from '../components/summary/ClientSummary';
import { OrderItemsTable } from '../components/summary/OrderItemsTable';
import { useAppContext } from '../context/AppContext';
import { companyInfo } from '../config/company';
import { createBudgetPdf, downloadBudgetPdf } from '../services/pdf';
import { sendBudgetEmail } from '../services/email';
import { sendOrderToBling } from '../services/bling';
import { formatDateTime, generateOrderNumber } from '../utils/format';
import type { Budget } from '../types';

export const ReviewPage = () => {
  const {
    client,
    cartItems,
    total,
    observacoes,
    setObservacoes,
    resetAll,
  } = useAppContext();
  const navigate = useNavigate();
  const [orderNumber] = useState(generateOrderNumber);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingBling, setLoadingBling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const budget = useMemo<Budget>(
    () => ({
      numeroPedido: orderNumber,
      data: new Date().toISOString(),
      cliente: client,
      itens: cartItems.map((item) => ({
        produto: item.product,
        quantidade: item.quantity,
        subtotal: item.subtotal,
      })),
      observacoes,
      total,
    }),
    [orderNumber, client, cartItems, observacoes, total],
  );

  const handleDownloadPdf = async () => {
    try {
      setLoadingPdf(true);
      await downloadBudgetPdf({ budget, company: companyInfo });
      setFeedback('PDF gerado com sucesso.');
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Nao foi possivel gerar o PDF.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setLoadingEmail(true);
      setFeedback(null);
      setError(null);

      const doc = await createBudgetPdf({ budget, company: companyInfo });
      const pdfDataUri = doc.output('datauristring');
      const base64 = pdfDataUri.split(',')[1];

      await sendBudgetEmail({ budget, pdfBase64: base64 });

      setFeedback('Pedido enviado com sucesso! Voce recebera um e-mail em instantes.');
      resetAll();
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        'Nao foi possivel enviar o pedido automaticamente. Verifique EmailJS.',
      );
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleSendToBling = async () => {
    try {
      setLoadingBling(true);
      setFeedback(null);
      setError(null);

      await sendOrderToBling(budget);

      setFeedback('Pedido enviado para aprovacao do administrador.');
      resetAll();
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        'Nao foi possivel enviar o pedido para aprovacao. Verifique o servidor.',
      );
    } finally {
      setLoadingBling(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-semibold text-slate-900">
          Nenhum item no orcamento
        </h2>
        <p className="text-sm text-slate-500">
          Adicione servicos no catalogo antes de gerar o PDF ou enviar o pedido.
        </p>
        <button
          type="button"
          onClick={() => navigate('/catalogo')}
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Ir para o catalogo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Revisar e finalizar</h2>
          <p className="text-sm text-slate-500">
            Confira os dados antes de gerar o PDF ou enviar o pedido.
          </p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Numero do pedido: {orderNumber}</p>
          <p>Gerado em: {formatDateTime(new Date())}</p>
        </div>
      </div>

      <ClientSummary client={client} />

      <OrderItemsTable items={cartItems} total={total} />

      <div>
        <label className="text-sm font-medium text-slate-700">
          Observacoes adicionais (opcional)
        </label>
        <textarea
          value={observacoes}
          onChange={(event) => setObservacoes(event.target.value)}
          placeholder="Ex: prazo desejado, condicoes especiais, etc."
          className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

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

      <div className="flex flex-col gap-3 md:flex-row md:justify-end flex-wrap">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loadingPdf}
          className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
        </button>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={loadingEmail}
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loadingEmail ? 'Enviando e-mail...' : 'Enviar por e-mail'}
          </button>
          <button
            type="button"
            onClick={handleSendToBling}
            disabled={loadingBling}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loadingBling ? 'Enviando para aprovacao...' : 'Enviar para aprovacao'}
          </button>
        </div>
      </div>
    </div>
  );
};
