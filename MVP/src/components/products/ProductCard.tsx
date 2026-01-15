import type { ChangeEvent } from 'react';
import type { Product } from '../../types';
import { formatCurrency, formatTitleCase } from '../../utils/format';

type Props = {
  product: Product;
  quantity?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onChangeQuantity: (value: number) => void;
};

export const ProductCard = ({
  product,
  quantity = 0,
  onIncrease,
  onDecrease,
  onChangeQuantity,
}: Props) => {
  const imageSrc = product.imagem ?? product.imagens?.[0];

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    onChangeQuantity(Number.isNaN(value) || value < 0 ? 0 : value);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
      <div className="relative h-52 w-full overflow-hidden rounded-b-none border-b border-slate-200 bg-white p-3">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.nome}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
            Sem imagem
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {product.categoria ?? 'Servico'}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow">
          {formatCurrency(product.preco)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {formatTitleCase(product.nome)}
          </h3>
          <p className="text-sm text-slate-600 line-clamp-3">
            {product.descricao}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
            <button
              type="button"
              onClick={onDecrease}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={handleInputChange}
              className="w-16 rounded-md border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onIncrease}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white transition hover:bg-brand-600"
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Subtotal
            </p>
            <p className="text-base font-semibold text-slate-100">
              {formatCurrency(quantity * product.preco)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};
