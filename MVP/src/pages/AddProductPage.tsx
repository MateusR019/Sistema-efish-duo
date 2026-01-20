// Cadastro e edicao de produtos.
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { uploadImage } from '../services/uploadService';

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
  const { createProduct, updateProduct, getProductById, products, productsLoading } = useAppContext();
  const [form, setForm] = useState<FormState>(initialForm);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const toAbsoluteUrl = (value: string) => {
    const raw = value.trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (typeof window === 'undefined') return raw;
    const origin = window.location.origin;
    const basePrefix = window.location.pathname.startsWith('/efish') ? '/efish' : '';
    if (raw.startsWith('/')) {
      if (basePrefix && raw.startsWith(`${basePrefix}/`)) {
        return `${origin}${raw}`;
      }
      return `${origin}${basePrefix}${raw}`;
    }
    return `${origin}${basePrefix}/${raw}`;
  };

  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    products.forEach((product) => {
      if (product.categoria) {
        unique.add(product.categoria);
      }
    });
    return Array.from(unique).sort();
  }, [products]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let isMounted = true;
    const loadProduct = async () => {
      setIsLoadingProduct(true);
      const product = await getProductById(id);
      if (!isMounted) return;
      if (!product) {
        setError('Produto nao encontrado.');
        setIsLoadingProduct(false);
        return;
      }
      setForm({
        nome: product.nome,
        descricao: product.descricao,
        preco: String(product.preco),
        categoria: product.categoria ?? '',
        imagemUrl: toAbsoluteUrl(product.imagem ?? product.imagens?.[0] ?? ''),
      });
      setFilePreview(null);
      if (product.categoria) {
        const exists = categoryOptions.includes(product.categoria);
        if (exists) {
          setSelectedCategory(product.categoria);
          setCustomCategory('');
        } else {
          setSelectedCategory('__other');
          setCustomCategory(product.categoria);
        }
      } else {
        setSelectedCategory('');
        setCustomCategory('');
      }
      setIsLoadingProduct(false);
    };
    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [isEdit, id, getProductById, categoryOptions]);

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

  const handleSubmit = async (event: FormEvent) => {
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

    let imageUrl = form.imagemUrl.trim()
      ? toAbsoluteUrl(form.imagemUrl)
      : undefined;
    if (filePreview) {
      try {
        imageUrl = await uploadImage(filePreview);
      } catch (error) {
        console.error(error);
        setError('Nao foi possivel enviar a imagem.');
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: priceValue,
      categoria: form.categoria || undefined,
      imagem: imageUrl,
    };

    try {
      const saved = isEdit && id
        ? await updateProduct(id, payload)
        : await createProduct(payload);
      setFeedback(
        isEdit
          ? `Produto ${saved.nome} atualizado com sucesso!`
          : `Produto ${saved.nome} adicionado com sucesso!`,
      );
      setForm(initialForm);
      setFilePreview(null);
      setSelectedCategory('');
      setCustomCategory('');
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message || 'Nao foi possivel adicionar o produto.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {isEdit ? 'Editar produto/servico' : 'Cadastrar novo produto/servico'}
          </h2>
          <p className="text-sm text-slate-500">
            {isEdit
              ? 'Atualize os dados e salve para refletir no catalogo.'
              : 'Os itens criados aqui ficam disponiveis para todos os usuarios autenticados.'}
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
        {isLoadingProduct && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Carregando produto...
          </div>
        )}
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
          {(filePreview || form.imagemUrl) && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Preview
              </p>
              <img
                src={filePreview ?? form.imagemUrl}
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
          {isSubmitting
            ? 'Salvando...'
            : isEdit
              ? 'Salvar alteracoes'
              : 'Adicionar ao catalogo'}
        </button>
      </form>
    </div>
  );
};
