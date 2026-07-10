// ──────────────────────────────────────────────────────────────────────────
//  DESKTO API client
// ──────────────────────────────────────────────────────────────────────────
//  Browser-side fetch wrappers for the Node/Express backend at
//  `import.meta.env.VITE_API_URL || "/api"`. Used by currentUser, apiData,
//  and dashboardData so login, signup, products, orders, services and
//  wishlist all hit the real PostgreSQL store when an API is available.
// ──────────────────────────────────────────────────────────────────────────

import type {
  ApiOrder, ApiProduct, ApiService, ApiWishlistItem,
  AuthResponse, CreateOrderInput, RefreshResponse,
} from "./apiTypes";

// ── Token storage ────────────────────────────────────────────────────────
// Frontend keeps tokens in localStorage so a hard refresh keeps the user
// signed in. The keys mirror what AdminDashboard already uses.
const ACCESS_TOKEN_KEY = "deskto_access_token";
const REFRESH_TOKEN_KEY = "deskto_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}
export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch { /* ignore quota errors */ }
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}
export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* ignore */ }
}
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
export function clearSession() {
  setAccessToken(null);
  setRefreshToken(null);
}

// ── Low-level fetch wrapper ──────────────────────────────────────────────
const API_BASE: string =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== "/api")
    ? import.meta.env.VITE_API_URL
    : "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions extends RequestInit {
  json?: unknown;
  retryOn401?: boolean;
}

async function apiFetch<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";

  const accessToken = getAccessToken();
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (opts.json !== undefined) body = JSON.stringify(opts.json);
  else if (opts.body) body = opts.body;

  const res = await fetch(url, {
    ...opts,
    headers,
    body,
    credentials: "omit",
  });

  // 401 → try silent refresh once before failing.
  if (res.status === 401 && opts.retryOn401 !== false && getRefreshToken()) {
    try {
      const r = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
      if (r.ok) {
        const data = (await r.json()) as RefreshResponse;
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        // Retry original request once
        return apiFetch<T>(path, { ...opts, retryOn401: false });
      }
      clearSession();
    } catch { /* fall through to throw */ }
  }

  let parsed: unknown = null;
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  // CloudFront routing fallback: when a request URL fails to match the
  // /api/* cache behavior (e.g. a path with `//` collapses badly), CloudFront
  // returns the SPA index.html with status 200 + text/html. Without this guard
  // the caller would silently receive the HTML body as if it were JSON.
  if (res.ok && contentType.toLowerCase().includes("text/html")) {
    throw new ApiError(
      502,
      `API route not reachable (received HTML at ${url}). The request likely hit the CloudFront default behavior instead of the /api/* origin.`,
      text,
    );
  }

  if (text) {
    try { parsed = JSON.parse(text); }
    catch { parsed = text; }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)
        ? String((parsed as Record<string, unknown>).error)
        : (parsed && typeof parsed === "object" && "message" in (parsed as Record<string, unknown>)
          ? String((parsed as Record<string, unknown>).message)
          : `Request failed: ${res.status}`));
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

// ── authApi ──────────────────────────────────────────────────────────────
export const authApi = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      json: { identifier, password },
      retryOn401: false,
    });
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    return res;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    role?: string;
    adminCode?: string;
    staffId?: string;
    department?: string;
  }): Promise<AuthResponse> {
    const res = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      json: data,
      retryOn401: false,
    });
    setAccessToken(res.accessToken);
    setRefreshToken(res.refreshToken);
    return res;
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        json: refreshToken ? { refreshToken } : {},
      });
    } finally {
      clearSession();
    }
  },

  async getMe(): Promise<{ id: string; email: string; phone?: string; firstName: string; lastName?: string; role: "admin" | "staff" | "customer"; status?: string; createdAt?: string }> {
    return apiFetch("/auth/me");
  },

  async refresh(): Promise<RefreshResponse> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, "No refresh token");
    const res = await apiFetch<RefreshResponse>("/auth/refresh", {
      method: "POST",
      json: { refreshToken },
      retryOn401: false,
    });
    setAccessToken(res.accessToken);
    if (res.refreshToken) setRefreshToken(res.refreshToken);
    return res;
  },
};

