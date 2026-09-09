import type {
  ApiErrorBody,
  AuthResponse,
  Cart,
  Category,
  CheckoutSession,
  CheckoutStatus,
  Order,
  Product,
  ProductInput,
  ProductSelection,
  ProfileInput,
  SalesOverview,
  UserProfile,
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

interface ProductListFilters {
  search?: string;
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let details: ApiErrorBody | undefined;
    try {
      details = (await response.json()) as ApiErrorBody;
    } catch {
      details = undefined;
    }
    const rawMessage = details?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('. ')
      : rawMessage || details?.error || 'No pudimos completar la solicitud.';
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const api = {
  auth: {
    me: () => request<AuthResponse>('/auth/me'),
    login: (input: { email: string; password: string }) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    register: (input: { email: string; password: string }) =>
      request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  users: {
    profile: () => request<UserProfile>('/users/me'),
    updateProfile: (input: ProfileInput) =>
      request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
  },
  products: {
    categories: () => request<Category[]>('/products/categories'),
    bestSellers: () => request<ProductSelection>('/products/best-sellers'),
    list: ({
      search = '',
      category = '',
      minPriceCents,
      maxPriceCents,
    }: ProductListFilters = {}) => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      if (minPriceCents !== undefined) params.set('minPriceCents', String(minPriceCents));
      if (maxPriceCents !== undefined) params.set('maxPriceCents', String(maxPriceCents));
      const query = params.size ? `?${params}` : '';
      return request<Product[]>(`/products${query}`);
    },
    detail: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  },
  cart: {
    get: () => request<Cart>('/cart'),
    add: (productId: string, quantity = 1) =>
      request<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      }),
    update: (productId: string, quantity: number) =>
      request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }),
    remove: (productId: string) =>
      request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  },
  payments: {
    checkout: () => request<CheckoutSession>('/payments/checkout', { method: 'POST' }),
    checkoutStatus: (sessionId: string) =>
      request<CheckoutStatus>(
        `/payments/checkout/${encodeURIComponent(sessionId)}/status`,
      ),
  },
  orders: {
    list: () => request<Order[]>('/orders'),
    detail: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
    rateItem: (orderId: string, itemId: string, rating: number) =>
      request<Order>(
        `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/rating`,
        { method: 'PUT', body: JSON.stringify({ rating }) },
      ),
  },
  admin: {
    products: () => request<Product[]>('/admin/products'),
    salesOverview: () => request<SalesOverview>('/admin/products/sales-overview'),
    createProduct: (input: ProductInput) =>
      request<Product>('/admin/products', { method: 'POST', body: JSON.stringify(input) }),
    updateProduct: (id: string, input: ProductInput) =>
      request<Product>(`/admin/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    deleteProduct: (id: string) =>
      request<void>(`/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    setProductStatus: (id: string, isActive: boolean) =>
      request<Product>(`/admin/products/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    uploadImage: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return request<Product>(`/admin/products/${encodeURIComponent(id)}/image`, {
        method: 'POST',
        body,
      });
    },
  },
};
