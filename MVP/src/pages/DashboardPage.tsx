import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Menu,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import { apiFetch } from '../services/api';

type AppItem = {
  id: string;
  label: string;
};

type BrandConfig = {
  id: 'efish' | 'duo';
  title: string;
  logo: string;
  apps: AppItem[];
};

type Registration = {
  id: string;
  name: string;
  email: string;
  cnpj?: string;
};

type OrderApproval = {
  id: string;
  status?: string;
  payload?: {
    customerName?: string;
    total?: number;
    totalPrice?: number;
    items?: unknown[];
  };
};

type BlingClient = {
  nome?: string;
  email?: string;
  numeroDocumento?: string;
  dataUltimaCompra?: string;
  dataUltimoPedido?: string;
  dataUltimaVenda?: string;
  ultimaCompra?: string;
};

type BlingProduct = {
  id?: string | number;
  codigo?: string;
  nome?: string;
  descricao?: string;
  preco?: number;
  valor?: number;
};

type BlingSeller = {
  nome?: string;
  email?: string;
  situacao?: string;
  ativo?: string;
};

type BlingStock = {
  codigo?: string;
  nome?: string;
  saldo?: string | number;
  saldoDisponivel?: string | number;
  saldoFisico?: string | number;
  produto?: {
    codigo?: string;
    nome?: string;
  };
};

type BlingOrder = {
  id?: string | number;
  numero?: string | number;
  numeroLoja?: string | number;
  total?: number;
  contato?: {
    nome?: string;
  };
};

type Product = {
  id: string;
  nome: string;
  preco: number;
};

const basePath = window.location.pathname.startsWith('/efish') ? '/efish' : '';

const brandConfigs: Record<string, BrandConfig> = {
  efish: {
    id: 'efish',
    title: 'E-Fish ML',
    logo: '/Logo.png',
    apps: [
      { id: 'efish-placeholder', label: 'Apps E-Fish' },
    ],
  },
  duo: {
    id: 'duo',
    title: 'Duo International',
    logo: '/duo-logo.png',
    apps: [
      { id: 'duo-catalog', label: 'Catalogo Duo' },
      { id: 'duo-registrations', label: 'Cadastros' },
      { id: 'duo-approvals', label: 'Aprovar Orcamentos' },
      { id: 'duo-bling-clients', label: 'Bling Clientes' },
      { id: 'duo-bling-products', label: 'Bling Produtos' },
      { id: 'duo-bling-sellers', label: 'Bling Vendedores' },
      { id: 'duo-bling-stock', label: 'Bling Estoque' },
      { id: 'duo-bling-orders', label: 'Bling Pedidos' },
      { id: 'duo-products', label: 'Gestao de Produtos' },
      { id: 'duo-ops', label: 'Operacoes Duo' },
    ],
  },
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card md:p-6">
    {children}
  </div>
);

const SectionHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

const formatDate = (value?: string) => {
  if (!value) return '-';
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map((part) => parseInt(part, 10));
      if (day && month && year) {
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
      }
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};

const formatDoc = (value?: string) => {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return value;
};

const formatStatus = (value?: string) => {
  if (!value) return 'PENDENTE';
  const status = value.toUpperCase();
  if (status === 'SENT') return 'ENVIADO';
  if (status === 'REJECTED') return 'NEGADO';
  if (status === 'FAILED') return 'FALHA';
  return 'PENDENTE';
};

const StatusBadge = ({ status }: { status?: string }) => {
  const label = formatStatus(status);
  const base =
    'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold';
  const styles =
    label === 'ENVIADO'
      ? 'bg-emerald-100 text-emerald-700'
      : label === 'NEGADO'
        ? 'bg-rose-100 text-rose-700'
        : label === 'FALHA'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-700';
  return <span className={`${base} ${styles}`}>{label}</span>;
};

const PillButton = ({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'ghost' | 'primary';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) => {
  const base =
    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition';
  const styles =
    variant === 'primary'
      ? 'border-brand-500 bg-brand-500 text-white hover:bg-brand-600'
      : 'border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:text-brand-600';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {children}
    </button>
  );
};

