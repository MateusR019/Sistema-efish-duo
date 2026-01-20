// Rotas HTTP de autenticacao.
import { Router } from 'express';
import { z } from 'zod';
import { loginUser, registerUser } from '../services/authService';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/register', async (req, res) => {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await registerUser(payload);
    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', details: error.flatten() });
    }
    return res.status(400).json({ message: (error as Error).message });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post('/login', async (req, res) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await loginUser(payload);
    return res.json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Dados inválidos.', details: error.flatten() });
    }
    return res.status(401).json({ message: (error as Error).message });
  }
});

router.get('/me', authenticate, (req, res) => {
  return res.json({ user: req.currentUser });
});

export default router;
