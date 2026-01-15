import { readDatabase, updateDatabase } from '../data/database';
import type { ProductInput, ProductRecord } from '../types';
import { generateId, nowIso } from '../utils/helpers';

export const listProducts = async (): Promise<ProductRecord[]> => {
  const db = await readDatabase();
  return db.products;
};

export const createProduct = async (
  input: ProductInput,
  createdById?: string,
): Promise<ProductRecord> => {
  return updateDatabase((db) => {
    const now = nowIso();
    const record: ProductRecord = {
      id: generateId(),
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      category: input.category,
      mainImageUrl: input.mainImageUrl,
      imageUrls: input.imageUrls,
      createdById,
      createdAt: now,
      updatedAt: now,
    };
    db.products.push(record);
    return record;
  });
};
