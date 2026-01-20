// Middlewares de autenticacao e permissoes.
import type { Request, Response, NextFunction } from 'express';
import { getUserById, verifyToken } from '../services/authService';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token ausente.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token ausente.' });
  }
  try {
    const payload = verifyToken(token);
    const userId = payload.sub;
    req.authUserId = userId;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado.' });
    }
    req.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.currentUser?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso restrito a administradores.' });
  }
  return next();
};
