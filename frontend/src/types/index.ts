export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  role: Role;
  createdAt?: string;
}

export interface UserProfile extends User {
  displayName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ProfileInput = Partial<Pick<UserProfile, 'displayName' | 'phone' | 'address' | 'city' | 'country'>>;

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  imageUrl: string | null;
  ratingAverage?: number | null;
  ratingCount?: number;
  categoryId: string;
  category: Category;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSelection {
  selection: 'best-sellers' | 'featured';
  products: Product[];
}

export interface SalesOverview {
  totalUnitsSold: number;
  totalOrders: number;
  totalRevenueCents: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  rating: number | null;
}

export interface Order {
  id: string;
  userId?: string;
  status: OrderStatus;
  currency: string;
  totalCents: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface CheckoutStatus {
  sessionId: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  orderId: string | null;
}

export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface AuthResponse {
  user: User;
}

export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  isActive: boolean;
  categoryId?: string;
}
