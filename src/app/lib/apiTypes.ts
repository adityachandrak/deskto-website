// ──────────────────────────────────────────────────────────────────────────
//  DESKTO API — shared response types + mappers to frontend shapes
// ──────────────────────────────────────────────────────────────────────────
//  These mirror what the backend (`backend/src/routes/*`) returns. Keep
//  field names in sync with the handlers when either side changes.
// ──────────────────────────────────────────────────────────────────────────

import type { Order, OrderItem, ServiceRequest } from "./dashboardData";

// Auth ────────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  role: "admin" | "staff" | "customer";
  status?: "active" | "inactive" | "suspended" | "locked";
  createdAt?: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

// Products ───────────────────────────────────────────────────────────────
export interface ApiProduct {
  id: string;
  sku: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  comparePrice?: number | null;
  category: string;
  brand?: string;
  stockQuantity: number;
  imageUrl?: string;
  images?: { id: string; url: string; thumbnailUrl?: string; isPrimary?: boolean }[];
  status?: string;
  isActive?: boolean;
}

export interface ApiListResponse<T> {
  data: T[];
  products?: T[];
  orders?: T[];
  services?: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Orders ─────────────────────────────────────────────────────────────────
export interface ApiOrderItem {
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName?: string;
  productImage?: string;
  img?: string;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: Record<string, unknown>;
  items: ApiOrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderInput {
  items: { sku?: string; productId?: string; name?: string; price?: number; quantity: number; img?: string }[];
  shippingAddress: {
    name: string;
    phone: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;        // backend stores as `postalCode`
    country: string;
  };
  billingAddress?: Record<string, unknown>;
  notes?: string;
}

// Services ───────────────────────────────────────────────────────────────
export interface ApiService {
  id: string;
  serviceNumber: string;
  serviceType: "repair" | "upgrade" | "rental" | "assembly" | "support";
  status: string;
  title: string;
  description?: string;
  deviceInfo?: {
    source?: string;
    serviceNeeded?: string;
    contact?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    [key: string]: unknown;
  };
  estimatedCost?: number;
  finalCost?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

// Wishlist ───────────────────────────────────────────────────────────────
export interface ApiWishlistItem {
  productId: string;
  productName: string;
  productImage?: string;
  productPrice: number;
  addedAt: string;
}

// Mappers ────────────────────────────────────────────────────────────────

export function apiOrderToFrontend(o: ApiOrder): Order {
  const createdAt = typeof o.createdAt === "string" ? new Date(o.createdAt).getTime() : Date.now();
  return {
    id: o.orderNumber,                       // keep the human-friendly id in UI
    customerId: "",
    items: (o.items || []).map((it): OrderItem => ({
      productId: 0,
      name: it.name || it.productName || "Item",
      qty: it.quantity,
      price: it.unitPrice,
      img: it.img || it.productImage || "",
    })),
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    total: o.totalAmount,
    subtotal: o.subtotal,
    gst: o.taxAmount,
    shipping: o.shippingAmount,
    discount: o.discountAmount,
    paymentMethod: o.paymentMethod,
    deliveryMethod: o.shippingAddress ? "ship" : "pickup",
    shippingAddress: o.shippingAddress as Order["shippingAddress"],
    status: (["placed", "verified", "packing", "shipped", "delivered", "cancelled"].includes(o.status)
      ? o.status
      : "placed") as Order["status"],
    createdAt,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).getTime() : createdAt,
    addressId: "",
    trackingSteps: [],
    invoiceId: `INV-${(o.orderNumber || "").slice(-6).toUpperCase()}`,
  };
}

export function apiServiceToFrontend(s: ApiService): ServiceRequest {
  const createdAt = typeof s.createdAt === "string" ? new Date(s.createdAt).getTime() : Date.now();
  // Backend serviceType → frontend ServiceRequestKind (closest match)
  const kind = (s.serviceType === "upgrade" || s.serviceType === "rental"
    || s.serviceType === "assembly" || s.serviceType === "support"
    ? s.serviceType
    : "support") as ServiceRequest["kind"];
  const deviceInfo = s.deviceInfo || {};
  const serviceNeeded = typeof deviceInfo.serviceNeeded === "string" ? deviceInfo.serviceNeeded : kind;
  const source = typeof deviceInfo.source === "string" ? deviceInfo.source : "";
  const deviceContact = typeof deviceInfo.contact === "string" ? deviceInfo.contact : undefined;
  return {
    id: s.serviceNumber,
    customerId: s.customerEmail || s.customerPhone || "quick-enquiry",
    kind,
    serviceMethod: source === "homepage-quick-enquiry" ? "Quick Enquiry" : "",
    deviceType: source === "homepage-quick-enquiry" ? "Enquiry" : "",
    category: serviceNeeded,
    requirements: s.description || s.title,
    title: s.title,
    customerName: s.customerName || deviceInfo.customerName,
    contactEmail: s.customerEmail || deviceInfo.customerEmail,
    contactPhone: s.customerPhone || deviceInfo.customerPhone || deviceContact,
    expectedPrice: s.estimatedCost,
    status: (s.status as ServiceRequest["status"]) || "submitted",
    createdAt,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : createdAt,
    timeline: [{ label: "Submitted", at: createdAt, done: true }],
  };
}