const OutlineIconButton = ({
  onClick,
  children,
  label,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
  >
    {children}
  </button>
);

const EfFishPlaceholder = () => (
  <Card>
    <SectionHeader
      title="Apps E-Fish"
      subtitle="Central do E-Fish. Se precisar trazer calculadora, SKU ou EAN para o dashboard, me avise."
    />
  </Card>
);

const DuoCatalog = () => (
  <Card>
    <SectionHeader
      title="Catalogo Duo"
      subtitle="Abra o catalogo de produtos em nova guia."
      actions={
      <a
        href={`${basePath}/`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-brand-500 hover:text-brand-600 sm:w-auto"
      >
          <ExternalLink className="h-4 w-4" />
          Abrir em nova aba
        </a>
      }
    />
    <p className="mt-4 text-sm text-slate-600">
      Para atualizar o catalogo, rode <code>npm run build</code> dentro de{' '}
      <code>MVP</code>; o link segue apontando para o build mais recente.
    </p>
    <div className="mt-6">
      <a
        href={`${basePath}/`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-600 sm:w-auto"
      >
        Abrir catalogo da Duo
      </a>
    </div>
  </Card>
);

const DuoRegistrations = () => {
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ registrations: Registration[] }>(
        '/api/admin/registrations',
      );
      setItems(data.registrations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, action: 'approve' | 'reject') => {
    await apiFetch(`/api/admin/registrations/${id}/${action}`, {
      method: 'POST',
    });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <SectionHeader
        title="Cadastros pendentes"
        subtitle="Aprove ou negue solicitacoes de cadastro."
        actions={
          <PillButton onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </PillButton>
        }
      />
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !items.length && (
          <p className="text-sm text-slate-500">Nenhum cadastro pendente.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {item.name || 'Usuario'}
              </p>
              <p className="text-sm text-slate-500">{item.email}</p>
              <p className="text-xs text-slate-500">
                CNPJ: {formatDoc(item.cnpj)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PillButton onClick={() => updateStatus(item.id, 'approve')} variant="primary">
                Aceitar
              </PillButton>
              <PillButton onClick={() => updateStatus(item.id, 'reject')}>
                Negar
              </PillButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const DuoApprovals = () => {
  const [orders, setOrders] = useState<OrderApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ orders: OrderApproval[] }>('/api/orders');
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: string) => {
    await apiFetch(`/api/orders/${id}/approve`, { method: 'POST' });
    load();
  };

  const reject = async (id: string) => {
    await apiFetch(`/api/orders/${id}/reject`, { method: 'POST' });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <SectionHeader
        title="Aprovacao de orcamentos"
        subtitle="Pedidos enviados pelos usuarios ficam pendentes aqui ate aprovacao."
        actions={
          <PillButton onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </PillButton>
        }
      />
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !orders.length && (
          <p className="text-sm text-slate-500">Nenhum orcamento pendente.</p>
        )}
        {orders.map((order) => {
          const items = order.payload?.items ?? [];
          const total = Number(
            order.payload?.total ?? order.payload?.totalPrice ?? 0,
          ).toFixed(2);
          return (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  Pedido {order.id}
                </p>
                <p className="text-sm text-slate-500">
                  Cliente: {order.payload?.customerName || '-'}
                </p>
                <p className="text-xs text-slate-500">
                  Total: R$ {total} - Itens: {items.length}
                </p>
                <div className="mt-2">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PillButton onClick={() => reject(order.id)}>
                  Negar
                </PillButton>
                <PillButton onClick={() => approve(order.id)} variant="primary">
                  Aprovar e enviar
                </PillButton>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const BlingPanel = ({
  title,
  subtitle,
  endpoint,
  renderRow,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  renderRow: (item: any, index: number) => React.ReactNode;
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ data?: { data?: any[] } }>(
        endpoint,
      );
      const list = data?.data?.data ?? [];
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actions={
          <PillButton onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </PillButton>
        }
      />
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !items.length && (
          <p className="text-sm text-slate-500">Nenhum dado encontrado.</p>
        )}
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            {renderRow(item, index)}
          </div>
        ))}
      </div>
    </Card>
  );
};

const DuoProducts = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ products: Product[] }>('/api/products');
      setItems(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <SectionHeader
        title="Gestao de Produtos"
        subtitle="Lista de produtos cadastrados. Para adicionar, use o botao no topo."
        actions={
          <PillButton onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </PillButton>
        }
      />
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Carregando...</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && !items.length && (
          <p className="text-sm text-slate-500">Nenhum produto cadastrado.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p className="font-semibold text-slate-900">{item.nome}</p>
              <p className="text-sm text-slate-500">
                R$ {Number(item.preco).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/produtos/editar/${item.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-brand-500 hover:text-brand-600"
              >
                Editar
              </a>
              <PillButton onClick={() => remove(item.id)}>Remover</PillButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const DashboardPage = () => {
  const [brandId, setBrandId] = useState<'efish' | 'duo'>(() => {
    const stored = localStorage.getItem('dashboard-brand');
    if (stored === 'efish' || stored === 'duo') return stored;
    return 'duo';
  });
  const [activeAppId, setActiveAppId] = useState<string>(() => {
    const stored = localStorage.getItem('dashboard-active-app');
    return stored || '';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const brand = brandConfigs[brandId];
  const apps = brand.apps;

  useEffect(() => {
    localStorage.setItem('dashboard-brand', brandId);
  }, [brandId]);

  useEffect(() => {
    const stored = localStorage.getItem(`dashboard-active-app-${brandId}`);
    const next =
      stored && apps.some((app) => app.id === stored)
        ? stored
        : apps[0]?.id ?? '';
    setActiveAppId(next);
  }, [brandId, apps]);

  useEffect(() => {
    if (!activeAppId) return;
    localStorage.setItem(`dashboard-active-app-${brandId}`, activeAppId);
    localStorage.setItem('dashboard-active-app', activeAppId);
  }, [activeAppId, brandId]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-settings-popover]')) return;
      setIsSettingsOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isSettingsOpen]);

  const activeContent = useMemo(() => {
    if (brandId === 'efish') return <EfFishPlaceholder />;
    if (activeAppId === 'duo-catalog') return <DuoCatalog />;
    if (activeAppId === 'duo-registrations') return <DuoRegistrations />;
    if (activeAppId === 'duo-approvals') return <DuoApprovals />;
    if (activeAppId === 'duo-bling-clients') {
      return (
        <BlingPanel
          key={activeAppId}
          title="Clientes do Bling"
          subtitle="Leitura apenas. Conecte o Bling para carregar os clientes."
          endpoint="/api/bling/clients?pagina=1&limite=500"
          renderRow={(item: BlingClient) => (
            <div>
              <p className="font-semibold text-slate-900">
                {item.nome || 'Cliente'}
              </p>
            <p className="text-sm text-slate-500">{item.email || '-'}</p>
            <p className="text-xs text-slate-500">
              Documento: {formatDoc(item.numeroDocumento)}
            </p>
              <p className="text-xs text-slate-500">
                Ultima compra:{' '}
                {formatDate(
                  item.dataUltimaCompra ||
                    item.dataUltimoPedido ||
                    item.dataUltimaVenda ||
                    item.ultimaCompra,
                )}
              </p>
            </div>
          )}
        />
      );
    }
    if (activeAppId === 'duo-bling-products') {
      return (
        <BlingPanel
          key={activeAppId}
          title="Produtos do Bling"
          subtitle="Leitura apenas. Lista os produtos cadastrados no Bling."
          endpoint="/api/bling/products?pagina=1&limite=200"
          renderRow={(item: BlingProduct) => (
            <div>
              <p className="font-semibold text-slate-900">
                {item.nome || item.descricao || 'Produto'}
              </p>
              <p className="text-sm text-slate-500">
                Codigo: {item.codigo || item.id || '-'}
              </p>
              <p className="text-xs text-slate-500">
                Preco: R$ {Number(item.preco ?? item.valor ?? 0).toFixed(2)}
              </p>
            </div>
          )}
        />
      );
    }
    if (activeAppId === 'duo-bling-sellers') {
      return (
        <BlingPanel
          key={activeAppId}
          title="Vendedores do Bling"
          subtitle="Leitura apenas. Lista os vendedores cadastrados."
          endpoint="/api/bling/sellers?pagina=1&limite=200"
          renderRow={(item: BlingSeller) => (
            <div>
              <p className="font-semibold text-slate-900">
                {item.nome || 'Vendedor'}
              </p>
              <p className="text-sm text-slate-500">{item.email || '-'}</p>
              <p className="text-xs text-slate-500">
                Situacao: {item.situacao || item.ativo || '-'}
              </p>
            </div>
          )}
        />
      );
    }
    if (activeAppId === 'duo-bling-stock') {
      return (
        <BlingPanel
          key={activeAppId}
          title="Estoque do Bling"
          subtitle="Leitura apenas. Saldo por produto."
          endpoint="/api/bling/stock?pagina=1&limite=200"
          renderRow={(item: BlingStock) => (
            <div>
              <p className="font-semibold text-slate-900">
                {item.produto?.nome || item.nome || 'Produto'}
              </p>
              <p className="text-sm text-slate-500">
                Codigo: {item.produto?.codigo || item.codigo || '-'}
              </p>
              <p className="text-xs text-slate-500">
                Saldo:{' '}
                {item.saldo ??
                  item.saldoDisponivel ??
                  item.saldoFisico ??
                  '-'}
              </p>
            </div>
          )}
        />
      );
    }
    if (activeAppId === 'duo-bling-orders') {
      return (
        <BlingPanel
          key={activeAppId}
          title="Pedidos de venda (Bling)"
          subtitle="Leitura apenas. Ultimos pedidos enviados."
          endpoint="/api/bling/orders?pagina=1&limite=200"
          renderRow={(item: BlingOrder) => (
            <div>
              <p className="font-semibold text-slate-900">
                Pedido {item.numero || item.numeroLoja || item.id || '-'}
              </p>
              <p className="text-sm text-slate-500">
                Cliente: {item.contato?.nome || '-'}
              </p>
              <p className="text-xs text-slate-500">
                Total: R$ {Number(item.total || 0).toFixed(2)}
              </p>
            </div>
          )}
        />
      );
    }
    if (activeAppId === 'duo-products') return <DuoProducts />;
    if (activeAppId === 'duo-ops') {
      return (
        <Card>
          <SectionHeader
            title="Operacoes Duo"
            subtitle="Adicione fluxos e relatorios da Duo International."
          />
        </Card>
      );
    }
    return null;
  }, [brandId, activeAppId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <div
          className={`fixed inset-0 z-40 bg-slate-900/40 transition ${
            isMenuOpen ? 'block' : 'hidden'
          } md:hidden`}
          onClick={() => setIsMenuOpen(false)}
          onKeyDown={() => setIsMenuOpen(false)}
          role="button"
          tabIndex={-1}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 flex-shrink-0 border-r border-slate-200 bg-white p-6 shadow-lg transition md:static md:translate-x-0 ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } md:shadow-none`}
        >
          <div className="flex items-center justify-between md:block">
            <div className="flex items-center gap-3">
              <img src={brand.logo} alt={brand.title} className="h-10 w-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {brand.title}
                </p>
                <p className="text-xs text-slate-500">Workspace</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="md:hidden"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            {apps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  setActiveAppId(app.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full rounded-full border px-4 py-3 text-left text-sm font-semibold transition ${
                  activeAppId === app.id
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-brand-500 hover:text-brand-600'
                }`}
              >
                {app.label}
              </button>
            ))}
          </div>
        </aside>
        <div className="flex w-full flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <div className="md:hidden">
                <OutlineIconButton
                  onClick={() => setIsMenuOpen(true)}
                  label="Abrir menu"
                >
                  <Menu className="h-4 w-4" />
                </OutlineIconButton>
              </div>
              <div className="flex items-center justify-center">
                <img src={brand.logo} alt={brand.title} className="h-9 w-auto" />
              </div>
              <div className="relative" data-settings-popover>
                <OutlineIconButton
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  label="Configuracoes"
                >
                  <Settings className="h-4 w-4" />
                </OutlineIconButton>
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <p className="text-sm font-semibold text-slate-900">
                      Configuracoes
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Conecte servicos externos por aqui.
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <a
                        href={`${basePath}/api/bling/connect`}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-brand-500 bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600"
                      >
                        Conectar Bling
                      </a>
                      <PillButton
                        onClick={() =>
                          setBrandId((prev) => (prev === 'duo' ? 'efish' : 'duo'))
                        }
                      >
                        Trocar empresa
                      </PillButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8">
            {activeContent}
          </main>
        </div>
      </div>
    </div>
  );
};
