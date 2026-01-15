import fetch from 'node-fetch';
import type { QuoteRecord } from '../types';

const BLING_API_URL = process.env.BLING_API_URL ?? 'https://bling.com.br/Api/v3/pedidos';
const BLING_API_TOKEN = process.env.BLING_API_TOKEN;

export const sendOrderToBling = async (quote: QuoteRecord) => {
  if (!BLING_API_TOKEN) {
    throw new Error('Defina BLING_API_TOKEN no backend para enviar pedidos ao Bling.');
  }

  const payload = {
    numero: quote.orderNumber ?? quote.id,
    cliente: {
      nome: quote.clientName,
      razaoSocial: quote.clientCompany,
      tipoPessoa: quote.clientDocument ? 'J' : 'F',
      cpf_cnpj: quote.clientDocument,
      email: quote.clientEmail,
      telefone: quote.clientPhone,
    },
    itens: quote.items.map((item) => ({
      codigo: item.productId ?? item.productName,
      descricao: item.productName,
      quantidade: item.quantity,
      valor: (item.unitCents ?? 0) / 100,
    })),
    observacoes: quote.observations,
  };

  const response = await fetch(BLING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BLING_API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao enviar para Bling: ${response.status} - ${text}`);
  }

  return response.json();
};
