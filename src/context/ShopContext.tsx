import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, CartItem, CustomerProfile, Order, PageView } from '../types';
import { INITIAL_PRODUCTS } from '../data/seedData';
import { auth } from '../firebase';
import {
  connectAdminGoogleCloudSync,
  disconnectAdminGoogleCloudSync,
  isAuthorizedCloudAdmin,
  subscribeToFirestoreCatalog,
  syncInitialCatalogToFirestore,
} from '../utils/firestoreCatalog';
import { mergeCatalogSources } from '../utils/productCatalog';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface CloudCatalogState {
  connected: boolean;
  authorized: boolean;
  email: string | null;
  seeded: boolean;
  firestoreCount: number;
  checking: boolean;
  connectGoogleCloud: () => Promise<{ success: boolean; error?: string }>;
  disconnectGoogleCloud: () => Promise<void>;
  syncLocalCatalogNow: () => Promise<number>;
}

interface ShopContextType {
  products: Product[];
  isLoadingProducts: boolean;
  cloudCatalog: CloudCatalogState;
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  viewProduct: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  isWishlistDrawerOpen: boolean;
  setIsWishlistDrawerOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  user: CustomerProfile | null;
  isCheckingAuth: boolean;
  refreshAuth: () => Promise<void>;
  login: (email: string, password: string, adminOnly?: boolean) => Promise<{ success: boolean; user?: CustomerProfile; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  lastOrder: Order | null;
  setLastOrder: (order: Order | null) => void;
  orders: Order[];
  refreshOrders: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshProducts: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const parseHash = (): { page: PageView; productId: string | null } => {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (!raw || raw === 'home') return { page: 'home', productId: null };

    if (raw.startsWith('product/')) {
      const id = raw.replace('product/', '');
      return { page: 'product-detail', productId: id || null };
    }

    const validPages: PageView[] = [
      'home', 'shop', 'men', 'women', 'watches', 'new-arrivals', 'best-sellers',
      'offers', 'product-detail', 'cart', 'checkout', 'order-confirmation',
      'account', 'orders', 'login', 'register', 'forgot-password', 'about',
      'contact', 'faq', 'shipping', 'returns', 'privacy', 'terms', 'admin'
    ];

    if (validPages.includes(raw as PageView)) {
      return { page: raw as PageView, productId: null };
    }
  } catch (e) {
    console.error(e);
  }
  return { page: 'home', productId: null };
};

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiProducts, setApiProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreSeeded, setFirestoreSeeded] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [cloudAuthorized, setCloudAuthorized] = useState(false);
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);
  const [cloudChecking, setCloudChecking] = useState(true);
  const initialHash = typeof window !== 'undefined' ? parseHash() : { page: 'home' as PageView, productId: null };
  const [currentPage, setCurrentPage] = useState<PageView>(initialHash.page);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialHash.productId);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('rgd_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [promoCode, setPromoCode] = useState('');
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rgd_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Hash listener for browser Back/Forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const { page, productId } = parseHash();
      setCurrentPage(page);
      if (productId) {
        setSelectedProductId(productId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync state to hash URL
  useEffect(() => {
    try {
      let targetHash = currentPage === 'home' ? '' : `#/${currentPage}`;
      if (currentPage === 'product-detail' && selectedProductId) {
        targetHash = `#/product/${selectedProductId}`;
      }
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash || window.location.pathname);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentPage, selectedProductId]);

  // Sync cart & wishlist to local storage (never auth tokens or passwords)
  useEffect(() => {
    try {
      localStorage.setItem('rgd_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('rgd_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error(e);
    }
  }, [wishlist]);

  // Purge any legacy insecure auth keys if left over from earlier versions
  useEffect(() => {
    try {
      localStorage.removeItem('rgd_admin_token');
      localStorage.removeItem('rgd_user');
    } catch {
      // ignore storage errors
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Monitor Firebase Google Auth session for permanent Cloud Firestore admin mutations
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setCloudConnected(false);
        setCloudAuthorized(false);
        setCloudEmail(null);
        setCloudChecking(false);
        return;
      }
      setCloudConnected(true);
      setCloudEmail(fbUser.email || null);
      const ok = await isAuthorizedCloudAdmin(fbUser);
      setCloudAuthorized(ok);
      setCloudChecking(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to persistent Cloud Firestore catalog in real time
  useEffect(() => {
    const unsub = subscribeToFirestoreCatalog(
      ({ products: fsList, seeded }) => {
        setFirestoreProducts(fsList);
        setFirestoreSeeded(seeded);
        setIsLoadingProducts(false);
      },
      (err) => {
        console.warn('Firestore catalog listener fallback:', err.message);
        setIsLoadingProducts(false);
      }
    );
    return () => unsub();
  }, []);

  const fetchProducts = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/products?refresh=1' : '/api/products';
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          setApiProducts(data.products);
        }
      }
    } catch (err) {
      console.warn('Using fallback products cache', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  const refreshProducts = useCallback(async () => {
    await fetchProducts(true);
  }, [fetchProducts]);

  const products = useMemo(
    () =>
      mergeCatalogSources({
        firestoreProducts,
        firestoreSeeded,
        apiProducts,
      }),
    [firestoreProducts, firestoreSeeded, apiProducts]
  );

  const connectGoogleCloud = useCallback(async () => {
    const res = await connectAdminGoogleCloudSync();
    if (!res.success) {
      return { success: false, error: res.error };
    }
    setCloudConnected(true);
    setCloudAuthorized(true);
    setCloudEmail(res.user?.email || null);
    try {
      const syncedCount = await syncInitialCatalogToFirestore(apiProducts, false);
      if (syncedCount > 0) {
        showToast(`Cloud database connected & ${syncedCount} product(s) synced permanently.`);
      } else {
        showToast('Cloud database connected. All products persist permanently.');
      }
    } catch (err: any) {
      console.warn('Initial cloud sync warning:', err?.message || err);
    }
    return { success: true };
  }, [apiProducts]);

  const disconnectGoogleCloud = useCallback(async () => {
    await disconnectAdminGoogleCloudSync();
    setCloudConnected(false);
    setCloudAuthorized(false);
    setCloudEmail(null);
    showToast('Google Cloud Sync disconnected.', 'info');
  }, []);

  const syncLocalCatalogNow = useCallback(async () => {
    const count = await syncInitialCatalogToFirestore(apiProducts, false);
    await refreshProducts();
    return count;
  }, [apiProducts, refreshProducts]);

  const cloudCatalog: CloudCatalogState = useMemo(
    () => ({
      connected: cloudConnected,
      authorized: cloudAuthorized,
      email: cloudEmail,
      seeded: firestoreSeeded,
      firestoreCount: firestoreProducts.length,
      checking: cloudChecking,
      connectGoogleCloud,
      disconnectGoogleCloud,
      syncLocalCatalogNow,
    }),
    [
      cloudConnected,
      cloudAuthorized,
      cloudEmail,
      firestoreSeeded,
      firestoreProducts.length,
      cloudChecking,
      connectGoogleCloud,
      disconnectGoogleCloud,
      syncLocalCatalogNow,
    ]
  );

  const refreshOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }
    try {
      const res = await fetch('/api/orders', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Keep cart product snapshots synchronized with live catalog prices/images
  useEffect(() => {
    if (!products.length) return;
    setCart((prev) =>
      prev.map((item) => {
        const latest = products.find((p) => p.id === item.product.id);
        return latest ? { ...item, product: latest } : item;
      })
    );
  }, [products]);

  const viewProduct = (id: string) => {
    setSelectedProductId(id);
    setCurrentPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: Product, quantity = 1, size?: string, color?: string) => {
    const chosenSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    const chosenColor = color || (product.colors && product.colors.length > 0 ? product.colors[0].name : undefined);

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === chosenSize &&
          item.selectedColor === chosenColor
      );

      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        return [...prev, { product, quantity, selectedSize: chosenSize, selectedColor: chosenColor }];
      }
    });

    showToast(`Added "${product.name}" to your shopping bag.`);
  };

  const removeFromCart = (productId: string, size?: string, color?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
      )
    );
    showToast('Item removed from shopping bag.', 'info');
  };

  const updateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.selectedSize === size && item.selectedColor === color) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode('');
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from curated wishlist.', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to your private wishlist.');
        return [...prev, productId];
      }
    });
  };

  const login = async (email: string, password: string, adminOnly = false) => {
    try {
      const endpoint = adminOnly ? '/api/auth/admin/login' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      setUser(data.user);

      if (data.user.role === 'admin') {
        showToast('Welcome, Maison Director. Secure session verified.');
      } else {
        showToast(`Welcome back, ${data.user.name}.`);
      }

      return { success: true, user: data.user };
    } catch {
      return { success: false, error: 'Network error communicating with authentication service.' };
    }
  };

  const register = async (userData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      showToast(`Welcome to Maison RGD LUXE, ${data.user.name}.`);
      return { success: true };
    } catch {
      return { success: false, error: 'Registration network error.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    setUser(null);
    setOrders([]);
    showToast('You have securely logged out.', 'info');
    setCurrentPage('home');
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        isLoadingProducts,
        cloudCatalog,
        currentPage,
        setCurrentPage,
        selectedProductId,
        setSelectedProductId,
        viewProduct,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        promoCode,
        setPromoCode,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        isWishlistDrawerOpen,
        setIsWishlistDrawerOpen,
        wishlist,
        toggleWishlist,
        user,
        isCheckingAuth,
        refreshAuth,
        login,
        register,
        logout,
        lastOrder,
        setLastOrder,
        orders,
        refreshOrders,
        searchQuery,
        setSearchQuery,
        refreshProducts,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
