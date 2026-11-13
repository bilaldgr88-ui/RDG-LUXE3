export type ProductCategory = 'men' | 'women' | 'watches';

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  images?: string[];
  additionalImages?: string[];
  description: string;
  details: string[];
  composition: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  inStock: boolean;
  stockCount: number;
  discountEnabled?: boolean;
  discountPercentage?: number;
  isDemo?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isSpecialOffer?: boolean;
  sku: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  role: 'customer' | 'admin';
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cod' | 'card_demo';
  paymentStatus: 'paid' | 'pending' | 'demo_unpaid';
  orderStatus: 'Processing' | 'Confirmed' | 'Dispatched' | 'Delivered' | 'Cancelled';
  trackingNumber: string;
  notes?: string;
}

export type PageView =
  | 'home'
  | 'shop'
  | 'men'
  | 'women'
  | 'watches'
  | 'new-arrivals'
  | 'best-sellers'
  | 'offers'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-confirmation'
  | 'account'
  | 'orders'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'about'
  | 'contact'
  | 'faq'
  | 'shipping'
  | 'returns'
  | 'privacy'
  | 'terms'
  | 'admin';
