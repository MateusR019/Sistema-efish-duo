import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatTitleCase } from '../../utils/format';
import type { Product } from '../../types';

type CartItem = {
  product: Product;
  quantity: number;
  subtotal: number;
};

type Props = {
  items: CartItem[];
  onIncrease: (productId: string, product: Product) => void;
  onDecrease: (productId: string, product: Product) => void;
  onRemove: (productId: string) => void;
  total: number;
};

export const CartPanel = ({
  items,
  onIncrease,
  onDecrease,
  onRemove,
  total,
}: Props) => {
  return (
    <aside className="lg:sticky lg:top-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Seu orcamento
        </h3>
        <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
          {items.length} itens
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-slate-500">
            Adicione produtos para visualizar o resumo.
          </p>
        )}
        {items.map(({ product, quantity, subtotal }) => (
          <div
            key={product.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-inner"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  {formatTitleCase(product.nome)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatCurrency(product.preco)} / unidade
                </p>
              </div>
              <button
                onClick={() => onRemove(product.id)}
                className="text-slate-400 transition hover:text-rose-600"
                type="button"
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <button
                  type="button"
                  onClick={() => onDecrease(product.id, product)}
                  className="text-slate-600 transition hover:text-brand-600"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onIncrease(product.id, product)}
                  className="text-slate-600 transition hover:text-brand-600"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(subtotal)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-black px-4 py-4 text-white shadow-sm">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>Subtotal</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Valores estimados. Detalhes finais no envio.
        </p>
      </div>
    </aside>
  );
};
