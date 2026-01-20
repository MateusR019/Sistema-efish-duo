// Tabela com itens e totais do pedido.
import { formatCurrency, formatTitleCase } from '../../utils/format';
import type { Product } from '../../types';

type Item = {
  product: Product;
  quantity: number;
  subtotal: number;
};

type Props = {
  items: Item[];
  total: number;
};

export const OrderItemsTable = ({ items, total }: Props) => (
  <div className="overflow-hidden rounded-2xl border border-slate-100">
    <table className="min-w-full divide-y divide-slate-100 text-sm">
      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          <th className="px-4 py-3">Produto</th>
          <th className="px-4 py-3">Qtd.</th>
          <th className="px-4 py-3">Valor unit.</th>
          <th className="px-4 py-3 text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 bg-white text-slate-700">
        {items.map(({ product, quantity, subtotal }) => (
          <tr key={product.id}>
            <td className="px-4 py-3">
              <p className="font-semibold text-slate-900">
                {formatTitleCase(product.nome)}
              </p>
              <p className="text-xs text-slate-500">{product.descricao}</p>
            </td>
            <td className="px-4 py-3">{quantity}</td>
            <td className="px-4 py-3">{formatCurrency(product.preco)}</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-900">
              {formatCurrency(subtotal)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot className="bg-slate-50 text-sm font-semibold text-slate-900">
        <tr>
          <td colSpan={3} className="px-4 py-3 text-right">
            Total geral
          </td>
          <td className="px-4 py-3 text-right">
            {formatCurrency(total)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);
