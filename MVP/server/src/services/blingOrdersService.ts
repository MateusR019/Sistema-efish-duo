// Envio de pedidos para o Bling.
import type { QuoteRecord } from '../types';
import { blingApiFetch, blingApiPost } from './blingService';

const normalizeDoc = (value?: string) =>
  String(value || '')
    .replace(/\D/g, '')
    .trim();

type BlingApiResponse = {
  data?: {
    id?: number | string;
    nome?: string;
    data?: any[];
  };
};

const resolveBlingContact = async (quote: QuoteRecord) => {
  const doc = normalizeDoc(quote.clientDocument);
  const nome = quote.clientName || 'Cliente';
  const email = quote.clientEmail || '';
  const params: Record<string, string | number> = { pagina: 1, limite: 1 };
  if (doc) {
    params.numeroDocumento = doc;
  } else if (email) {
    params.email = email;
  } else if (nome) {
    params.nome = nome;
  }
  try {
    const response = (await blingApiFetch(
      '/contatos',
      params,
    )) as BlingApiResponse;
    const found = Array.isArray(response?.data?.data)
      ? response.data.data?.[0]
      : null;
    if (found?.id) {
      return { id: Number(found.id), nome: String(found.nome || nome) };
    }
  } catch {
    // ignora falhas de busca
  }

  const payload = {
    nome,
    tipoPessoa: doc.length === 14 ? 'J' : 'F',
    numeroDocumento: doc || undefined,
    email: email || undefined,
    telefone: quote.clientPhone || undefined,
  };
  const created = (await blingApiPost(
    '/contatos',
    payload,
  )) as BlingApiResponse;
  const createdId = created?.data?.id ? Number(created.data.id) : null;
  if (!createdId) {
    throw new Error('Contato do Bling nao encontrado nem criado.');
  }
  return { id: createdId, nome: String(created?.data?.nome || nome) };
};

const buildBlingOrderPayload = async (quote: QuoteRecord) => {
  if (!quote.clientName) {
    throw new Error('Cliente nao informado para o pedido.');
  }
  if (!quote.items.length) {
    throw new Error('Itens do pedido nao informados.');
  }
  const today = new Date().toISOString().slice(0, 10);
  const contato = await resolveBlingContact(quote);
  const itens = quote.items.map((item, index) => ({
    codigo: String(item.productId || `ITEM-${index + 1}`),
    descricao: String(item.productName || `Item ${index + 1}`),
    quantidade: Number(item.quantity || 0),
    valor: Number(item.unitCents || 0) / 100,
    valorLista: Number(item.unitCents || 0) / 100,
  }));

  const formaPagamentoId = Number(process.env.BLING_FORMA_PAGAMENTO_ID);
  const parcelas = Number.isFinite(formaPagamentoId)
    ? [
        {
          id: 0,
          dataVencimento: today,
          valor: Number(quote.totalCents || 0) / 100,
          formaPagamento: { id: formaPagamentoId },
        },
      ]
    : undefined;

  return {
    numeroLoja: quote.orderNumber,
    data: today,
    dataSaida: today,
    dataPrevista: today,
    contato,
    itens,
    ...(parcelas ? { parcelas } : {}),
    observacoes: quote.observations || '',
  };
};

export const sendOrderToBling = async (quote: QuoteRecord) => {
  const payload = await buildBlingOrderPayload(quote);
  return blingApiPost('/pedidos/vendas', payload) as Promise<BlingApiResponse>;
};
