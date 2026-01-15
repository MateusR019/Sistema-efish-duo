import type { Budget } from '../types';

const endpoint = import.meta.env.VITE_BLING_WEBHOOK_URL;

export const sendOrderToBling = async (budget: Budget) => {
  if (!endpoint) {
    console.warn(
      'VITE_BLING_WEBHOOK_URL não configurada. Pedido não será enviado para o Bling.',
    );
    return;
  }

  const payload = {
    orderNumber: budget.numeroPedido,
    client: budget.cliente,
    items: budget.itens.map((item) => ({
      productId: item.produto.id,
      name: item.produto.nome,
      quantity: item.quantidade,
      unitPrice: item.produto.preco,
      subtotal: item.subtotal,
    })),
    observations: budget.observacoes,
    total: budget.total,
    generatedAt: budget.data,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao enviar pedido para o Bling: ${response.status} - ${text}`);
  }
};
