// Contexto global com estado de sessao e carrinho.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type {
  AuthUser,
  ClientData,
  Credentials,
  Product,
  ProductInput,
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  fetchProducts,
  createProduct as createProductApi,
  updateProduct as updateProductApi,
  fetchProductById,
  fetchBlingProducts,
  fetchBlingStock,
  mapBlingProducts,
} from '../services/productsService';
import { fetchMe, loginUser, registerUser, logoutUser } from '../services/authService';

type CartState = Record<
  string,
  {
    product: Product;
    quantity: number;
  }
>;

type AuthResult = { success: boolean; message?: string };

type AppContextValue = {
  client: ClientData;
  updateClient: (data: Partial<ClientData>) => void;
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  cart: CartState;
  cartItems: Array<{ product: Product; quantity: number; subtotal: number }>;
  removeItem: (productId: string) => void;
  changeQuantity: (
    productId: string,
    quantity: number,
    product?: Product,
  ) => void;
  total: number;
  observacoes: string;
  setObservacoes: (value: string) => void;
  resetAll: () => void;
  createProduct: (product: ProductInput) => Promise<Product>;
  updateProduct: (id: string, product: ProductInput) => Promise<Product>;
  getProductById: (id: string) => Promise<Product | null>;
  authReady: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  registerUser: (payload: {
    nome: string;
    email: string;
    password: string;
    cnpj: string;
  }) => Promise<AuthResult>;
  login: (payload: Credentials) => Promise<AuthResult>;
  logout: () => void;
};

