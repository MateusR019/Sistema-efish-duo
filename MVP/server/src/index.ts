// Entrada principal do servidor da pasta MVP/server.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import blingRoutes from './routes/blingRoutes';

const app = express();

app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/bling', blingRoutes);

const distPath = path.resolve(__dirname, '..', '..', 'dist');
app.use(express.static(distPath));

app.get(/^(?!\/api\/).*/, (req, res) => {
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Erro inesperado.' });
});

app.listen(env.port, () => {
  console.log(`API rodando em http://localhost:${env.port}`);
});
