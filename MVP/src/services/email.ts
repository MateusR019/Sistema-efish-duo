import emailjs from '@emailjs/browser';
import type { Budget } from '../types';
import { formatCurrency } from '../utils/format';

type Params = {
  budget: Budget;
  pdfBase64?: string;
};

export const sendBudgetEmail = async ({ budget, pdfBase64 }: Params) => {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      'Configure as variaveis VITE_EMAILJS_SERVICE_ID, TEMPLATE_ID e PUBLIC_KEY no arquivo .env',
    );
  }

  const templateParams: Record<string, unknown> = {
    order_number: budget.numeroPedido,
    order_total: formatCurrency(budget.total),
    client_name: budget.cliente.nome,
    client_email: budget.cliente.email,
    client_company: budget.cliente.empresa,
    client_phone: budget.cliente.telefone,
    client_document: budget.cliente.cnpjCpf ?? 'Nao informado',
    items: budget.itens
      .map(
        (item) =>
          `${item.produto.nome} | ${item.quantidade}x | ${formatCurrency(item.subtotal)}`,
      )
      .join('\n'),
    observations: budget.observacoes ?? 'Sem observacoes adicionais.',
  };

  if (pdfBase64) {
    templateParams.attachments = [
      {
        name: `Orcamento-${budget.numeroPedido}.pdf`,
        data: `data:application/pdf;base64,${pdfBase64}`,
      },
    ];
  }

  try {
    await emailjs.send(serviceId, templateId, templateParams, publicKey);
  } catch (error) {
    console.error('EmailJSResponseStatus', error);
    throw error;
  }
};
