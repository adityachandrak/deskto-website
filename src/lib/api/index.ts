import type {
  User,
  Product,
  Order,
  Service,
  Wishlist,
  Review,
  Address,
  AuthResponse,
  OrderInput,
  ServiceInput,
  ProductQuery
} from '../types';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Token Storage Keys
const ACCESS_TOKEN_KEY = 'deskto_access_token';
const REFRESH_TOKEN_KEY = 'deskto_refresh_token';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Client with automatic token refresh
// ─────────────────────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (!skipAuth) {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = { ...options, headers };

  let response = await fetch(url, config);

  // If 401, try to refresh token
  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...config, headers });
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, errorData.error || 'Request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Clear tokens if refresh fails
      clearTokens();
      return false;
    }

    const data = await response.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }, true);

    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const result = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);

    setTokens(result.accessToken, result.refreshToken);
    return result;
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY) }),
      });
    } finally {
      clearTokens();
    }
  },
};

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

// ─────────────────────────────────────────────────────────────────────────────
// Products API
// ─────────────────────────────────────────────────────────────────────────────
export const productsApi = {
  async getAll(params?: ProductQuery): Promise<{
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    return request(`/products?${searchParams.toString()}`);
  },

  async getBySlug(slug: string): Promise<Product> {
    return request<Product>(`/products/${encodeURIComponent(slug)}`);
  },

  async getById(id: string): Promise<Product> {
    return request<Product>(`/products/${id}`);
  },

  async create(data: {
    sku: string;
    name: string;
    description?: string;
    price: number;
    comparePrice?: number;
    category: string;
    brand?: string;
    stockQuantity?: number;
    imageUrl?: string;
    specifications?: Record<string, any>;
    tags?: string[];
    marketTag?: string;
    isFeatured?: boolean;
  }): Promise<Product> {
    return request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Product>): Promise<Product> {
    return request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await request(`/products/${id}`, { method: 'DELETE' });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Orders API
// ─────────────────────────────────────────────────────────────────────────────
export const ordersApi = {
  async getMy(params?: { page?: number; limit?: number; status?: string }): Promise<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    return request(`/orders?${searchParams.toString()}`);
  },

  async getByNumber(orderNumber: string): Promise<Order & { items: OrderItem[] }> {
    return request(`/orders/${encodeURIComponent(orderNumber)}`);
  },

  async create(data: OrderInput): Promise<{ id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string }> {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: string, status: string): Promise<{ id: string; orderNumber: string; status: string; updatedAt: string }> {
    return request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Services API
// ─────────────────────────────────────────────────────────────────────────────
export const servicesApi = {
  async getMy(params?: { page?: number; limit?: number; status?: string; serviceType?: string }): Promise<{
    services: Service[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    return request(`/services?${searchParams.toString()}`);
  },

  async getByNumber(serviceNumber: string): Promise<Service> {
    return request(`/services/${encodeURIComponent(serviceNumber)}`);
  },

  async create(data: ServiceInput): Promise<{ id: string; serviceNumber: string; serviceType: string; status: string; createdAt: string }> {
    return request('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(
    id: string,
    data: { status: string; estimatedCost?: number; finalCost?: number; technicianId?: string }
  ): Promise<{ id: string; status: string; updatedAt: string }> {
    return request(`/services/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist API
// ─────────────────────────────────────────────────────────────────────────────
export const wishlistApi = {
  async getMy(): Promise<Wishlist[]> {
    return request<Wishlist[]>('/wishlist');
  },

  async add(productId: string): Promise<void> {
    await request('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  async remove(productId: string): Promise<void> {
    await request(`/wishlist/${productId}`, { method: 'DELETE' });
  },

  async check(productId: string): Promise<boolean> {
    try {
      await request(`/wishlist/check/${productId}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearSession(): void {
  clearTokens();
}
