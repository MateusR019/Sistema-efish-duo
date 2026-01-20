// Tela do catalogo e interacoes do carrinho.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/products/ProductCard';
import { CartPanel } from '../components/products/CartPanel';
import { useAppContext } from '../context/AppContext';

export const CatalogPage = () => {
  const {
    products,
    productsLoading,
    productsError,
    cart,
    cartItems,
    changeQuantity,
    removeItem,
    total,
    isAdmin,
  } = useAppContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('todos');

  const categories = useMemo(() => {
    const unique = new Set<string>();
    products.forEach((product) => {
      if (product.categoria) {
        unique.add(product.categoria);
      }
    });
    return ['todos', ...Array.from(unique)];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const matchesQuery =
      product.nome.toLowerCase().includes(query.toLowerCase()) ||
      product.descricao.toLowerCase().includes(query.toLowerCase());
    const matchesCategory =
      category === 'todos' || product.categoria === category;
    return matchesQuery && matchesCategory;
  });

  const hasLocalProducts = products.some((product) => product.origem === 'local');

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Catalogo
          </p>
          <h2 className="text-3xl font-semibold text-slate-900">
            Escolha os produtos e monte o orcamento
          </h2>
          <p className="text-sm text-slate-600">
            Busca rapida, filtros e ajustes de quantidade sem sair da pagina.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/resumo')}
          disabled={cartItems.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Finalizar resumo
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            {cartItems.length} itens
          </span>
        </button>
      </div>

      <div className="gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm md:flex md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 md:max-w-xl">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Buscar
          </label>
          <input
            type="search"
            placeholder="Nome, descricao ou palavra-chave"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                category === cat
                  ? 'border-black bg-black text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-500 hover:text-brand-600'
              }`}
            >
              {cat === 'todos' ? 'Todos' : cat}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-3 text-xs text-slate-500">
            {hasLocalProducts && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Produto local
              </span>
            )}
            <span>{filteredProducts.length} resultados</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {productsError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {productsError} Atualize a pagina para tentar novamente.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {productsLoading && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
              Carregando catalogo...
            </p>
          )}
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cart[product.id]?.quantity ?? 0}
              onIncrease={() =>
                changeQuantity(
                  product.id,
                  (cart[product.id]?.quantity ?? 0) + 1,
                  product,
                )
              }
              onDecrease={() =>
                changeQuantity(
                  product.id,
                  (cart[product.id]?.quantity ?? 0) - 1,
                  product,
                )
              }
              onChangeQuantity={(value) => changeQuantity(product.id, value, product)}
              showEdit={isAdmin}
              onEdit={() => navigate(`/produtos/editar/${product.id}`)}
            />
          ))}
          {!productsLoading && filteredProducts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Nenhum produto encontrado para o filtro aplicado.
            </p>
          )}
        </div>
        <CartPanel
          items={cartItems}
          total={total}
          onIncrease={(id, product) =>
            changeQuantity(id, (cart[id]?.quantity ?? 0) + 1, product)
          }
          onDecrease={(id, product) =>
            changeQuantity(id, (cart[id]?.quantity ?? 0) - 1, product)
          }
          onRemove={removeItem}
        />
      </div>
    </div>
  );
};
