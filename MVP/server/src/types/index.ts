// Tipos compartilhados do backend.
export type Role = 'CLIENT' | 'ADMIN';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecord = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  category?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
  createdById?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  category?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
};

export type QuoteItemRecord = {
  id: string;
  quoteId: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitCents: number;
  subtotalCents: number;
  createdAt: string;
};

export type QuoteRecord = {
  id: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientPhone: string;
  clientDocument?: string;
  observations?: string;
  totalCents: number;
  status: 'PENDING' | 'SENT' | 'APPROVED' | 'REJECTED' | 'FAILED';
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  items: QuoteItemRecord[];
};

export type DatabaseSchema = {
  users: UserRecord[];
  products: ProductRecord[];
  quotes: QuoteRecord[];
  blingToken?: BlingToken | null;
  blingOauthStates?: BlingOauthState[];
};

export type BlingToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType?: string;
  scope?: string;
  createdAt: string;
};

export type BlingOauthState = {
  state: string;
  createdAt: string;
};

export type QuoteItemInput = {
  productId?: string;
  productName: string;
  quantity: number;
  unitCents: number;
};

export type QuoteInput = {
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientPhone: string;
  clientDocument?: string;
  observations?: string;
  items: QuoteItemInput[];
};
