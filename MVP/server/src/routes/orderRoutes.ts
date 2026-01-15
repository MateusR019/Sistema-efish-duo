import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import { createQuote, listQuotes } from '../services/quoteService';
import { sendEmail } from '../services/emailService';

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
    const payload = quoteSchema.parse(req.body);
    const quote = await createQuote(
      {
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        clientCompany: payload.clientCompany,
        clientPhone: payload.clientPhone,
        clientDocument: payload.clientDocument,
        observations: payload.observations,
        items: payload.items.map((item) => ({
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
  return res.json({ quotes });
});

export default router;
