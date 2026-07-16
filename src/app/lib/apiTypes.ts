// ──────────────────────────────────────────────────────────────────────────
//  DESKTO API — shared response types + mappers to frontend shapes
// ──────────────────────────────────────────────────────────────────────────
//  These mirror what the backend (`backend/src/routes/*`) returns. Keep
//  field names in sync with the handlers when either side changes.
// ──────────────────────────────────────────────────────────────────────────

import type { Delivery, Order, OrderItem, PCBuild, Repair, ServiceRequest } from "./dashboardData";

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
  customerId?: string;
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
    deliveryMethod?: "ship" | "pickup";
    deliveryZone?: "STORE_PICKUP" | "SAME_CITY" | "SAME_DISTRICT" | "SAME_STATE" | "OTHER_STATE";
    productSizeCategory?: "SMALL" | "MEDIUM" | "HEAVY";
    deliveryCharge?: number | null;
    deliveryChargeStatus?: "FIXED" | "MANUAL_QUOTE";
    deliveryNote?: string;
    estimatedDeliveryTime?: string;
  };
  billingAddress?: Record<string, unknown>;
  deliveryMethod?: "ship" | "pickup";
  deliveryZone?: "STORE_PICKUP" | "SAME_CITY" | "SAME_DISTRICT" | "SAME_STATE" | "OTHER_STATE";
  productSizeCategory?: "SMALL" | "MEDIUM" | "HEAVY";
  deliveryCharge?: number | null;
  deliveryChargeStatus?: "FIXED" | "MANUAL_QUOTE";
  deliveryNote?: string;
  estimatedDeliveryTime?: string;
  notes?: string;
}

// Services ───────────────────────────────────────────────────────────────
export interface ApiService {
  id: string;
  serviceNumber: string;
  customerId?: string;
  serviceType: "repair" | "pc-build" | "upgrade" | "software" | "rental" | "assembly" | "delivery" | "support" | "sell";
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
  technicianId?: string;
  attachments?: { objectKey: string; url: string; fileName?: string; contentType?: string }[];
  quotationItems?: { label: string; cost: number }[];
  quotationNote?: string;
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
  const shippingAddress = (o.shippingAddress || {}) as Record<string, unknown>;
  const deliveryMethod = shippingAddress.deliveryMethod === "pickup" || shippingAddress.deliveryZone === "STORE_PICKUP" ? "pickup" : "ship";
  const deliveryCharge = typeof shippingAddress.deliveryCharge === "number"
    ? shippingAddress.deliveryCharge
    : shippingAddress.deliveryCharge === null
      ? null
      : o.shippingAmount;
  const normalizedStatus = (["placed", "verified", "packing", "shipped", "delivered", "cancelled"].includes(o.status)
    ? o.status
    : "placed") as Order["status"];
  const statusOrder: Order["status"][] = ["placed", "verified", "packing", "shipped", "delivered"];
  const statusLabels: Record<string, string> = {
    placed: "Order placed",
    verified: "Order verified",
    packing: "Packing",
    shipped: "Shipped",
    delivered: "Delivered",
  };
  const completedIndex = normalizedStatus === "cancelled" ? 0 : statusOrder.indexOf(normalizedStatus);
  const updatedAt = o.updatedAt ? new Date(o.updatedAt).getTime() : createdAt;
  return {
    id: o.orderNumber,                       // keep the human-friendly id in UI
    customerId: o.customerId || "",
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
    deliveryMethod,
    deliveryZone: shippingAddress.deliveryZone as Order["deliveryZone"] | undefined,
    productSizeCategory: shippingAddress.productSizeCategory as Order["productSizeCategory"] | undefined,
    deliveryCharge,
    deliveryChargeStatus: shippingAddress.deliveryChargeStatus as Order["deliveryChargeStatus"] | undefined,
    deliveryNote: typeof shippingAddress.deliveryNote === "string" ? shippingAddress.deliveryNote : undefined,
    estimatedDeliveryTime: typeof shippingAddress.estimatedDeliveryTime === "string" ? shippingAddress.estimatedDeliveryTime : undefined,
    shippingAddress: o.shippingAddress as Order["shippingAddress"],
    status: normalizedStatus,
    createdAt,
    updatedAt,
    addressId: "",
    trackingSteps: statusOrder.map((status, index) => ({
      label: statusLabels[status],
      at: index === 0 ? createdAt : updatedAt,
      done: index <= completedIndex,
    })),
    invoiceId: `INV-${(o.orderNumber || "").slice(-6).toUpperCase()}`,
  };
}

