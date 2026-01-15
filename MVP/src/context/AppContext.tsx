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
import { fetchProducts, createProduct as createProductApi } from '../services/productsService';
import { fetchMe, loginUser, registerUser } from '../services/authService';
import { isAdminEmail } from '../utils/security';

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
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  isAdmin: boolean;
  registerUser: (payload: {
    nome: string;
    email: string;
    password: string;
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
    value: authToken,
    setValue: setAuthToken,
    reset: resetAuthToken,
  } = useLocalStorage<string | null>('budget-auth-token', null);
  const { value: currentUser, setValue: setCurrentUser } = useLocalStorage<
    AuthUser | null
  >('budget-current-user', null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Revalida usuario autenticado com o token salvo
  useEffect(() => {
    let isMounted = true;
    const loadMe = async () => {
      if (!authToken) {
        setCurrentUser(null);
        return;
      }
      try {
        const me = await fetchMe(authToken);
        if (!isMounted) return;
        setCurrentUser(me);
        setClient((prev) => ({
          ...prev,
          nome: me.nome,
          email: me.email,
        }));
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setAuthToken(null);
        setCurrentUser(null);
      }
    };
    loadMe();
    return () => {
      isMounted = false;
    };
  }, [authToken, setAuthToken, setClient, setCurrentUser]);

  // Carrega catalogo do backend
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setProductsLoading(true);
        const data = await fetchProducts(authToken ?? undefined);
        if (!isMounted) return;
        setCatalogProducts(data);
        setProductsError(null);
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
  }, [authToken]);

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

  const isAuthenticated = Boolean(authToken && currentUser);
  const isAdmin =
    currentUser?.role === 'ADMIN' ||
    (currentUser?.email ? isAdminEmail(currentUser.email) : false) ||
    currentUser?.isAdmin === true;

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
    if (!authToken) {
      throw new Error('Autentique-se para adicionar produtos.');
    }
    const created = await createProductApi(productInput, authToken);
    setCatalogProducts((prev) => [...prev, created]);
    return created;
  };

  const handleRegister = async ({
    nome,
    email,
    password,
  }: {
    nome: string;
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    try {
      const { token, user } = await registerUser({ nome, email, password });
      setAuthToken(token);
      setCurrentUser(user);
      setClient({
        ...client,
        nome: user.nome,
        email: user.email,
      });
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
      const { token, user } = await loginUser({ email, password });
      setAuthToken(token);
      setCurrentUser(user);
      setClient({
        ...client,
        nome: user.nome,
        email: user.email,
      });
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
    resetAuthToken();
    setCurrentUser(null);
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
    isAuthenticated,
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