const emptyClient: ClientData = {
  nome: '',
  email: '',
  empresa: '',
  telefone: '',
  cnpjCpf: '',
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const { value: client, setValue: setClient, reset: resetClient } =
    useLocalStorage<ClientData>('budget-client', emptyClient);
  const { value: cart, setValue: setCart, reset: resetCart } = useLocalStorage<
    CartState
  >('budget-cart', {});
  const {
    value: observacoes,
    setValue: setObservacoes,
    reset: resetObservacoes,
  } = useLocalStorage<string>('budget-observacoes', '');
  const {
    value: currentUser,
    setValue: setCurrentUser,
  } = useLocalStorage<
    AuthUser | null
  >('budget-current-user', null);
  const [authReady, setAuthReady] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Revalida usuario autenticado por sessao
  useEffect(() => {
    let isMounted = true;
    const loadMe = async () => {
      try {
        const me = await fetchMe();
        if (!isMounted) return;
        setCurrentUser(me);
        setClient((prev) => ({
          ...prev,
          nome: me.nome,
          email: me.email,
          cnpjCpf: me.cnpjCpf ?? '',
        }));
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };
    loadMe();
    return () => {
      isMounted = false;
    };
  }, [setClient, setCurrentUser]);

  // Carrega catalogo do backend
  useEffect(() => {
    let isMounted = true;
    if (!authReady) {
      return () => {
        isMounted = false;
      };
    }
    const approved = !currentUser?.status || currentUser.status === 'ACTIVE';
    if (!currentUser || !approved) {
      setCatalogProducts([]);
      setProductsLoading(false);
      return () => {
        isMounted = false;
      };
    }
    const load = async () => {
      try {
        setProductsLoading(true);
        const localProducts = await fetchProducts();
        let blingProducts: Product[] = [];
        let blingList: Awaited<ReturnType<typeof fetchBlingProducts>> = [];
        let stockList: Awaited<ReturnType<typeof fetchBlingStock>> = [];
        try {
          blingList = await fetchBlingProducts();
        } catch (blingError) {
          console.error(blingError);
          setProductsError(
            'Bling indisponivel no momento. Mostrando produtos locais.',
          );
        }
        if (blingList.length) {
          const codes = blingList
            .map((item) => item.codigo)
            .filter(Boolean) as string[];
          try {
            stockList = await fetchBlingStock({ codes });
          } catch (stockError) {
            console.error(stockError);
          }
          blingProducts = mapBlingProducts(blingList, stockList);
        }
        if (!isMounted) return;
        setCatalogProducts([...localProducts, ...blingProducts]);
        if (!blingProducts.length) {
          setProductsError(
            (prev) =>
              prev || 'Bling indisponivel no momento. Mostrando produtos locais.',
          );
        } else {
          setProductsError(null);
        }
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setProductsError('Nao foi possivel carregar o catalogo.');
      } finally {
        if (isMounted) {
          setProductsLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [authReady, currentUser]);

  const cartItems = useMemo(
    () =>
      Object.values(cart).map(({ product, quantity }) => ({
        product,
        quantity,
        subtotal: quantity * product.preco,
      })),
    [cart],
  );

  const total = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  const products = useMemo(() => [...catalogProducts], [catalogProducts]);

  const isAuthenticated = Boolean(currentUser);
  const isApproved = !currentUser?.status || currentUser.status === 'ACTIVE';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isAdmin === true;

  const updateClient = (data: Partial<ClientData>) => {
    setClient({ ...client, ...data });
  };

  const changeQuantity = (
    productId: string,
    quantity: number,
    product?: Product,
  ) => {
    if (quantity <= 0) {
      if (cart[productId]) {
        const newCart = { ...cart };
        delete newCart[productId];
        setCart(newCart);
      }
      return;
    }

    const target =
      cart[productId]?.product ??
      product ??
      products.find((item) => item.id === productId);
    if (!target) return;

    setCart({
      ...cart,
      [productId]: {
        product: target,
        quantity,
      },
    });
  };

  const removeItem = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
  };

  const resetAll = () => {
    resetClient();
    resetCart();
    resetObservacoes();
  };

  const createProduct = async (productInput: ProductInput) => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem adicionar produtos.');
    }
    const created = await createProductApi(productInput);
    setCatalogProducts((prev) => [...prev, created]);
    return created;
  };

  const updateProduct = async (id: string, productInput: ProductInput) => {
    if (!isAdmin) {
      throw new Error('Apenas administradores podem editar produtos.');
    }
    const updated = await updateProductApi(id, productInput);
    setCatalogProducts((prev) =>
      prev.map((item) => (String(item.id) === String(id) ? updated : item)),
    );
    return updated;
  };

  const getProductById = async (id: string) => {
    const existing = catalogProducts.find((item) => String(item.id) === String(id));
    if (existing) return existing;
    try {
      return await fetchProductById(id);
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const handleRegister = async ({
    nome,
    email,
    password,
    cnpj,
  }: {
    nome: string;
    email: string;
    password: string;
    cnpj: string;
  }): Promise<AuthResult> => {
    try {
      const { user } = await registerUser({ nome, email, password, cnpj });
      setCurrentUser(user);
      setClient({
        ...client,
        nome: user.nome,
        email: user.email,
        cnpjCpf: user.cnpjCpf ?? '',
      });
      setAuthReady(true);
      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: (error as Error).message || 'Nao foi possivel cadastrar.',
      };
    }
  };

  const handleLogin = async ({
    email,
    password,
  }: Credentials): Promise<AuthResult> => {
    try {
      const { user } = await loginUser({ email, password });
      setCurrentUser(user);
      setClient({
        ...client,
        nome: user.nome,
        email: user.email,
        cnpjCpf: user.cnpjCpf ?? '',
      });
      setAuthReady(true);
      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: (error as Error).message || 'Credenciais invalidas.',
      };
    }
  };

  const logout = () => {
    logoutUser().catch(() => {});
    setCurrentUser(null);
    setAuthReady(true);
    resetAll();
  };

  const value: AppContextValue = {
    client,
    updateClient,
    products,
    productsLoading,
    productsError,
    cart,
    cartItems,
    removeItem,
    changeQuantity,
    total,
    observacoes,
    setObservacoes,
    resetAll,
    createProduct,
    updateProduct,
    getProductById,
    authReady,
    isAuthenticated,
    isApproved,
    currentUser,
    isAdmin,
    registerUser: handleRegister,
    login: handleLogin,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext deve ser usado dentro do AppProvider');
  }
  return ctx;
};
