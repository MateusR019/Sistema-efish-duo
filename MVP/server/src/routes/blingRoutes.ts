// Rotas para integracao com o Bling (leitura de dados).
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';
import {
  blingApiFetch,
  buildConnectUrl,
  consumeOauthState,
  getStoredBlingToken,
  handleBlingCallback,
} from '../services/blingService';

const router = Router();

router.get('/status', authenticate, requireAdmin, async (_req, res) => {
  const token = await getStoredBlingToken();
  const connected = Boolean(token?.accessToken);
  return res.json({ connected });
});

router.get('/connect', authenticate, requireAdmin, async (_req, res) => {
  try {
    const url = await buildConnectUrl();
    return res.redirect(url);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
});

router.get('/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');
  if (!code || !state) {
    return res.status(400).json({ message: 'Parametros invalidos.' });
  }
  const valid = await consumeOauthState(state);
  if (!valid) {
    return res.status(400).json({ message: 'State invalido.' });
  }
  try {
    await handleBlingCallback(code);
    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(500).json({
      message: (error as Error).message || 'Falha ao conectar com o Bling.',
    });
  }
});

router.get('/clients', authenticate, requireAdmin, async (req, res) => {
  try {
    const pagina = Number(req.query.pagina || 1);
    const limite = Number(req.query.limite || 100);
    const data = await blingApiFetch('/contatos', { pagina, limite });
    return res.json({ data });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao consultar clientes.',
    });
  }
});

router.get('/products', authenticate, async (req, res) => {
  try {
    const pagina = Number(req.query.pagina || 1);
    const limite = Number(req.query.limite || 100);
    const data = await blingApiFetch('/produtos', { pagina, limite });
    return res.json({ data });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao consultar produtos.',
    });
  }
});

router.get('/sellers', authenticate, requireAdmin, async (req, res) => {
  try {
    const pagina = Number(req.query.pagina || 1);
    const limite = Number(req.query.limite || 100);
    const data = await blingApiFetch('/vendedores', { pagina, limite });
    return res.json({ data });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao consultar vendedores.',
    });
  }
});

router.get('/stock', authenticate, async (req, res) => {
  try {
    const pagina = Number(req.query.pagina || 1);
    const limite = Number(req.query.limite || 100);
    const data = await blingApiFetch('/estoques/saldos', { pagina, limite });
    return res.json({ data });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao consultar estoque.',
    });
  }
});

router.get('/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const pagina = Number(req.query.pagina || 1);
    const limite = Number(req.query.limite || 100);
    const data = await blingApiFetch('/pedidos/vendas', { pagina, limite });
    return res.json({ data });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return res.status(status).json({
      message: (error as Error).message || 'Falha ao consultar pedidos.',
    });
  }
});

export default router;
