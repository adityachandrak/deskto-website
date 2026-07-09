// ──────────────────────────────────────────────────────────────────────────
//  DESKTO API Data Layer
//  React hooks for fetching data from the backend API.
//  Falls back to localStorage for demo mode when API is unavailable.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { productsApi, ordersApi, servicesApi, wishlistApi } from "@/lib/api";
import type { Product, Order, Service, Wishlist, ProductQuery } from "@/lib/types";
import { isAuthenticated } from "@/app/lib/currentUser";

// Feature flag: Use API if available
const USE_API = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api';

// ─────────────────────────────────────────────────────────────────────────────
// Products Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useProducts(query?: ProductQuery) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchProducts = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    setError(null);
    try {
      const response = await productsApi.getAll(query);
      setProducts(response.products);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (USE_API) {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [fetchProducts]);

  return { products, loading, error, pagination, refetch: fetchProducts };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Product Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_API) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    productsApi.getBySlug(slug)
      .then(setProduct)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch product'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { product, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orders Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useOrders(params?: { page?: number; limit?: number; status?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchOrders = useCallback(async () => {
    if (!USE_API || !isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await ordersApi.getMy(params);
      setOrders(response.orders);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, pagination, refetch: fetchOrders };
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Order Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useOrder(orderNumber: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_API || !isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    ordersApi.getByNumber(orderNumber)
      .then(data => setOrder(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch order'))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  return { order, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Services Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useServices(params?: {
  page?: number;
  limit?: number;
  status?: string;
  serviceType?: string;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchServices = useCallback(async () => {
    if (!USE_API || !isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await servicesApi.getMy(params);
      setServices(response.services);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, pagination, refetch: fetchServices };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useWishlist() {
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!USE_API || !isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await wishlistApi.getMy();
      setWishlist(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = useCallback(async (productId: string) => {
    if (!USE_API || !isAuthenticated()) return;
    try {
      await wishlistApi.add(productId);
      await fetchWishlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to wishlist');
    }
  }, [fetchWishlist]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!USE_API || !isAuthenticated()) return;
    try {
      await wishlistApi.remove(productId);
      await fetchWishlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from wishlist');
    }
  }, [fetchWishlist]);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some(item => item.productId === productId);
  }, [wishlist]);

  return {
    wishlist,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refetch: fetchWishlist,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Actions
// ─────────────────────────────────────────────────────────────────────────────
export function useOrderActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (data: {
    items: { productId: string; sku?: string; quantity: number }[];
    shippingAddress: any;
    billingAddress?: any;
    notes?: string;
  }) => {
    if (!USE_API || !isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    // Backend requires each items.*.productId to be a UUID. Surface a clear
    // error here instead of letting the backend reject the request with a
    // 400 that's been observed to bubble up as the generic "Failed to create
    // order" string in the checkout flow.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const it of data.items) {
      if (!it.productId || typeof it.productId !== "string" || !UUID_RE.test(it.productId)) {
        throw new Error(`createOrder: item missing backend productId UUID (sku=${it.sku ?? "<none>"})`);
      }
    }
    setLoading(true);
    setError(null);
    try {
      const result = await ordersApi.create(data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createOrder, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Actions
// ─────────────────────────────────────────────────────────────────────────────
export function useServiceActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createService = useCallback(async (data: {
    serviceType: 'repair' | 'upgrade' | 'rental' | 'assembly' | 'support';
    title: string;
    description?: string;
    deviceInfo?: any;
  }) => {
    if (!USE_API || !isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    setLoading(true);
    setError(null);
    try {
      const result = await servicesApi.create(data);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create service';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createService, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export API availability status
// ─────────────────────────────────────────────────────────────────────────────
export function isApiAvailable(): boolean {
  return USE_API;
}
