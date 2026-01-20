// Tipos e interfaces compartilhados.
export type ClientData = {
  nome: string;
  email: string;
  empresa: string;
  telefone: string;
  cnpjCpf?: string;
};

export type Product = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria?: string;
  imagem?: string;
  imagens?: string[];
  codigo?: string;
  estoque?: number | null;
  origem?: 'local' | 'bling';
};

export type ProductInput = Omit<Product, 'id'>;

export type CartItem = {
  productId: string;
  quantity: number;
};

export type BudgetItem = {
  produto: Product;
  quantidade: number;
  subtotal: number;
};

export type Budget = {
  numeroPedido: string;
  data: string;
  cliente: ClientData;
  itens: BudgetItem[];
  observacoes?: string;
  total: number;
};

export type Role = 'CLIENT' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export type CompanyInfo = {
  nome: string;
  email: string;
  telefone: string;
  endereco?: string;
  logoTexto?: string;
};

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  cnpjCpf?: string;
  role?: Role;
  isAdmin?: boolean;
  status?: UserStatus;
};

export type Credentials = {
  email: string;
  password: string;
};
