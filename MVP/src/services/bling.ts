// Integracao de leitura com a API do Bling.
import type { Budget } from '../types';

export const sendOrderToBling = async (budget: Budget) => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(budget),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Falha ao enviar pedido para aprovacao: ${response.status} - ${text}`,
    );
  }
};
