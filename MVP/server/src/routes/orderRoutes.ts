// Rotas HTTP de pedidos.
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  createQuote,
  getQuoteById,
  listQuotes,
  updateQuoteStatus,
} from '../services/quoteService';
import { sendEmail } from '../services/emailService';
import { sendOrderToBling } from '../services/blingOrdersService';

const router = Router();

const quoteSchema = z.object({
  clientName: z.string().min(3),
  clientEmail: z.string().email(),
  clientCompany: z.string().min(2),
  clientPhone: z.string().min(8),
  clientDocument: z.string().optional(),
  observations: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        productName: z.string().min(2),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      }),
    )
    .min(1),
});

router.post('/', authenticate, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const isBudgetFormat = Boolean(body?.cliente && Array.isArray(body?.itens));
    const parsed = isBudgetFormat
      ? quoteSchema.parse({
          clientName: body.cliente?.nome,
          clientEmail: body.cliente?.email,
          clientCompany: body.cliente?.empresa,
          clientPhone: body.cliente?.telefone,
          clientDocument: body.cliente?.cnpjCpf,
          observations: body.observacoes,
          items: (body.itens || []).map((item: any) => ({
            productId: item?.produto?.id ? String(item.produto.id) : undefined,
            productName: item?.produto?.nome,
            quantity: Number(item?.quantidade || 0),
            unitPrice: Number(item?.produto?.preco || 0),
          })),
        })
      : quoteSchema.parse(body);

    const quote = await createQuote(
      {
        clientName: parsed.clientName,
        clientEmail: parsed.clientEmail,
        clientCompany: parsed.clientCompany,
        clientPhone: parsed.clientPhone,
        clientDocument: parsed.clientDocument,
        observations: parsed.observations,
        items: parsed.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitCents: Math.round(item.unitPrice * 100),
        })),
      },
      req.authUserId,
    );

    await sendEmail({
      to: [quote.clientEmail],
      subject: `Orçamento ${quote.orderNumber}`,
      text: `Recebemos o seu pedido. Total: R$ ${(quote.totalCents / 100).toFixed(2)}`,
    });

    return res.status(201).json({ quote });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados do pedido inválidos.', details: error.flatten() });
    }
    return res.status(500).json({ message: 'Erro ao registrar pedido.' });
  }
});

router.get('/', authenticate, requireAdmin, async (_req, res) => {
  const quotes = await listQuotes();
  const orders = quotes.map((quote) => ({
    id: quote.id,
    status: quote.status,
    payload: {
      customerName: quote.clientName,
      total: quote.totalCents / 100,
      totalPrice: quote.totalCents / 100,
      items: quote.items,
    },
  }));
  return res.json({ orders });
});

router.post('/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID invalido.' });
  }
  const quote = await getQuoteById(id);
  if (!quote) {
    return res.status(404).json({ message: 'Pedido nao encontrado.' });
  }
  if (quote.status === 'SENT') {
    return res.status(400).json({ message: 'Pedido ja processado.' });
  }
  try {
    const result = await sendOrderToBling(quote);
    await updateQuoteStatus(id, 'SENT');
    return res.json({ ok: true, data: result });
  } catch (error) {
    await updateQuoteStatus(id, 'FAILED');
    const status = (error as Error & { status?: number }).status || 400;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao enviar pedido ao Bling.',
    });
  }
});

router.post('/:id/reject', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID invalido.' });
  }
  const quote = await getQuoteById(id);
  if (!quote) {
    return res.status(404).json({ message: 'Pedido nao encontrado.' });
  }
  await updateQuoteStatus(id, 'REJECTED');
  return res.json({ ok: true });
});

export default router;
