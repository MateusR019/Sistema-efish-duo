// API de produtos do catalogo.
import { apiFetch, ApiError } from './api';
import type { Product, ProductInput } from '../types';
import produtosJson from '../data/produtos.json';

type ProductDto = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
};

type BlingProductDto = {
  id?: number | string;
  codigo?: string;
  nome?: string;
  descricao?: string;
  descricaoCurta?: string;
  descricaoComplementar?: string;
  preco?: number;
  valor?: number;
  categoria?: string;
  imagemURL?: string;
  urlImagem?: string;
  imagem?: string;
  imagens?: string[];
};

type BlingStockDto = {
  saldo?: number;
  saldoDisponivel?: number;
  saldoFisico?: number;
  produto?: {
    codigo?: string;
    nome?: string;
  };
};

const toProduct = (dto: ProductDto): Product => ({
  id: dto.id,
  nome: dto.name,
  descricao: dto.description,
  preco: dto.priceCents / 100,
  categoria: dto.category,
  imagem: dto.mainImageUrl,
  imagens: dto.imageUrls,
  origem: 'local',
});

// Ajusta caminhos de imagens do catálogo local (build estático em /pre_order_imagens)
const normalizeLocalImages = (prod: Product): Product => {
  const prefix = '/pre_order_imagens/';
  const normalizePath = (p?: string) =>
    p && !p.startsWith('http') && !p.startsWith('/') ? `${prefix}${p}` : p;

  const imagens = prod.imagens?.map(normalizePath).filter(Boolean) as string[] | undefined;
  const imagem = normalizePath(prod.imagem) ?? imagens?.[0];

  return { ...prod, imagem, imagens };
};

export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const data = await apiFetch<{ products: ProductDto[] }>('/api/products');
    return data.products.map(toProduct);
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      throw error;
    }
    // fallback local catalog
    const readLocal = <T>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    const base = (produtosJson as any[]).map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      preco: item.preco,
      categoria: item.categoria,
      imagem: item.imagem,
      imagens: item.imagens,
    })) as Product[];

    const localProducts = readLocal<Product[]>('catalog-local-products', []);
    return [...base, ...localProducts].map(normalizeLocalImages).map((prod) => ({
      ...prod,
      origem: 'local',
    }));
  }
};

export const fetchBlingProducts = async (): Promise<BlingProductDto[]> => {
  const data = await apiFetch<{ data?: { data?: BlingProductDto[] } }>(
    '/api/bling/products?pagina=1&limite=2000',
  );
  return data?.data?.data ?? [];
};

export const fetchBlingStock = async (options?: {
  codes?: string[];
  ids?: Array<string | number>;
}): Promise<BlingStockDto[]> => {
  const codes = options?.codes?.filter(Boolean) ?? [];
  const ids = options?.ids?.filter(Boolean) ?? [];
  if (!codes.length && !ids.length) {
    return [];
  }
  const params = new URLSearchParams();
  params.set('pagina', '1');
  params.set('limite', '2000');
  codes.forEach((code) => params.append('codigos[]', code));
  ids.forEach((id) => params.append('idsProdutos[]', String(id)));

  const data = await apiFetch<{ data?: { data?: BlingStockDto[] } }>(
    `/api/bling/stock?${params.toString()}`,
  );
  return data?.data?.data ?? [];
};

export const mapBlingProducts = (
  products: BlingProductDto[],
  stockItems: BlingStockDto[],
): Product[] => {
  const stockByCode = new Map<string, number>();
  stockItems.forEach((item) => {
    const code = item.produto?.codigo;
    if (!code) return;
    const saldo =
      item.saldo ?? item.saldoDisponivel ?? item.saldoFisico ?? null;
    if (saldo === null || saldo === undefined) return;
    stockByCode.set(code, Number(saldo));
  });

  return products.map((item, index) => {
    const codigo = item.codigo || (item.id ? String(item.id) : `bling-${index}`);
    const imagem =
      item.imagemURL ||
      item.urlImagem ||
      item.imagem ||
      (Array.isArray(item.imagens) ? item.imagens[0] : undefined);
    const descricao =
      item.descricao ||
      item.descricaoCurta ||
      item.descricaoComplementar ||
      '';
    const preco = Number(item.preco ?? item.valor ?? 0);
    return {
      id: `bling-${codigo}`,
      codigo,
      nome: item.nome || `Produto ${codigo}`,
      descricao,
      preco: Number.isFinite(preco) ? preco : 0,
      categoria: item.categoria,
      imagem,
      imagens: Array.isArray(item.imagens) ? item.imagens : undefined,
      estoque: stockByCode.has(codigo) ? stockByCode.get(codigo) ?? null : null,
      origem: 'bling',
    };
  });
};

export const createProduct = async (
  payload: ProductInput,
): Promise<Product> => {
  const body = {
    name: payload.nome,
    description: payload.descricao,
    price: payload.preco,
    category: payload.categoria,
    mainImageUrl: payload.imagem,
    imageUrls: payload.imagens,
  };

  const data = await apiFetch<{ product: ProductDto }>('/api/products', {
    method: 'POST',
    body,
  });
  return toProduct(data.product);
};

export const fetchProductById = async (id: string): Promise<Product> => {
  const data = await apiFetch<{ product: ProductDto }>(`/api/products/${id}`);
  return toProduct(data.product);
};

export const updateProduct = async (
  id: string,
  payload: ProductInput,
): Promise<Product> => {
  const body = {
    name: payload.nome,
    description: payload.descricao,
    price: payload.preco,
    category: payload.categoria,
    mainImageUrl: payload.imagem,
    imageUrls: payload.imagens,
  };
  const data = await apiFetch<{ product: ProductDto }>(`/api/products/${id}`, {
    method: 'PUT',
    body,
  });
  return toProduct(data.product);
};