export function apiServiceToFrontend(s: ApiService): ServiceRequest {
  const createdAt = typeof s.createdAt === "string" ? new Date(s.createdAt).getTime() : Date.now();
  const kind = (["upgrade", "software", "rental", "assembly", "support", "sell"].includes(s.serviceType)
    ? s.serviceType
    : "support") as ServiceRequest["kind"];
  const deviceInfo = (s.deviceInfo || {}) as Record<string, any>;
  const serviceNeeded = typeof deviceInfo.serviceNeeded === "string" ? deviceInfo.serviceNeeded : kind;
  const source = typeof deviceInfo.source === "string" ? deviceInfo.source : "";
  const deviceContact = typeof deviceInfo.contact === "string" ? deviceInfo.contact : undefined;
  const uploads = (s.attachments || deviceInfo.attachments || []).map((item: any) => typeof item === "string" ? item : item.url).filter(Boolean);
  return {
    id: s.serviceNumber,
    customerId: s.customerId || "quick-enquiry",
    kind,
    serviceMethod: deviceInfo.serviceMethod || (source === "homepage-quick-enquiry" ? "Quick Enquiry" : ""),
    deviceType: deviceInfo.deviceType || (source === "homepage-quick-enquiry" ? "Enquiry" : ""),
    category: deviceInfo.category || serviceNeeded,
    requirements: deviceInfo.requirements || s.description || s.title,
    title: s.title,
    customerName: s.customerName || deviceInfo.customerName,
    contactEmail: s.customerEmail || deviceInfo.customerEmail,
    contactPhone: s.customerPhone || deviceInfo.customerPhone || deviceContact,
    expectedPrice: s.estimatedCost,
    uploads,
    technicianId: s.technicianId,
    quotation: s.estimatedCost,
    quotationItems: s.quotationItems || deviceInfo.quotationItems || [],
    quotationNote: s.quotationNote || deviceInfo.quotationNote,
    paidAmount: deviceInfo.paidAmount,
    currentSpecs: deviceInfo.currentSpecs,
    preferredSlot: deviceInfo.preferredSlot,
    quantity: deviceInfo.quantity,
    startDate: deviceInfo.startDate,
    endDate: deviceInfo.endDate,
    rentalDuration: deviceInfo.rentalDuration,
    serialNumber: deviceInfo.serialNumber,
    companyName: deviceInfo.companyName,
    priority: deviceInfo.priority,
    address: deviceInfo.address,
    pincode: deviceInfo.pincode,
    assemblyType: deviceInfo.assemblyType,
    equipmentChecklist: deviceInfo.equipmentChecklist,
    checklist: deviceInfo.checklist,
    qaChecks: deviceInfo.qaChecks,
    technicianNotes: deviceInfo.technicianNotes,
    status: (s.status as ServiceRequest["status"]) || "submitted",
    createdAt,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : createdAt,
    timeline: [{ label: "Submitted", at: createdAt, done: true }],
  };
}

export function apiServiceToRepair(s: ApiService): Repair {
  const info = (s.deviceInfo || {}) as Record<string, any>;
  const createdAt = new Date(s.createdAt).getTime();
  return {
    id: s.serviceNumber,
    customerId: s.customerId || "",
    customerName: s.customerName || info.customerName,
    contactPhone: s.customerPhone || info.customerPhone,
    contactEmail: s.customerEmail || info.customerEmail,
    serviceCategory: info.serviceCategory || "repair",
    deviceType: info.deviceType,
    brand: info.brand,
    model: info.model,
    serialNumber: info.serialNumber,
    device: info.device || s.title,
    issue: info.issue || s.description || s.title,
    serviceType: info.serviceMethod || info.serviceType,
    preferredSlot: info.preferredSlot,
    estimatedCharge: s.estimatedCost || info.estimatedCharge,
    uploadedFiles: (s.attachments || info.attachments || []).map((item: any) => typeof item === "string" ? item : item.url).filter(Boolean),
    status: s.status as Repair["status"],
    technicianId: s.technicianId,
    quotation: s.estimatedCost || undefined,
    quotationItems: s.quotationItems || info.quotationItems,
    quotationNote: s.quotationNote || info.quotationNote,
    paidAmount: info.paidAmount,
    qualityChecks: info.qualityChecks,
    deliveryMode: info.deliveryMode,
    timeline: [{ label: "Submitted", at: createdAt, done: true }],
    createdAt,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : createdAt,
  };
}

export function apiServiceToPCBuild(s: ApiService): PCBuild {
  const info = (s.deviceInfo || {}) as Record<string, any>;
  const createdAt = new Date(s.createdAt).getTime();
  return {
    id: s.serviceNumber,
    customerId: s.customerId || "",
    customerName: s.customerName || info.customerName,
    contactPhone: s.customerPhone || info.customerPhone,
    contactEmail: s.customerEmail || info.customerEmail,
    name: s.title,
    purpose: info.purpose,
    budgetRange: info.budgetRange,
    preferredBrand: info.preferredBrand,
    performanceLevel: info.performanceLevel,
    components: info.components || [],
    selectedBuilderComponents: info.selectedBuilderComponents,
    validationReport: info.validationReport,
    assemblyChecklist: info.assemblyChecklist,
    testResults: info.testResults,
    assemblyCharge: info.assemblyCharge,
    gst: info.gst,
    shipping: info.shipping,
    estimatedDelivery: info.estimatedDelivery,
    quotation: s.estimatedCost || info.quotation,
    quotationNote: s.quotationNote || info.quotationNote,
    total: s.estimatedCost || info.total || 0,
    status: s.status as PCBuild["status"],
    technicianId: s.technicianId,
    technicianNotes: info.technicianNotes,
    timeline: [{ label: "Submitted", at: createdAt, done: true }],
    createdAt,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : createdAt,
  };
}

export function apiServiceToDelivery(s: ApiService): Delivery {
  const info = (s.deviceInfo || {}) as Record<string, any>;
  const address = info.address || {};
  const createdAt = new Date(s.createdAt).getTime();
  return {
    id: s.serviceNumber,
    staffId: s.technicianId,
    orderId: info.orderNumber || "",
    customerName: s.customerName || info.customerName || "Customer",
    customerPhone: s.customerPhone || info.customerPhone || "",
    address: typeof address === "string" ? address : address.line1 || address.address || "",
    city: address.city || "",
    state: address.state || "",
    pincode: address.postalCode || address.pincode || "",
    status: (s.status === "submitted" ? "pending" : s.status) as Delivery["status"],
    deliveryNotes: info.deliveryNotes,
    createdAt,
    updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : createdAt,
  };
}
