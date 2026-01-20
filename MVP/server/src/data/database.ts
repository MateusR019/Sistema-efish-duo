// Inicializacao e acesso ao banco local.
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import type { DatabaseSchema } from '../types';

const defaultData: DatabaseSchema = {
  users: [],
  products: [],
  quotes: [],
  blingToken: null,
  blingOauthStates: [],
};

const ensureDatabaseFile = async () => {
  const dir = path.dirname(env.dataFile);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(env.dataFile);
  } catch {
    await fs.writeFile(
      env.dataFile,
      JSON.stringify(defaultData, null, 2),
      'utf-8',
    );
  }
};

export const readDatabase = async (): Promise<DatabaseSchema> => {
  await ensureDatabaseFile();
  const content = await fs.readFile(env.dataFile, 'utf-8');
  return JSON.parse(content) as DatabaseSchema;
};

export const writeDatabase = async (data: DatabaseSchema) => {
  await ensureDatabaseFile();
  await fs.writeFile(env.dataFile, JSON.stringify(data, null, 2), 'utf-8');
};

export const updateDatabase = async <T>(
  updater: (data: DatabaseSchema) => T,
): Promise<T> => {
  const data = await readDatabase();
  const result = updater(data);
  await writeDatabase(data);
  return result;
};