// ── productsApi ──────────────────────────────────────────────────────────
export const productsApi = {
  async getAll(params?: { page?: number; limit?: number; category?: string; brand?: string; search?: string; minPrice?: number; maxPrice?: number; sortBy?: string; sortOrder?: "ASC" | "DESC" }): Promise<{ products: ApiProduct[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    return apiFetch(`/products${qs}`);
  },

  async getBySlug(slug: string): Promise<ApiProduct> {
    return apiFetch(`/products/${encodeURIComponent(slug)}`);
  },
};

// ── ordersApi ────────────────────────────────────────────────────────────
export const ordersApi = {
  async getMy(params?: { page?: number; limit?: number; status?: string }): Promise<{ orders: ApiOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    return apiFetch(`/orders/my${qs}`);
  },

  async getByNumber(orderNumber: string): Promise<ApiOrder> {
    if (!orderNumber || typeof orderNumber !== "string" || orderNumber.trim() === "") {
      throw new ApiError(400, "Order number is required", { orderNumber });
    }
    return apiFetch(`/orders/${encodeURIComponent(orderNumber.trim())}`);
  },

  // Admin/staff: list all orders across customers
  async getAll(params?: { page?: number; limit?: number; status?: string }): Promise<{ orders: ApiOrder[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    return apiFetch(`/orders${qs}`);
  },

  async create(input: CreateOrderInput): Promise<{ id: string; orderNumber: string; status: string; totalAmount: number; createdAt: string }> {
    // The backend stores `pincode` as `postalCode` — translate here so the
    // frontend can keep using `pincode`.
    const payload = {
      items: input.items.map((it) => ({
        sku: it.sku,
        productId: it.productId,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        img: it.img,
      })),
      shippingAddress: {
        ...input.shippingAddress,
        postalCode: input.shippingAddress.pincode,
      },
      billingAddress: input.billingAddress,
      deliveryMethod: input.deliveryMethod,
      deliveryZone: input.deliveryZone,
      productSizeCategory: input.productSizeCategory,
      deliveryCharge: input.deliveryCharge,
      deliveryChargeStatus: input.deliveryChargeStatus,
      deliveryNote: input.deliveryNote,
      estimatedDeliveryTime: input.estimatedDeliveryTime,
      notes: input.notes,
    };
    return apiFetch(`/orders`, { method: "POST", json: payload });
  },

  async updateStatus(orderId: string, status: string): Promise<{ id: string; orderNumber: string; status: string }> {
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      throw new ApiError(400, "Order ID is required to update status", { orderId });
    }
    return apiFetch(`/orders/${encodeURIComponent(orderId.trim())}/status`, {
      method: "PATCH",
      json: { status },
    });
  },

  async updateDeliveryCharge(orderId: string, deliveryCharge: number): Promise<{ id: string; orderNumber: string; shippingAmount: number; totalAmount: number; shippingAddress?: Record<string, unknown> }> {
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      throw new ApiError(400, "Order ID is required to update delivery charge", { orderId });
    }
    return apiFetch(`/orders/${encodeURIComponent(orderId.trim())}/delivery-charge`, {
      method: "PATCH",
      json: { deliveryCharge },
    });
  },
};

// ── servicesApi ──────────────────────────────────────────────────────────
export const servicesApi = {
  async getMy(params?: { page?: number; limit?: number; status?: string }): Promise<{ services: ApiService[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    return apiFetch(`/services/my${qs}`);
  },

  async getAll(params?: { page?: number; limit?: number; status?: string; serviceType?: string }): Promise<{ services: ApiService[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString() : "";
    return apiFetch(`/services${qs}`);
  },

  async create(input: { serviceType: "repair" | "upgrade" | "rental" | "assembly" | "support"; title: string; description?: string; deviceInfo?: unknown }): Promise<{ id: string; serviceNumber: string; serviceType: string; status: string; title: string; createdAt: string }> {
    return apiFetch(`/services`, { method: "POST", json: input });
  },

  async createQuickEnquiry(input: { name: string; contact: string; serviceNeeded: string; requirements?: string }): Promise<{ id: string; serviceNumber: string; serviceType: string; status: string; title: string; createdAt: string }> {
    return apiFetch(`/services/quick-enquiry`, { method: "POST", json: input, retryOn401: false });
  },

  async updateStatus(serviceId: string, status: string, extras?: { estimatedCost?: number; finalCost?: number; technicianId?: string }): Promise<{ id: string; serviceNumber: string; status: string }> {
    if (!serviceId || typeof serviceId !== "string" || serviceId.trim() === "") {
      throw new ApiError(400, "Service ID is required to update status", { serviceId });
    }
    return apiFetch(`/services/${encodeURIComponent(serviceId.trim())}/status`, {
      method: "PATCH",
      json: { status, ...(extras || {}) },
    });
  },
};

// ── wishlistApi ──────────────────────────────────────────────────────────
// NOTE: Backend `/api/wishlist` route is not yet implemented in
// `backend/src/routes/`. The wishlist continues to work via localStorage
// (see `dashboardData.ts`). These calls throw a clear ApiError so callers
// can decide whether to fall back or surface a "feature coming soon" UI.
export const wishlistApi = {
  async getMy(): Promise<{ items: ApiWishlistItem[] }> {
    return apiFetch(`/wishlist`);
  },
  async add(productId: string): Promise<{ success: boolean }> {
    return apiFetch(`/wishlist`, { method: "POST", json: { productId } });
  },
  async remove(productId: string): Promise<{ success: boolean }> {
    return apiFetch(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" });
  },
};

// Re-export so existing imports keep working
export type { ApiOrder, ApiProduct, ApiService, ApiWishlistItem, AuthResponse };
