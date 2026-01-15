import { apiFetch } from './api';
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

const toProduct = (dto: ProductDto): Product => ({
  id: dto.id,
  nome: dto.name,
  descricao: dto.description,
  preco: dto.priceCents / 100,
  categoria: dto.category,
  imagem: dto.mainImageUrl,
  imagens: dto.imageUrls,
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

export const fetchProducts = async (token?: string | null): Promise<Product[]> => {
  try {
    const data = await apiFetch<{ products: ProductDto[] }>('/api/products', {
      token: token ?? undefined,
    });
    return data.products.map(toProduct);
  } catch {
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
    return [...base, ...localProducts].map(normalizeLocalImages);
  }
};

export const createProduct = async (
  payload: ProductInput,
  token: string,
): Promise<Product> => {
  const body = {
    name: payload.nome,
    description: payload.descricao,
    price: payload.preco,
    category: payload.categoria,
    mainImageUrl: payload.imagem,
    imageUrls: payload.imagens,
  };

  try {
    const data = await apiFetch<{ product: ProductDto }>('/api/products', {
      method: 'POST',
      token,
      body,
    });
    return toProduct(data.product);
  } catch {
    const localKey = 'catalog-local-products';
    const readLocal = <T>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };
    const writeLocal = <T>(key: string, value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    };
    const current = readLocal<Product[]>(localKey, []);
    const newProduct: Product = {
      id: `local-${Date.now()}`,
      nome: payload.nome,
      descricao: payload.descricao,
      preco: payload.preco,
      categoria: payload.categoria,
      imagem: payload.imagem,
      imagens: payload.imagens,
    };
    current.push(newProduct);
    writeLocal(localKey, current);
    // Retorna normalizado para respeitar caminho das imagens locais
    return normalizeLocalImages(newProduct);
  }
};
