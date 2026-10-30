export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiErrorResponse {
  message: string;
  code: string;
  errors?: Record<string, string>;
  available?: number;
  retryAfterSeconds?: number;
  items?: Array<{
    productId: string;
    title: string;
    slug: string;
    requested: number;
    available: number;
  }>;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface CategoryFilter {
  key: string;
  label: string;
  type: 'checkbox' | 'radio' | 'color' | 'range';
  options?: FilterOption[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  image: string;
  productsCount: number;
}

export interface CategoryDetail extends CategorySummary {
  filters: CategoryFilter[];
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand: string;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  currency: string;
  rating: number;
  reviewsCount: number;
  stock: number;
  inStock: boolean;
  warrantyMonths: number;
  image: string;
  images: string[];
  specs: Record<string, string>;
  attributes?: Record<string, string>;
  category: {
    slug: string;
    name: string;
  };
  createdAt: string;
}

export interface ProductDetail extends Product {
  related: Product[];
}

export interface ProductsListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sort: string;
}

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
}

export interface AddressInput {
  label?: string | null;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  isDefault?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  qty: number;
  lineTotal: number;
  product: {
    id: string;
    slug: string;
    title: string;
    brand: string;
    image: string;
    price: number;
    oldPrice: number | null;
    currency: string;
    stock: number;
    inStock: boolean;
  };
}

export interface Cart {
  items: CartItem[];
  totalQty: number;
  subtotal: number;
  currency: string;
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  city: string;
  address: string;
}

export interface CheckoutSummary {
  items: CartItem[];
  totalQty: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  freeShippingFrom: number;
  shipping: ShippingInfo;
  addresses: Address[];
}

export interface CreateOrderResponse {
  orderId: string;
  status: 'pending_payment' | 'paid';
  total: number;
  currency: string;
  message: string;
  expiresInMinutes: number;
  devCode?: string;
}

export interface OrderItem {
  productId: string | null;
  slug: string;
  title: string;
  image: string;
  price: number;
  qty: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: 'pending_payment' | 'paid';
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  shipping: ShippingInfo;
  payment: {
    brand: string;
    last4: string;
  };
  createdAt: string;
  paidAt: string | null;
}
