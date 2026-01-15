import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import { createProduct, listProducts } from '../services/productService';

const router = Router();

router.get('/', async (_req, res) => {
  const products = await listProducts();
  return res.json({ products });
});

const productSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  price: z.number().positive(),
  category: z.string().min(2).optional(),
  mainImageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const payload = productSchema.parse(req.body);
    const product = await createProduct(
      {
        name: payload.name,
        description: payload.description,
        priceCents: Math.round(payload.price * 100),
        category: payload.category,
        mainImageUrl: payload.mainImageUrl,
        imageUrls: payload.imageUrls,
      },
      req.authUserId,
    );
    return res.status(201).json({ product });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', details: error.flatten() });
    }
    return res.status(500).json({ message: 'Erro ao criar produto.' });
  }
});

export default router;
