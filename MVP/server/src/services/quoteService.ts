// Servicos de orcamento e pedido.
import { readDatabase, updateDatabase } from '../data/database';
import type { QuoteInput, QuoteItemRecord, QuoteRecord } from '../types';
import { generateId, generateOrderNumber, nowIso } from '../utils/helpers';

export const listQuotes = async (): Promise<QuoteRecord[]> => {
  const db = await readDatabase();
  return db.quotes;
};

export const getQuoteById = async (id: string) => {
  const db = await readDatabase();
  return db.quotes.find((quote) => quote.id === id) ?? null;
};

export const updateQuoteStatus = async (
  id: string,
  status: QuoteRecord['status'],
): Promise<QuoteRecord | null> => {
  return updateDatabase((db) => {
    const index = db.quotes.findIndex((quote) => quote.id === id);
    if (index === -1) return null;
    const current = db.quotes[index];
    if (!current) return null;
    const updated: QuoteRecord = {
      ...current,
      status,
      updatedAt: nowIso(),
    };
    db.quotes[index] = updated;
    return updated;
  });
};

export const createQuote = async (
  input: QuoteInput,
  createdById?: string,
): Promise<QuoteRecord> => {
  return updateDatabase((db) => {
    const now = nowIso();
    const items = input.items.map<QuoteItemRecord>((item) => ({
      id: generateId(),
      quoteId: '',
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitCents: item.unitCents,
      subtotalCents: item.unitCents * item.quantity,
      createdAt: now,
    }));
    const totalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);

    const quote: QuoteRecord = {
      id: generateId(),
      orderNumber: generateOrderNumber(),
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientCompany: input.clientCompany,
      clientPhone: input.clientPhone,
      clientDocument: input.clientDocument,
      observations: input.observations,
      status: 'PENDING',
      totalCents,
      pdfUrl: undefined,
      createdAt: now,
      updatedAt: now,
      createdById,
      items: [],
    };

    quote.items = items.map((item) => ({ ...item, quoteId: quote.id }));

    db.quotes.push(quote);
    return quote;
  });
};
