import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

type FormState = {
  nome: string;
  descricao: string;
  preco: string;
  categoria: string;
  imagemUrl: string;
};

const initialForm: FormState = {
  nome: '',
  descricao: '',
  preco: '',
  categoria: '',
  imagemUrl: '',
};

export const AddProductPage = () => {
  const { createProduct, products, productsLoading } = useAppContext();
  const [form, setForm] = useState<FormState>(initialForm);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    products.forEach((product) => {
      if (product.categoria) {
        unique.add(product.categoria);
      }
    });
    return Array.from(unique).sort();
  }, [products]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFeedback(null);
    setError(null);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setFilePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.toString() ?? null;
      setFilePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCategorySelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedCategory(value);
    if (value !== '__other') {
      setCustomCategory('');
      setForm((prev) => ({ ...prev, categoria: value }));
    } else {
      setForm((prev) => ({ ...prev, categoria: '' }));
    }
  };

  const handleCustomCategoryChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;
    setCustomCategory(value);
    setForm((prev) => ({ ...prev, categoria: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);

    if (!form.nome.trim() || !form.descricao.trim() || !form.preco.trim()) {
      setError('Preencha nome, descricao e preco.');
      setIsSubmitting(false);
      return;
    }

    if (!form.categoria.trim()) {
      setError('Escolha ou informe uma categoria.');
      setIsSubmitting(false);
      return;
    }

    const priceValue = Number(form.preco.replace(',', '.'));
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      setError('Informe um preco valido.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: priceValue,
      categoria: form.categoria || undefined,
      imagem: filePreview ?? (form.imagemUrl || undefined),
    };

    createProduct(payload)
      .then((newProduct) => {
        setFeedback(`Produto ${newProduct.nome} adicionado com sucesso!`);
        setForm(initialForm);
        setFilePreview(null);
        setSelectedCategory('');
        setCustomCategory('');
      })
      .catch((err) => {
        console.error(err);
        setError(
          (err as Error).message || 'Nao foi possivel adicionar o produto.',
        );
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Cadastrar novo produto/servico
          </h2>
          <p className="text-sm text-slate-500">
            Os itens criados aqui ficam disponiveis para todos os usuarios autenticados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/catalogo')}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
        >
          Voltar ao catalogo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Nome do produto *
            </label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Categoria *
            </label>
            <select
              value={selectedCategory}
              onChange={handleCategorySelect}
              disabled={productsLoading}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Selecione uma categoria</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="__other">Outra categoria</option>
            </select>
            {selectedCategory === '__other' && (
              <input
                type="text"
                value={customCategory}
                onChange={handleCustomCategoryChange}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Informe a nova categoria"
              />
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Preco (R$) *
            </label>
            <input
              type="text"
              name="preco"
              value={form.preco}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Ex: 2500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              URL da imagem (opcional)
            </label>
            <input
              type="url"
              name="imagemUrl"
              value={form.imagemUrl}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="https://..."
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">
            Descricao *
          </label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            rows={4}
          />
        </div>
        <div className="rounded-2xl border border-dashed border-brand-300 p-4">
          <label className="text-sm font-semibold text-slate-700">
            Ou faca upload da imagem (JPG/PNG)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mt-2 w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-600"
          />
          {filePreview && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Preview
              </p>
              <img
                src={filePreview}
                alt="Pre-visualizacao do produto"
                className="mt-1 h-32 w-32 rounded-xl object-cover"
              />
            </div>
          )}
        </div>

        {(error || feedback) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error ?? feedback}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Salvando...' : 'Adicionar ao catalogo'}
        </button>
      </form>
    </div>
  );
};
