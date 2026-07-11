// ──────────────────────────────────────────────────────────────────────────
//  DESKTO Dashboard Data Layer
//  Shared types, seeder, and mutators for the Customer / Staff / Admin
//  dashboards. State persists to localStorage under "deskto-dashboard-v1".
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import {
  authApi,
  ordersApi,
  productsApi,
  servicesApi,
  homepageContentApi,
  isAuthenticated as isApiAuthenticated,
  getAccessToken,
} from "./api";
import { apiOrderToFrontend, apiServiceToFrontend } from "./apiTypes";

// ── TYPES ─────────────────────────────────────────────────────────────────

export type OrderStatus = "placed" | "verified" | "packing" | "shipped" | "delivered" | "cancelled";
export type RepairStatus =
  | "submitted" | "received" | "admin-approved" | "rejected" | "assigned" | "device-received"
  | "diagnosing" | "quotation" | "quote-approved" | "payment-pending" | "paid"
  | "in-repair" | "repair-progress" | "qc" | "completed" | "invoice-generated"
  | "warranty-generated" | "ready" | "delivered" | "review-requested" | "closed";
export type RentalStatus = "reserved" | "active" | "returning" | "returned" | "overdue";
export type PCBuildStatus =
  | "submitted" | "received" | "admin-review" | "components-verified" | "quotation"
  | "approved" | "paid" | "reserved" | "technician-assigned" | "assembling"
  | "software-install" | "stress-test" | "qc" | "invoice-generated"
  | "warranty-generated" | "packed" | "shipped" | "delivered" | "review-requested" | "closed";
export type ServiceRequestKind = "upgrade" | "software" | "rental" | "sell" | "support" | "assembly";
export type ServiceRequestStatus =
  | "submitted" | "received" | "admin-approved" | "rejected" | "technician-assigned"
  | "inspection" | "diagnosis" | "compatibility-verified" | "documents-verified"
  | "agreement-generated" | "quotation" | "offer-sent" | "approved" | "accepted"
  | "paid" | "reserved" | "prepared" | "shipped" | "active" | "return-requested"
  | "product-received" | "refunded" | "inventory-added" | "published"
  | "session-scheduled" | "connected" | "in-progress" | "optimization" | "data-recovery"
  | "quality-testing" | "invoice-generated" | "warranty-generated" | "ready"
  | "delivered" | "completed" | "review-requested" | "closed";
export type AssemblyStatus = "queued" | "assigned" | "building" | "tested" | "ready";
export type TicketStatus = "open" | "in-progress" | "waiting-customer" | "resolved" | "closed";
export type GamingHubContentType =
  | "gaming-news" | "latest-hardware" | "esports-update" | "game-release"
  | "gaming-tip" | "benchmark-result" | "product-review" | "community-blog"
  | "featured-build" | "offer" | "testimonial" | "faq";
export type GamingHubStatus = "draft" | "published" | "scheduled" | "archived";

// ── Custom Builder Management Types ─────────────────────────────────────────

export type ComponentCategory =
  | "CPU" | "Motherboard" | "RAM" | "GPU" | "Storage" | "PSU"
  | "Cabinet" | "Cooler" | "Fans" | "OS" | "Accessories" | "Network Device";

export type MarketTag =
  | "Low Budget" | "Budget Popular" | "Frequent" | "Popular"
  | "Trending" | "Latest" | "Creator" | "Premium" | "Rich Class" | "Extreme";

export type BuildPurpose =
  | "Gaming" | "Office" | "Editing" | "Streaming" | "AI / ML"
  | "CAD / 3D" | "Programming" | "Server";

export type PerformanceTier = "Entry" | "Mid" | "High" | "Extreme";

export type BudgetRange =
  | "Under ₹75,000" | "₹75,000 - ₹1,00,000" | "₹1,00,000 - ₹2,00,000"
  | "₹2,00,000 - ₹3,00,000" | "₹3,00,000+";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "pre-order";

export interface BuilderComponent {
  id: string;
  categoryId: ComponentCategory;
  name: string;
  brand: string;
  model: string;
  price: number;
  marketTag?: MarketTag;
  tier?: PerformanceTier;
  compatibilityNotes?: string;
  stockStatus: StockStatus;
  isActive: boolean;
  isLatest?: boolean;
  isTrending?: boolean;
  order: number;
  imageUrl?: string;
  specifications?: Record<string, string>;
}

export interface BuilderContentConfig {
  pageTitle: string;
  subtitle: string;
  workflowBadgeText: string;
  builderDescription: string;
  ctaButtonText: string;
  validationChecklist: string[];
  assemblyCharge: number;
  gstPercentage: number;
  shippingRule: string;
  freeShippingThreshold: number;
}

export interface BuildPurposeButton {
  id: string;
  purpose: BuildPurpose;
  label: string;
  icon?: string;
  order: number;
  isActive: boolean;
  recommendedTier?: PerformanceTier;
}

export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  checksWith: ComponentCategory[];
  ruleType: "socket" | "chipset" | "memory-type" | "power" | "physical" | "slot" | "interface";
  validationExpression?: string;
  isActive: boolean;
}

export interface DefaultBuildPreset {
  tier: PerformanceTier;
  components: Record<string, string>; // componentId by categoryId
}

export interface CustomBuilderConfig {
  id: string;
  version: number;
  status: "draft" | "published" | "archived";
  contentConfig: BuilderContentConfig;
  buildPurposes: BuildPurposeButton[];
  components: Record<ComponentCategory, BuilderComponent[]>;
  compatibilityRules: CompatibilityRule[];
  defaultPresets: DefaultBuildPreset[];
  pricingRules: {
    assemblyCharges: Record<PerformanceTier, number>;
    gstPercent: number;
    freeShippingThreshold: number;
    shippingCharge: number;
  };
  publishedAt?: number;
  lastModifiedAt: number;
  modifiedBy: string;
}

export interface BuilderMetrics {
  totalCategories: number;
  activeOptions: number;
  hiddenOptions: number;
  popularSelections: Array<{ componentId: string; name: string; count: number }>;
  latestPriceUpdate: number;
  buildRequestsGenerated: number;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: number;
  name: string;
  qty: number;
  price: number;
  img: string;
}

export interface ServiceAddress {
  line1: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ServicePaymentInfo {
  method: "online" | "cod";
  status: "paid" | "cod" | "pending";
  amount: number;
  invoiceId: string;
  invoiceEmailStatus: "queued" | "sent" | "failed";
  invoiceEmailSentAt?: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  gst?: number;
  shipping?: number;
  couponCode?: string;
  paymentMethod?: string;
  deliveryMethod?: "ship" | "pickup";
  deliveryZone?: "STORE_PICKUP" | "SAME_CITY" | "SAME_DISTRICT" | "SAME_STATE" | "OTHER_STATE";
  productSizeCategory?: "SMALL" | "MEDIUM" | "HEAVY";
  deliveryCharge?: number | null;
  deliveryChargeStatus?: "FIXED" | "MANUAL_QUOTE";
  deliveryNote?: string;
  estimatedDeliveryTime?: string;
  shippingAddress?: {
    name: string;
    phone: string;
    email: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    deliveryMethod?: "ship" | "pickup";
    deliveryZone?: "STORE_PICKUP" | "SAME_CITY" | "SAME_DISTRICT" | "SAME_STATE" | "OTHER_STATE";
    productSizeCategory?: "SMALL" | "MEDIUM" | "HEAVY";
    deliveryCharge?: number | null;
    deliveryChargeStatus?: "FIXED" | "MANUAL_QUOTE";
    deliveryNote?: string;
    estimatedDeliveryTime?: string;
  };
  status: OrderStatus;
  deliveryStatus?: "pending" | "ready" | "dispatched" | "delivered" | "cancelled";
  deliveryId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAt: number;
  updatedAt?: number;
  addressId: string;
  trackingSteps: { label: string; at: number; done: boolean }[];
  invoiceId?: string;
  invoiceUrl?: string;
  invoiceEmailStatus?: "queued" | "sent" | "failed";
  invoiceEmailSentAt?: number;
  warrantyEndsAt?: number;
}

type AddOrderInput = Omit<Order, "id" | "createdAt" | "updatedAt" | "trackingSteps"> & {
  id?: string;
  createdAt?: number;
  trackingSteps?: Order["trackingSteps"];
};

export interface Repair {
  id: string;
  customerId: string;
  customerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceCategory?: "pc-repair" | "laptop-repair" | "repair";
  deviceType?: "Desktop" | "Laptop" | "Gaming PC" | "MacBook" | "Printer" | "Other";
  brand?: string;
  model?: string;
  serialNumber?: string;
  device: string;
  issue: string;
  serviceType?: "Shop Visit" | "Home Visit" | "Pickup & Delivery";
  preferredSlot?: string;
  estimatedCharge?: number;
  uploadedFiles?: string[];
  status: RepairStatus;
  technicianId?: string;
  adminVerified?: boolean;
  diagnosisReport?: string;
  partsRequired?: { name: string; cost: number }[];
  laborCost?: number;
  quotationItems?: { label: string; cost: number }[];
  quotation?: number;
  quotationNote?: string;
  advancePaid?: number;
  paidAmount?: number;
  invoiceId?: string;
  warrantyId?: string;
  warrantyEndsAt?: number;
  qualityChecks?: { label: string; done: boolean; at?: number }[];
  deliveryMode?: "Pickup" | "Home Delivery";
  reviewRequested?: boolean;
  technicianNotes?: string;
  technicianLastStatusAt?: number;
  serviceAddress?: ServiceAddress;
  paymentInfo?: ServicePaymentInfo;
  timeline: { label: string; at: number; done: boolean }[];
  createdAt: number;
  updatedAt?: number;
}

export interface Rental {
  id: string;
  customerId: string;
  productId: number;
  productName: string;
  startDate: number;
  endDate: number;
  status: RentalStatus;
  deposit: number;
  monthlyRate: number;
  createdAt: number;
}

export interface PCBuild {
  id: string;
  customerId: string;
  customerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  name: string;
  purpose?: string;
  budgetRange?: string;
  preferredBrand?: string;
  performanceLevel?: string;
  components: { type: string; name: string; price: number }[];
  selectedBuilderComponents?: Record<string, string>; // componentId by categoryId from builder config
  builderConfigVersion?: number; // version of customBuilderConfig used
  validationReport?: { label: string; pass: boolean; detail: string }[];
  assemblyChecklist?: { label: string; done: boolean; at?: number }[];
  testResults?: { label: string; done: boolean; value?: string; at?: number }[];
  assemblyCharge?: number;
  gst?: number;
  shipping?: number;
  estimatedDelivery?: string;
  quotation?: number;
  quotationNote?: string;
  paidAmount?: number;
  invoiceId?: string;
  warrantyId?: string;
  trackingNumber?: string;
  timeline?: { label: string; at: number; done: boolean }[];
  total: number;
  status: PCBuildStatus;
  technicianId?: string;
  technicianNotes?: string;
  technicianLastStatusAt?: number;
  createdAt: number;
  warrantyEndsAt?: number;
  updatedAt?: number;
  serviceAddress?: ServiceAddress;
  paymentInfo?: ServicePaymentInfo;
}

export interface ServiceRequest {
  id: string;
  kind: ServiceRequestKind;
  customerId: string;
  customerName?: string;
  contactPhone?: string;
  contactEmail?: string;
  title: string;
  deviceType: string;
  category: string;
  requirements: string;
  currentSpecs?: string;
  serviceMethod: string;
  preferredSlot?: string;
  expectedPrice?: number;
  quantity?: number;
  startDate?: string;
  endDate?: string;
  rentalDuration?: string;
  serialNumber?: string;
  companyName?: string;
  priority?: string;
  address?: string;
  pincode?: string;
  paymentMethod?: "online" | "cod" | "upi" | "card" | "wallet" | string;
  paymentStatus?: "pending" | "paid" | "cod";
  assemblyType?: string;
  equipmentChecklist?: { label: string; provided: boolean }[];
  uploads?: string[];
  technicianId?: string;
  status: ServiceRequestStatus;
  adminVerified?: boolean;
  diagnosisReport?: string;
  compatibilityReport?: string;
  recommendation?: string;
  quotationItems?: { label: string; cost: number }[];
  quotation?: number;
  quotationNote?: string;
  paidAmount?: number;
  invoiceId?: string;
  warrantyId?: string;
  reportId?: string;
  checklist?: { label: string; done: boolean; at?: number }[];
  qaChecks?: { label: string; done: boolean; at?: number }[];
  technicianNotes?: string;
  technicianLastStatusAt?: number;
  serviceAddress?: ServiceAddress;
  paymentInfo?: ServicePaymentInfo;
  timeline: { label: string; at: number; done: boolean }[];
  createdAt: number;
  updatedAt?: number;
}

export interface Assembly {
  id: string;
  customerId: string;
  productName: string;
  status: AssemblyStatus;
  technicianId?: string;
  components: string[];
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  messages: { from: "customer" | "agent"; text: string; at: number }[];
  status: TicketStatus;
  meetingLink?: string;
  staffId?: string;
  createdAt: number;
}

export interface QuickEnquiry {
  id: string;
  name: string;
  contact: string;
  serviceNeeded: string;
  message: string;
  status: "new" | "contacted" | "closed";
  createdAt: number;
}

export interface Review {
  id: string;
  customerId: string;
  productId?: number;
  serviceId?: string;
  rating: number;
  text: string;
  photoUrl?: string;
  createdAt: number;
}

export interface Reward {
  customerId: string;
  points: number;
  history: { label: string; delta: number; at: number }[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  discountAmount?: number;
  minSpend: number;
  expiresAt: number;
  redeemed: boolean;
  usageLimit?: number;
  usedCount?: number;
  active?: boolean;
}

export interface NotificationItem {
  id: string;
  customerId?: string;
  staffId?: string;
  audience?: "all" | "customers" | "staff" | "admins";
  title: string;
  detail: string;
  type: "order" | "repair" | "rental" | "support" | "offer" | "warranty" | "system";
  read: boolean;
  archived: boolean;
  createdAt: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "technician" | "sales" | "support" | "delivery";
  department: string;
  joinedAt: number;
  performance: { jobs: number; rating: number; attendancePct: number };
}

export interface AttendanceLog {
  staffId: string;
  date: string;
  clockIn?: number;
  breakStart?: number;
  breakEnd?: number;
  clockOut?: number;
  hours: number;
}

export interface TaskItem {
  id: string;
  staffId: string;
  title: string;
  detail: string;
  status: "todo" | "in-progress" | "done";
  dueAt: number;
  createdAt: number;
}

export interface InventoryRequest {
  id: string;
  staffId: string;
  component: string;
  qty: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "received";
  createdAt: number;
}

export interface Delivery {
  id: string;
  staffId?: string;
  staffName?: string;
  staffPhone?: string;
  orderId: string;
  order?: Order;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: "pending" | "ready" | "dispatched" | "delivered" | "cancelled";
  deliveryNotes?: string;
  dispatchedAt?: number;
  deliveredAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  components: string[];
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: { component: string; qty: number; cost: number; gst?: number }[];
  total: number;
  status: "draft" | "sent" | "received" | "paid";
  createdAt: number;
  updatedAt?: number;
}

export interface MarketplaceListing {
  id: string;
  sellerName: string;
  productName: string;
  condition: string;
  askingPrice: number;
  status: "submitted" | "inspecting" | "priced" | "published" | "rejected";
  createdAt: number;
}

export interface CRMNote {
  id: string;
  customerId: string;
  text: string;
  by: string;
  at: number;
}

export interface AuditLog {
  id: string;
  event: string;
  detail: string;
  actor?: string;
  at: number;
}

export interface DashboardSettings {
  gstPercent: number;
  paymentGateway: string;
  emailProvider: string;
  whatsappProvider: string;
  smsProvider: string;
  shippingZones: string[];
  businessHours: string;
}

export interface CatalogProduct {
  id: number;
  name: string;
  type?: "gaming" | "general";
  category: string;
  condition?: "first-hand" | "second-hand";
  brand: string;
  model?: string;
  sku?: string;
  price: number;
  orig?: number | null;
  stock: number;
  inStock?: boolean;
  rating?: number;
  reviews?: number;
  badge?: string | null;
  warrantyMonths?: number;
  rgb?: boolean;
  specs?: string[];
  img?: string;
  gallery?: string[];
  createdAt?: number;
  popularity?: number;
  sales?: number;
  serial?: string;
  qualityReport?: string;
  operatingSystem?: string;
  weight?: string;
  dimensions?: string;
  processor?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  display?: string;
  refreshRate?: string;
  powerRequirement?: string;
  ports?: string;
  description?: string;
  technicalDetails?: string;
  useCase?: string;
  performanceNotes?: string;
  qualityNotes?: string;
  features?: string[];
  boxContents?: string[];
  compatibility?: string[];
  upgradeOptions?: string[];
  recommendedAccessories?: string[];
  supportedPlatforms?: string[];
  limitations?: string[];
  deliveryInfo?: {
    homeDelivery: boolean;
    storePickup: boolean;
    estimatedDelivery: string;
    shippingCharges: number;
    freeShippingAbove?: number;
    returnPolicy: string;
  };
  warrantyInfo?: {
    type: string;
    claimProcess: string;
    pickupPolicy: string;
    repairTerms: string;
  };
  seo?: {
    slug: string;
    keywords: string[];
    metaTitle: string;
    metaDescription: string;
    tags: string[];
  };
  catalogStatus?: "draft" | "published" | "archived";
  updatedAt?: number;
}

export interface GamingHubComment {
  id: string;
  customerName: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface GamingHubItem {
  id: string;
  type: GamingHubContentType;
  title: string;
  slug: string;
  category: string;
  shortDescription: string;
  author: string;
  tags: string[];
  publishDate: number;
  status: GamingHubStatus;
  coverImage: string;
  thumbnailImage?: string;
  gallery: string[];
  intro: string;
  body: string;
  specs?: string;
  benchmarkData?: string;
  pros?: string[];
  cons?: string[];
  tips?: string[];
  offerDetails?: string;
  discount?: string;
  ctaText?: string;
  ctaHref?: string;
  relatedProductIds?: number[];
  relatedServiceSlugs?: string[];
  showOnHub: boolean;
  showInCategory: boolean;
  featured: boolean;
  trending: boolean;
  showInLatestNews: boolean;
  showInExclusiveOffers: boolean;
  showInSignatureMachines: boolean;
  bannerImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  views: number;
  reads: number;
  shares: number;
  whatsappClicks: number;
  callClicks: number;
  offerClicks: number;
  ctaClicks: number;
  comments: GamingHubComment[];
  createdAt: number;
  updatedAt: number;
  order?: number;
}

// ── ROOT STATE ────────────────────────────────────────────────────────────

export interface DashboardStore {
  orders: Order[];
  repairs: Repair[];
  rentals: Rental[];
  pcBuilds: PCBuild[];
  serviceRequests: ServiceRequest[];
  assemblies: Assembly[];
  tickets: SupportTicket[];
  reviews: Review[];
  rewards: Reward[];
  coupons: Coupon[];
  notifications: NotificationItem[];
  staff: StaffMember[];
  attendance: AttendanceLog[];
  tasks: TaskItem[];
  inventoryRequests: InventoryRequest[];
  deliveries: Delivery[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  marketplace: MarketplaceListing[];
  crmNotes: CRMNote[];
  addresses: Address[];
  auditLogs: AuditLog[];
  settings: DashboardSettings;
  products: CatalogProduct[];
  gamingHub: GamingHubItem[];
  enquiries: QuickEnquiry[];
  offers: { id: string; title: string; detail: string; expiresAt: number; code: string; discount?: string; linkedTo?: string; startsAt?: number; active?: boolean; createdAt?: number; updatedAt?: number }[];
  customBuilderConfig: CustomBuilderConfig;
}

const STORAGE_KEY = "deskto-dashboard-v1";
const AUTH_STORAGE_KEY = "deskto-auth-demo-state";

const emptyStore = (): DashboardStore => ({
  orders: [],
  repairs: [],
  rentals: [],
  pcBuilds: [],
  serviceRequests: [],
  assemblies: [],
  tickets: [],
  reviews: [],
  rewards: [],
  coupons: [],
  notifications: [],
  staff: [],
  attendance: [],
  tasks: [],
  inventoryRequests: [],
  deliveries: [],
  suppliers: [],
  purchaseOrders: [],
  marketplace: [],
  crmNotes: [],
  addresses: [],
  auditLogs: [],
  settings: {
    gstPercent: 18,
    paymentGateway: "Razorpay",
    emailProvider: "SendGrid",
    whatsappProvider: "Twilio",
    smsProvider: "MSG91",
    shippingZones: ["Metro", "Tier-1", "Tier-2", "Tier-3"],
    businessHours: "Mon–Sat 10:00–19:00 IST",
  },
  products: [],
  gamingHub: [],
  enquiries: [],
  offers: [],
  customBuilderConfig: createDefaultBuilderConfig(),
});

// ── Custom Builder Default Configuration ───────────────────────────────────

function mkComp(id: string, categoryId: ComponentCategory, name: string, brand: string, model: string, price: number, marketTag: MarketTag | undefined, tier: PerformanceTier | undefined, order: number, isActive = true): BuilderComponent {
  return { id, categoryId, name, brand, model, price, marketTag, tier, stockStatus: "in-stock", isActive, order };
}

function createDefaultBuilderConfig(): CustomBuilderConfig {
  const seededComponents: Record<ComponentCategory, BuilderComponent[]> = {
    CPU: [
      mkComp("cpu_01", "CPU", "Intel i3-12100F", "Intel", "i3-12100F", 7800, "Low Budget", "Entry", 0),
      mkComp("cpu_02", "CPU", "Ryzen 5 5600", "AMD", "Ryzen 5 5600", 10500, "Popular", "Entry", 1),
      mkComp("cpu_03", "CPU", "Intel i5-12400F", "Intel", "i5-12400F", 11500, "Frequent", "Mid", 2),
      mkComp("cpu_04", "CPU", "Intel i5-14400F", "Intel", "i5-14400F", 17500, "Trending", "Mid", 3),
      mkComp("cpu_05", "CPU", "Ryzen 5 7600", "AMD", "Ryzen 5 7600", 19000, "Popular", "Mid", 4),
      mkComp("cpu_06", "CPU", "Ryzen 5 9600X", "AMD", "Ryzen 5 9600X", 24500, "Latest", "Mid", 5),
      mkComp("cpu_07", "CPU", "Ryzen 7 7800X3D", "AMD", "Ryzen 7 7800X3D", 39000, "Popular", "High", 6),
      mkComp("cpu_08", "CPU", "Ryzen 7 9800X3D", "AMD", "Ryzen 7 9800X3D", 45500, "Trending", "High", 7),
      mkComp("cpu_09", "CPU", "Intel Core Ultra 7 265K", "Intel", "Core Ultra 7 265K", 38000, "Latest", "High", 8),
      mkComp("cpu_10", "CPU", "Ryzen 9 9950X", "AMD", "Ryzen 9 9950X", 56000, "Premium", "Extreme", 9),
      mkComp("cpu_11", "CPU", "Ryzen 9 9950X3D", "AMD", "Ryzen 9 9950X3D", 68000, "Extreme", "Extreme", 10),
    ],
    Motherboard: [
      mkComp("mb_01", "Motherboard", "H610 DDR4", "ASUS", "H610M-K", 6500, "Budget Popular", "Entry", 0),
      mkComp("mb_02", "Motherboard", "B550M DDR4", "MSI", "B550M Pro-VDH WiFi", 8800, "Popular", "Entry", 1),
      mkComp("mb_03", "Motherboard", "B760M DDR4", "Gigabyte", "B760M DS3H", 11200, "Frequent", "Mid", 2),
      mkComp("mb_04", "Motherboard", "B760 WiFi DDR5", "ASUS", "Prime B760-Plus WiFi", 16500, "Trending", "Mid", 3),
      mkComp("mb_05", "Motherboard", "B650M DDR5", "MSI", "MAG B650M Mortar WiFi", 15000, "Budget Popular", "Mid", 4),
      mkComp("mb_06", "Motherboard", "B650 WiFi DDR5", "ASUS", "ROG Strix B650-A", 18000, "Popular", "Mid", 5),
      mkComp("mb_07", "Motherboard", "X870 WiFi DDR5", "MSI", "MAG X870 Tomahawk WiFi", 28500, "Latest", "High", 6),
      mkComp("mb_08", "Motherboard", "Z790 Creator WiFi", "ASUS", "ProArt Z790-Creator", 34000, "Creator", "High", 7),
      mkComp("mb_09", "Motherboard", "X870E Gaming WiFi", "ASUS", "ROG Crosshair X870E Hero", 46500, "Latest", "Extreme", 8),
      mkComp("mb_10", "Motherboard", "Z890 WiFi DDR5", "MSI", "MEG Z890 Godlike", 38500, "Premium", "Extreme", 9),
    ],
    RAM: [
      mkComp("ram_01", "RAM", "8GB DDR4 3200", "Corsair", "Vengeance 8GB DDR4", 1800, "Low Budget", "Entry", 0),
      mkComp("ram_02", "RAM", "16GB DDR4 3200", "Kingston", "Fury Beast 16GB DDR4", 3000, "Budget Popular", "Entry", 1),
      mkComp("ram_03", "RAM", "16GB DDR5 6000", "G.Skill", "Trident Z5 16GB DDR5", 5200, "Popular", "Mid", 2),
      mkComp("ram_04", "RAM", "32GB DDR4 3200", "Corsair", "Vengeance 32GB DDR4", 5600, "Frequent", "Mid", 3),
      mkComp("ram_05", "RAM", "32GB DDR5 6000 CL30", "G.Skill", "Trident Z5 RGB 32GB DDR5", 9500, "Trending", "High", 4),
      mkComp("ram_06", "RAM", "32GB DDR5 6400 RGB", "Corsair", "Dominator Titanium 32GB DDR5", 11500, "Latest", "High", 5),
      mkComp("ram_07", "RAM", "48GB DDR5 6000", "Kingston", "Fury Beast 48GB DDR5", 14000, "Creator", "High", 6),
      mkComp("ram_08", "RAM", "64GB DDR5 6000", "G.Skill", "Trident Z5 64GB DDR5", 18000, "Creator", "Extreme", 7),
      mkComp("ram_09", "RAM", "128GB DDR5 5600", "Corsair", "Vengeance 128GB DDR5", 42000, "Rich Class", "Extreme", 8),
    ],
    GPU: [
      mkComp("gpu_01", "GPU", "RX 6600 8GB", "Sapphire", "Pulse RX 6600 8GB", 19000, "Budget Popular", "Entry", 0),
      mkComp("gpu_02", "GPU", "RTX 4060 8GB", "ASUS", "Dual RTX 4060 8GB", 32000, "Frequent", "Mid", 1),
      mkComp("gpu_03", "GPU", "RTX 5060 Ti 16GB", "MSI", "Gaming X RTX 5060 Ti 16GB", 52000, "Latest", "Mid", 2),
      mkComp("gpu_04", "GPU", "RTX 4070 Super 12GB", "Gigabyte", "Gaming OC RTX 4070 Super", 62000, "Trending", "High", 3),
      mkComp("gpu_05", "GPU", "RTX 5070 12GB", "ASUS", "ROG Strix RTX 5070 12GB", 66000, "Latest", "High", 4),
      mkComp("gpu_06", "GPU", "RX 9070 XT 16GB", "Sapphire", "Nitro+ RX 9070 XT 16GB", 74000, "Latest", "High", 5),
      mkComp("gpu_07", "GPU", "RTX 5070 Ti 16GB", "MSI", "Suprim X RTX 5070 Ti 16GB", 105000, "Latest", "Extreme", 6),
      mkComp("gpu_08", "GPU", "RTX 5080 16GB", "ASUS", "ROG Strix RTX 5080 16GB", 145000, "Premium", "Extreme", 7),
      mkComp("gpu_09", "GPU", "RTX 5090 32GB", "ASUS", "ROG Strix RTX 5090 32GB", 285000, "Extreme", "Extreme", 8),
    ],
    Storage: [
      mkComp("sto_01", "Storage", "500GB NVMe Gen3", "Kingston", "NV2 500GB NVMe", 2100, "Budget Popular", "Entry", 0),
      mkComp("sto_02", "Storage", "1TB NVMe Gen3", "Samsung", "970 Evo Plus 1TB", 3600, "Popular", "Entry", 1),
      mkComp("sto_03", "Storage", "1TB NVMe Gen4", "WD", "Black SN850X 1TB", 4800, "Trending", "Mid", 2),
      mkComp("sto_04", "Storage", "2TB NVMe Gen4", "Samsung", "980 Pro 2TB", 8800, "Popular", "Mid", 3),
      mkComp("sto_05", "Storage", "2TB NVMe Gen5", "Crucial", "T705 2TB NVMe Gen5", 18000, "Latest", "High", 4),
      mkComp("sto_06", "Storage", "4TB NVMe Gen4", "WD", "Black SN850X 4TB", 21000, "Creator", "High", 5),
      mkComp("sto_07", "Storage", "4TB NVMe + 8TB HDD", "Samsung + Seagate", "990 Pro 4TB + Barracuda 8TB", 28000, "Creator", "Extreme", 6),
    ],
    PSU: [
      mkComp("psu_01", "PSU", "550W Bronze", "Corsair", "CV550 Bronze", 3800, "Budget Popular", "Entry", 0),
      mkComp("psu_02", "PSU", "650W Gold", "Seasonic", "Focus GX-650 Gold", 7200, "Popular", "Entry", 1),
      mkComp("psu_03", "PSU", "750W Gold ATX 3.1", "Corsair", "RM750e ATX 3.1", 10500, "Trending", "Mid", 2),
      mkComp("psu_04", "PSU", "850W Gold ATX 3.1", "Seasonic", "Focus GX-850 ATX 3.1", 14500, "Latest", "High", 3),
      mkComp("psu_05", "PSU", "1000W Gold ATX 3.1", "ASUS", "ROG Thor 1000W ATX 3.1", 18000, "Premium", "High", 4),
      mkComp("psu_06", "PSU", "1200W Platinum", "Corsair", "AX1200i Platinum", 30000, "Rich Class", "Extreme", 5),
    ],
    Cabinet: [
      mkComp("cab_01", "Cabinet", "Ant Esports ICE Cabinet", "Ant Esports", "ICE-200TG", 3500, "Budget Popular", "Entry", 0),
      mkComp("cab_02", "Cabinet", "Cooler Master CMP 520", "Cooler Master", "CMP 520", 5200, "Popular", "Mid", 1),
      mkComp("cab_03", "Cabinet", "Corsair 4000D Airflow", "Corsair", "4000D Airflow", 7800, "Popular", "Mid", 2),
      mkComp("cab_04", "Cabinet", "Lian Li Lancool 216", "Lian Li", "Lancool 216", 10500, "Trending", "High", 3),
      mkComp("cab_05", "Cabinet", "Lian Li O11D EVO", "Lian Li", "O11D EVO", 13500, "Popular", "High", 4),
      mkComp("cab_06", "Cabinet", "Hyte Y60", "Hyte", "Y60 Panoramic", 22000, "Premium", "Extreme", 5),
    ],
    Cooler: [
      mkComp("cool_01", "Cooler", "Deepcool AK400 Air", "Deepcool", "AK400", 2500, "Popular", "Entry", 0),
      mkComp("cool_02", "Cooler", "Dual Tower Air Cooler", "Noctua", "NH-D15", 6500, "Trending", "Mid", 1),
      mkComp("cool_03", "Cooler", "240mm AIO", "Corsair", "iCUE H100i RGB Elite", 9000, "Popular", "Mid", 2),
      mkComp("cool_04", "Cooler", "280mm AIO", "NZXT", "Kraken 280 RGB", 11500, "Latest", "High", 3),
      mkComp("cool_05", "Cooler", "360mm AIO", "Corsair", "iCUE H150i Elite Capellix", 15000, "Trending", "High", 4),
      mkComp("cool_06", "Cooler", "360mm LCD AIO", "ASUS", "ROG Ryujin III 360 LCD", 25000, "Latest", "Extreme", 5),
    ],
    Fans: [
      mkComp("fans_01", "Fans", "3x ARGB Fan Kit", "Deepcool", "FC120 3-in-1 ARGB", 4200, "Trending", "Entry", 0),
      mkComp("fans_02", "Fans", "5x ARGB Fan Kit + Controller", "Corsair", "iCUE SP120 RGB 5-Pack", 6500, "Frequent", "Mid", 1),
      mkComp("fans_03", "Fans", "Lian Li Uni Fan 3-Pack", "Lian Li", "Uni Fan SL-Infinity 120", 11500, "Latest", "High", 2),
      mkComp("fans_04", "Fans", "Noctua Quiet Fan Kit", "Noctua", "NF-A12x25 PWM 3-Pack", 13000, "Premium", "Extreme", 3),
    ],
    OS: [
      mkComp("os_01", "OS", "Windows 11 Home", "Microsoft", "Windows 11 Home", 11500, "Popular", "Entry", 0),
      mkComp("os_02", "OS", "Windows 11 Home + Driver Setup", "Microsoft", "Windows 11 Home + Drivers", 13000, "Frequent", "Mid", 1),
      mkComp("os_03", "OS", "Windows 11 Pro", "Microsoft", "Windows 11 Pro", 16500, "Popular", "Mid", 2),
      mkComp("os_04", "OS", "Windows 11 Pro + Office Setup", "Microsoft", "Windows 11 Pro + MS Office", 26000, "Creator", "High", 3),
      mkComp("os_05", "OS", "Ubuntu Developer Stack", "Canonical", "Ubuntu 24.04 LTS + Dev Stack", 3500, "Popular", "Mid", 4),
    ],
    Accessories: [
      mkComp("acc_01", "Accessories", "Basic Keyboard + Mouse", "Logitech", "MK120 Combo", 1200, "Budget Popular", "Entry", 0),
      mkComp("acc_02", "Accessories", "Gaming Keyboard + Mouse", "Razer", "BlackWidow V3 + DeathAdder V3", 4500, "Popular", "Mid", 1),
      mkComp("acc_03", "Accessories", "Mechanical Keyboard + Mouse", "ASUS", "ROG Strix Scope + Gladius III", 8500, "Trending", "High", 2),
      mkComp("acc_04", "Accessories", "27in 1080p Monitor + Keyboard/Mouse", "LG", "27MP60G + Combo", 14000, "Popular", "Mid", 3),
      mkComp("acc_05", "Accessories", "24in 165Hz Gaming Monitor + Combo", "MSI", "G245F 165Hz + Gaming Combo", 18000, "Trending", "High", 4),
      mkComp("acc_06", "Accessories", "Streaming Kit - Mic + Webcam + Light", "Elgato", "Wave:3 + FaceCam + Key Light", 32000, "Creator", "Extreme", 5),
    ],
    "Network Device": [
      mkComp("net_01", "Network Device", "PCIe WiFi 6 + Bluetooth", "ASUS", "PCE-AX58BT WiFi 6", 3200, "Trending", "Entry", 0),
      mkComp("net_02", "Network Device", "PCIe WiFi 6E + Bluetooth", "Intel", "Wi-Fi 6E AX210 PCIe", 4500, "Latest", "Mid", 1),
      mkComp("net_03", "Network Device", "WiFi 6 Router", "TP-Link", "Archer AX73 WiFi 6", 8500, "Popular", "Mid", 2),
      mkComp("net_04", "Network Device", "WiFi 6E Router", "ASUS", "RT-AXE7800 WiFi 6E", 13000, "Latest", "High", 3),
      mkComp("net_05", "Network Device", "10G PCIe LAN Card", "ASUS", "XG-C100C 10G LAN", 8500, "Creator", "High", 4),
      mkComp("net_06", "Network Device", "WiFi 7 Router", "ASUS", "GT-BE98 WiFi 7", 26000, "Latest", "Extreme", 5),
    ],
  };

  // Default presets by tier using the seeded component IDs
  const defaultPresets: DefaultBuildPreset[] = [
    {
      tier: "Entry",
      components: {
        CPU: "cpu_02", Motherboard: "mb_01", RAM: "ram_02", GPU: "gpu_01",
        Storage: "sto_01", PSU: "psu_01", Cabinet: "cab_01", Cooler: "cool_01",
        Fans: "fans_01", OS: "os_01", Accessories: "acc_01", "Network Device": "net_01",
      },
    },
    {
      tier: "Mid",
      components: {
        CPU: "cpu_05", Motherboard: "mb_05", RAM: "ram_03", GPU: "gpu_02",
        Storage: "sto_03", PSU: "psu_03", Cabinet: "cab_02", Cooler: "cool_03",
        Fans: "fans_02", OS: "os_02", Accessories: "acc_02", "Network Device": "net_02",
      },
    },
    {
      tier: "High",
      components: {
        CPU: "cpu_08", Motherboard: "mb_07", RAM: "ram_05", GPU: "gpu_05",
        Storage: "sto_05", PSU: "psu_04", Cabinet: "cab_04", Cooler: "cool_05",
        Fans: "fans_03", OS: "os_03", Accessories: "acc_05", "Network Device": "net_04",
      },
    },
    {
      tier: "Extreme",
      components: {
        CPU: "cpu_11", Motherboard: "mb_09", RAM: "ram_09", GPU: "gpu_09",
        Storage: "sto_07", PSU: "psu_06", Cabinet: "cab_06", Cooler: "cool_06",
        Fans: "fans_04", OS: "os_04", Accessories: "acc_06", "Network Device": "net_06",
      },
    },
  ];

  return {
    id: "builder_default",
    version: 1,
    status: "published",
    contentConfig: {
      pageTitle: "Custom PC Solutions",
      subtitle: "Configure your dream PC with expert guidance",
      workflowBadgeText: "End-to-End Build Workflow",
      builderDescription: "Select your components, validate compatibility, get quotation, professional assembly, testing, delivery, and warranty—all tracked in one dashboard.",
      ctaButtonText: "Submit Build Request",
      validationChecklist: [
        "CPU Socket Compatibility",
        "RAM Compatibility",
        "GPU Clearance",
        "PSU Wattage",
        "Cooler Height",
        "Network Readiness",
        "Upgrade Path",
      ],
      assemblyCharge: 8000,
      gstPercentage: 18,
      shippingRule: "Free shipping on orders above ₹1,50,000",
      freeShippingThreshold: 150000,
    },
    buildPurposes: [
      { id: "purpose_gaming", purpose: "Gaming", label: "Gaming", order: 1, isActive: true, recommendedTier: "High" },
      { id: "purpose_office", purpose: "Office", label: "Office", order: 2, isActive: true, recommendedTier: "Entry" },
      { id: "purpose_editing", purpose: "Editing", label: "Editing", order: 3, isActive: true, recommendedTier: "High" },
      { id: "purpose_streaming", purpose: "Streaming", label: "Streaming", order: 4, isActive: true, recommendedTier: "High" },
      { id: "purpose_ai", purpose: "AI / ML", label: "AI / ML", order: 5, isActive: true, recommendedTier: "Extreme" },
      { id: "purpose_cad", purpose: "CAD / 3D", label: "CAD / 3D", order: 6, isActive: true, recommendedTier: "High" },
      { id: "purpose_programming", purpose: "Programming", label: "Programming", order: 7, isActive: true, recommendedTier: "Mid" },
      { id: "purpose_server", purpose: "Server", label: "Server", order: 8, isActive: true, recommendedTier: "Extreme" },
    ],
    components: seededComponents,
    compatibilityRules: [
      {
        id: "rule_cpu_socket",
        name: "CPU Socket Compatibility",
        description: "Validates CPU and motherboard socket compatibility",
        category: "CPU",
        checksWith: ["Motherboard"],
        ruleType: "socket",
        isActive: true,
      },
      {
        id: "rule_mobo_chipset",
        name: "Motherboard Chipset Support",
        description: "Validates chipset features with CPU generation",
        category: "Motherboard",
        checksWith: ["CPU"],
        ruleType: "chipset",
        isActive: true,
      },
      {
        id: "rule_ram_type",
        name: "RAM DDR Compatibility",
        description: "Validates DDR4 vs DDR5 memory support",
        category: "RAM",
        checksWith: ["Motherboard"],
        ruleType: "memory-type",
        isActive: true,
      },
      {
        id: "rule_gpu_clearance",
        name: "GPU Physical Clearance",
        description: "Validates GPU length fits in cabinet",
        category: "GPU",
        checksWith: ["Cabinet"],
        ruleType: "physical",
        isActive: true,
      },
      {
        id: "rule_psu_wattage",
        name: "PSU Power Capacity",
        description: "Validates PSU wattage covers all components",
        category: "PSU",
        checksWith: ["CPU", "GPU"],
        ruleType: "power",
        isActive: true,
      },
      {
        id: "rule_cooler_height",
        name: "CPU Cooler Height",
        description: "Validates cooler height fits in cabinet",
        category: "Cooler",
        checksWith: ["Cabinet"],
        ruleType: "physical",
        isActive: true,
      },
      {
        id: "rule_storage_slots",
        name: "Storage Slot Availability",
        description: "Validates motherboard has enough M.2/SATA slots",
        category: "Storage",
        checksWith: ["Motherboard"],
        ruleType: "slot",
        isActive: true,
      },
      {
        id: "rule_network_compatibility",
        name: "Network Interface Compatibility",
        description: "Validates network device interface compatibility",
        category: "Network Device",
        checksWith: ["Motherboard"],
        ruleType: "interface",
        isActive: true,
      },
    ],
    defaultPresets,
    pricingRules: {
      assemblyCharges: {
        Entry: 6000,
        Mid: 8000,
        High: 10000,
        Extreme: 12000,
      },
      gstPercent: 18,
      freeShippingThreshold: 150000,
      shippingCharge: 1499,
    },
    publishedAt: Date.now(),
    lastModifiedAt: Date.now(),
    modifiedBy: "system",
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────

const rid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const daysFromNow = (n: number) => Date.now() + n * 86400000;
const daysAgo = (n: number) => Date.now() - n * 86400000;
const uid = "demo_user";
const sid = (i: number) => `stf_demo_${i}`;

const gamingImage = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

function defaultGamingHubItems(): GamingHubItem[] {
  const now = Date.now();
  const base = {
    status: "published" as GamingHubStatus,
    author: "DESKTO Editorial",
    showOnHub: true,
    showInCategory: true,
    featured: false,
    trending: false,
    showInLatestNews: false,
    showInExclusiveOffers: false,
    showInSignatureMachines: false,
    views: 0,
    reads: 0,
    shares: 0,
    whatsappClicks: 0,
    callClicks: 0,
    offerClicks: 0,
    ctaClicks: 0,
    comments: [],
  };
  return [
    {
      ...base,
      id: "gh_news_5090",
      type: "gaming-news",
      title: "NVIDIA RTX 5090 Leaked: 40% Performance Uplift Over 4090",
      slug: "nvidia-rtx-5090-performance-uplift",
      category: "Gaming News",
      shortDescription: "Early board-partner leaks point to a major jump for 4K and ray-traced gaming.",
      tags: ["gpu", "nvidia", "hardware"],
      publishDate: daysAgo(7),
      coverImage: gamingImage("photo-1591488320449-011701bb6704"),
      thumbnailImage: gamingImage("photo-1591488320449-011701bb6704"),
      gallery: [gamingImage("photo-1591488320449-011701bb6704"), gamingImage("photo-1511512578047-dfb367046420"), gamingImage("photo-1550745165-9bc0b252726f")],
      intro: "The next wave of desktop GPUs is shaping up around higher raster performance, stronger RT cores, and larger VRAM pools.",
      body: "DESKTO's early analysis suggests the biggest win will be high-refresh 4K gaming and creator workloads. Customers planning a new build should balance GPU budget with PSU headroom, airflow, and monitor resolution before upgrading.",
      benchmarkData: "Expected uplift: 30-40% raster, 45%+ ray tracing in selected workloads.",
      relatedServiceSlugs: ["custom-pc", "upgrade"],
      featured: true,
      trending: true,
      showInLatestNews: true,
      metaTitle: "RTX 5090 gaming performance leak",
      metaDescription: "DESKTO Gaming Hub analysis of RTX 5090 performance expectations.",
      keywords: ["RTX 5090", "Gaming GPU", "DESKTO"],
      createdAt: now - 7 * 86400000,
      updatedAt: now - 7 * 86400000,
    },
    {
      ...base,
      id: "gh_build_phantom",
      type: "featured-build",
      title: "The Phantom: Signature 4K Gaming Machine",
      slug: "deskto-phantom-signature-4k-gaming-machine",
      category: "Signature Machines",
      shortDescription: "A no-compromise 4K build tuned for silent performance and clean cable management.",
      tags: ["custom pc", "signature build", "4k"],
      publishDate: daysAgo(4),
      coverImage: gamingImage("photo-1587202372775-e229f172b9d7"),
      thumbnailImage: gamingImage("photo-1587202372775-e229f172b9d7"),
      gallery: [gamingImage("photo-1587202372775-e229f172b9d7"), gamingImage("photo-1587831990711-23ca6441447b"), gamingImage("photo-1593640408182-31c70c8268f5")],
      intro: "The Phantom is DESKTO's flagship 4K gaming reference build for demanding players.",
      body: "Built around premium thermals and carefully selected components, this machine is stress-tested before delivery and tuned for stable frame pacing across modern AAA titles.",
      specs: "RTX 4090, Intel Core i9, 64GB DDR5, 4TB NVMe, liquid cooling",
      ctaText: "Order Custom Build",
      ctaHref: "/services/custom-pc",
      relatedServiceSlugs: ["custom-pc"],
      featured: true,
      showInSignatureMachines: true,
      createdAt: now - 4 * 86400000,
      updatedAt: now - 4 * 86400000,
    },
    {
      ...base,
      id: "gh_tip_ddr6",
      type: "gaming-tip",
      title: "DDR6 RAM: What It Means for PC Gaming in 2027",
      slug: "ddr6-ram-pc-gaming-guide",
      category: "Gaming Tips",
      shortDescription: "What memory bandwidth, latency, and platform support mean for your next upgrade.",
      tags: ["ram", "upgrade", "tips"],
      publishDate: daysAgo(2),
      coverImage: gamingImage("photo-1518770660439-4636190af475"),
      thumbnailImage: gamingImage("photo-1518770660439-4636190af475"),
      gallery: [gamingImage("photo-1518770660439-4636190af475"), gamingImage("photo-1591799264318-7e6ef8ddb7ea")],
      intro: "RAM upgrades are not only about capacity. Timing, platform compatibility, and BIOS support matter.",
      body: "For today's systems, DDR5 remains the practical choice. DDR6 planning should start only when CPU platforms, motherboards, and memory kits are mature enough for stable real-world gaming.",
      tips: ["Enable XMP/EXPO after stability testing", "Pair capacity with workload", "Check motherboard QVL before buying"],
      relatedServiceSlugs: ["upgrade"],
      showInLatestNews: true,
      createdAt: now - 2 * 86400000,
      updatedAt: now - 2 * 86400000,
    },
    {
      ...base,
      id: "gh_offer_4090",
      type: "offer",
      title: "RTX 4090 Beast Build Hot Deal",
      slug: "rtx-4090-beast-build-hot-deal",
      category: "Exclusive Offers",
      shortDescription: "Save on DESKTO's flagship 4K gaming PC bundle for a limited time.",
      tags: ["offer", "rtx 4090", "gaming pc"],
      publishDate: now,
      coverImage: gamingImage("photo-1600861194942-f883de0dfe96"),
      thumbnailImage: gamingImage("photo-1600861194942-f883de0dfe96"),
      gallery: [gamingImage("photo-1600861194942-f883de0dfe96"), gamingImage("photo-1587202372775-e229f172b9d7")],
      intro: "A limited-time gaming PC offer for customers who want immediate 4K power.",
      body: "This offer includes assembly, stress testing, warranty documentation, and delivery coordination through DESKTO.",
      offerDetails: "Save Rs. 35,000 on the RTX 4090 Beast Build.",
      discount: "11% OFF",
      ctaText: "Claim Offer",
      ctaHref: "/services/custom-pc",
      relatedServiceSlugs: ["custom-pc", "repair"],
      showInExclusiveOffers: true,
      featured: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      ...base,
      id: "gh_review_support",
      type: "testimonial",
      title: "Fast delivery and clean assembly",
      slug: "customer-testimonial-fast-delivery-clean-assembly",
      category: "Testimonials",
      shortDescription: "A verified customer review for a DESKTO custom workstation delivery.",
      tags: ["testimonial", "customer"],
      publishDate: daysAgo(12),
      coverImage: gamingImage("photo-1535713875002-d1d0cf377fde"),
      thumbnailImage: gamingImage("photo-1535713875002-d1d0cf377fde"),
      gallery: [],
      intro: "Customer testimonial",
      body: "Fast delivery, everything perfectly assembled. DESKTO even stress-tested the PC before shipping. That level of professionalism is rare.",
      createdAt: now - 12 * 86400000,
      updatedAt: now - 12 * 86400000,
    },
    {
      ...base,
      id: "gh_faq_warranty",
      type: "faq",
      title: "Do you offer warranty on custom builds?",
      slug: "custom-build-warranty-faq",
      category: "FAQ",
      shortDescription: "Warranty coverage for custom PC builds and DESKTO assembly support.",
      tags: ["faq", "warranty"],
      publishDate: daysAgo(20),
      coverImage: gamingImage("photo-1555617981-dac3880eac6e"),
      thumbnailImage: gamingImage("photo-1555617981-dac3880eac6e"),
      gallery: [],
      intro: "FAQ",
      body: "Yes. Component warranties are handled as per manufacturer coverage, while DESKTO provides assembly documentation, testing reports, and support coordination.",
      createdAt: now - 20 * 86400000,
      updatedAt: now - 20 * 86400000,
    },
  ];
}

export const REPAIR_TIMELINE_LABELS = [
  "Request Submitted",
  "Request Received",
  "Admin Approved",
  "Technician Assigned",
  "Device Received",
  "Diagnosis Started",
  "Quotation Sent",
  "Quotation Approved",
  "Payment Successful",
  "Repair Started",
  "Repair In Progress",
  "Quality Testing",
  "Repair Completed",
  "Invoice Generated",
  "Warranty Generated",
  "Ready for Pickup",
  "Delivered",
  "Review Requested",
];

export const PC_BUILD_TIMELINE_LABELS = [
  "Build Request Submitted",
  "Request Received",
  "Admin Review",
  "Components Verified",
  "Quotation Sent",
  "Customer Approved",
  "Payment Successful",
  "Components Reserved",
  "Technician Assigned",
  "Assembly Started",
  "Software Installed",
  "Stress Testing",
  "Quality Approved",
  "Invoice Generated",
  "Warranty Generated",
  "Packed",
  "Shipped",
  "Delivered",
  "Review Requested",
];

export const UPGRADE_TIMELINE_LABELS = [
  "Upgrade Request Submitted",
  "Request Received",
  "Admin Approved",
  "Technician Assigned",
  "System Inspection",
  "Compatibility Verified",
  "Quotation Sent",
  "Customer Approved",
  "Payment Successful",
  "Components Reserved",
  "Upgrade Started",
  "Performance Optimization",
  "Quality Testing",
  "Invoice Generated",
  "Warranty Generated",
  "Ready for Delivery",
  "Delivered",
  "Review Requested",
];

export const SOFTWARE_TIMELINE_LABELS = [
  "Service Request Submitted",
  "Request Received",
  "Admin Approved",
  "Technician Assigned",
  "System Diagnosis",
  "Quotation Sent",
  "Customer Approved",
  "Payment Successful",
  "Backup Completed",
  "Software Installation Started",
  "Data Recovery Completed",
  "System Optimization Completed",
  "Quality Testing",
  "Invoice Generated",
  "Service Completed",
  "Review Requested",
];

export const RENTAL_TIMELINE_LABELS = [
  "Rental Request Submitted",
  "Request Received",
  "Documents Verified",
  "Rental Approved",
  "Rental Agreement Generated",
  "Payment Successful",
  "Product Reserved",
  "Product Prepared",
  "Product Shipped",
  "Rental Active",
  "Return Requested",
  "Product Received",
  "Inspection Completed",
  "Final Invoice Generated",
  "Security Deposit Refunded",
  "Rental Closed",
  "Review Requested",
];

export const SELL_TIMELINE_LABELS = [
  "Sell Request Submitted",
  "Admin Review",
  "Inspection Scheduled",
  "Product Inspected",
  "Price Offer Sent",
  "Offer Accepted",
  "Payment Completed",
  "Added to Inventory",
  "Published for Resale",
  "Request Closed",
];

export const SUPPORT_TIMELINE_LABELS = [
  "Ticket Submitted",
  "Ticket Assigned",
  "Session Scheduled",
  "Technician Connected",
  "Issue Resolved",
  "Invoice Generated",
  "Payment Completed",
  "Ticket Closed",
];

export const ASSEMBLY_TIMELINE_LABELS = [
  "Assembly Request Submitted",
  "Request Received",
  "Equipment Validated",
  "Quotation Sent",
  "Customer Approved",
  "Payment Successful",
  "Staff Assigned",
  "Equipment Verified",
  "Assembly Started",
  "Configuration",
  "Testing & Validation",
  "Assembly Completed",
  "Invoice Generated",
  "Warranty Generated",
  "Ready for Delivery",
  "Delivered",
  "Review Requested",
];

const ASSEMBLY_LABEL_REMAP: Record<string, string> = {
  "Upgrade Request Submitted": "Assembly Request Submitted",
  "Admin Approved": "Equipment Validated",
  "Technician Assigned": "Staff Assigned",
  "System Inspection": "Equipment Verified",
  "Upgrade Started": "Assembly Started",
  "Performance Optimization": "Configuration",
  "Quality Testing": "Testing & Validation",
  "Service Completed": "Assembly Completed",
};

const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  submitted: "Request Submitted",
  received: "Request Received",
  "admin-approved": "Admin Approved",
  rejected: "Request Received",
  assigned: "Technician Assigned",
  "device-received": "Device Received",
  diagnosing: "Diagnosis Started",
  quotation: "Quotation Sent",
  "quote-approved": "Quotation Approved",
  "payment-pending": "Quotation Approved",
  paid: "Payment Successful",
  "in-repair": "Repair Started",
  "repair-progress": "Repair In Progress",
  qc: "Quality Testing",
  completed: "Repair Completed",
  "invoice-generated": "Invoice Generated",
  "warranty-generated": "Warranty Generated",
  ready: "Ready for Pickup",
  delivered: "Delivered",
  "review-requested": "Review Requested",
  closed: "Review Requested",
};

const PC_BUILD_STATUS_LABEL: Record<PCBuildStatus, string> = {
  submitted: "Build Request Submitted",
  received: "Request Received",
  "admin-review": "Admin Review",
  "components-verified": "Components Verified",
  quotation: "Quotation Sent",
  approved: "Customer Approved",
  paid: "Payment Successful",
  reserved: "Components Reserved",
  "technician-assigned": "Technician Assigned",
  assembling: "Assembly Started",
  "software-install": "Software Installed",
  "stress-test": "Stress Testing",
  qc: "Quality Approved",
  "invoice-generated": "Invoice Generated",
  "warranty-generated": "Warranty Generated",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  "review-requested": "Review Requested",
  closed: "Review Requested",
};

const SERVICE_STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  submitted: "Upgrade Request Submitted",
  received: "Request Received",
  "admin-approved": "Admin Approved",
  rejected: "Request Received",
  "technician-assigned": "Technician Assigned",
  inspection: "System Inspection",
  diagnosis: "System Diagnosis",
  "compatibility-verified": "Compatibility Verified",
  "documents-verified": "Documents Verified",
  "agreement-generated": "Rental Agreement Generated",
  quotation: "Quotation Sent",
  "offer-sent": "Price Offer Sent",
  approved: "Customer Approved",
  accepted: "Offer Accepted",
  paid: "Payment Successful",
  reserved: "Components Reserved",
  prepared: "Product Prepared",
  shipped: "Product Shipped",
  active: "Rental Active",
  "return-requested": "Return Requested",
  "product-received": "Product Received",
  refunded: "Security Deposit Refunded",
  "inventory-added": "Added to Inventory",
  published: "Published for Resale",
  "session-scheduled": "Session Scheduled",
  connected: "Technician Connected",
  "in-progress": "Upgrade Started",
  optimization: "Performance Optimization",
  "data-recovery": "Data Recovery Completed",
  "quality-testing": "Quality Testing",
  "invoice-generated": "Invoice Generated",
  "warranty-generated": "Warranty Generated",
  ready: "Ready for Delivery",
  delivered: "Delivered",
  completed: "Service Completed",
  "review-requested": "Review Requested",
  closed: "Review Requested",
};

function repairTimelineThrough(status: RepairStatus, startAt = Date.now()) {
  const activeLabel = REPAIR_STATUS_LABEL[status] || "Request Submitted";
  const activeIndex = Math.max(0, REPAIR_TIMELINE_LABELS.indexOf(activeLabel));
  return REPAIR_TIMELINE_LABELS.map((label, i) => ({
    label,
    done: i <= activeIndex,
    at: i <= activeIndex ? startAt + i * 3600000 : 0,
  }));
}

function pcBuildTimelineThrough(status: PCBuildStatus, startAt = Date.now()) {
  const activeLabel = PC_BUILD_STATUS_LABEL[status] || "Build Request Submitted";
  const activeIndex = Math.max(0, PC_BUILD_TIMELINE_LABELS.indexOf(activeLabel));
  return PC_BUILD_TIMELINE_LABELS.map((label, i) => ({
    label,
    done: i <= activeIndex,
    at: i <= activeIndex ? startAt + i * 3600000 : 0,
  }));
}

function serviceTimelineThrough(kind: ServiceRequestKind, status: ServiceRequestStatus, startAt = Date.now()) {
  const labels = kind === "upgrade" ? UPGRADE_TIMELINE_LABELS : kind === "software" ? SOFTWARE_TIMELINE_LABELS : kind === "rental" ? RENTAL_TIMELINE_LABELS : kind === "sell" ? SELL_TIMELINE_LABELS : kind === "assembly" ? ASSEMBLY_TIMELINE_LABELS : SUPPORT_TIMELINE_LABELS;
  const defaultLabel = labels[0];
  const rawLabel = SERVICE_STATUS_LABEL[status] || defaultLabel;
  const remap: Record<ServiceRequestKind, Record<string, string>> = {
    upgrade: {},
    software: { "Upgrade Request Submitted": "Service Request Submitted", "Technician Assigned": "Technician Assigned", "Quality Testing": "Quality Testing" },
    rental: { "Customer Approved": "Rental Approved", "Components Reserved": "Product Reserved", "Quality Testing": "Inspection Completed", "Invoice Generated": "Final Invoice Generated", "Review Requested": "Review Requested" },
    sell: { "Upgrade Request Submitted": "Sell Request Submitted", "Request Received": "Admin Review", "Technician Assigned": "Inspection Scheduled", "System Inspection": "Product Inspected", "Customer Approved": "Offer Accepted", "Payment Successful": "Payment Completed", "Review Requested": "Request Closed" },
    support: { "Upgrade Request Submitted": "Ticket Submitted", "Technician Assigned": "Ticket Assigned", "Customer Approved": "Issue Resolved", "Payment Successful": "Payment Completed", "Review Requested": "Ticket Closed" },
    assembly: ASSEMBLY_LABEL_REMAP,
  };
  const activeLabel = remap[kind][rawLabel] || rawLabel;
  const activeIndex = Math.max(0, labels.indexOf(activeLabel));
  return labels.map((label, i) => ({
    label,
    done: i <= activeIndex,
    at: i <= activeIndex ? startAt + i * 3600000 : 0,
  }));
}

// ── SEEDER ────────────────────────────────────────────────────────────────

const MACBOOK_AIR_M4_PRODUCT: CatalogProduct = {
  id: 22,
  name: "Apple MacBook Air M4 13-inch (16GB/256GB)",
  type: "general",
  category: "laptop",
  condition: "first-hand",
  brand: "Apple",
  model: "MacBook Air 13\" M4",
  sku: "APL-MBA-M4-13-256-SLV",
  price: 99900,
  orig: 114900,
  stock: 6,
  inStock: true,
  rating: 4.8,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: false,
  specs: [
    "Apple M4 chip (10-core CPU, 10-core GPU)",
    "16GB Unified Memory",
    "256GB SSD Storage",
    "13.6-inch Liquid Retina Display",
    "Up to 18 hours battery life",
  ],
  operatingSystem: "macOS Sequoia 15",
  weight: "1.24 kg",
  dimensions: "30.41 x 21.5 x 1.13 cm",
  processor: "Apple M4 (10-core CPU)",
  gpu: "Apple M4 10-core GPU",
  ram: "16GB Unified Memory (LPDDR5)",
  storage: "256GB SSD",
  display: "13.6-inch Liquid Retina, 2560x1664, 500 nits",
  refreshRate: "60Hz",
  powerRequirement: "35W USB-C Power Adapter",
  ports: "2x Thunderbolt 4 (USB-C), MagSafe 3, 3.5mm headphone jack",
  description: "The Apple MacBook Air 13-inch with the M4 chip delivers exceptional performance and all-day battery life in an ultra-thin, fanless design. Perfect for everyday productivity, creative work, and portability.",
  technicalDetails: "Apple M4 chip with 10-core CPU and 10-core GPU, 16GB unified memory, 256GB SSD storage, 13.6-inch Liquid Retina display with 500 nits brightness, 12MP Center Stage camera, four-speaker sound system, backlit Magic Keyboard with Touch ID.",
  useCase: "Ideal for students, professionals, and creators who need a lightweight, powerful laptop for everyday computing, content creation, and multitasking.",
  performanceNotes: "M4 chip delivers up to 2x faster performance than M1 with silent fanless operation and up to 18 hours of battery life.",
  qualityNotes: "Genuine Apple product with 1-year manufacturer warranty, precision-milled aluminum unibody design.",
  features: [
    "Fanless silent design",
    "12MP Center Stage camera",
    "MagSafe 3 charging",
    "Wi-Fi 6E & Bluetooth 5.3",
    "Backlit Magic Keyboard with Touch ID",
  ],
  boxContents: ["MacBook Air", "35W USB-C Power Adapter", "USB-C to MagSafe 3 Cable", "Documentation"],
  compatibility: ["macOS Sequoia", "Thunderbolt 4 accessories", "USB-C peripherals"],
  upgradeOptions: ["Configure to 24GB/32GB RAM at purchase", "Configure up to 2TB SSD at purchase"],
  recommendedAccessories: ["USB-C Hub", "Protective Sleeve", "Magic Mouse", "External SSD"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Apple India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Apple-authorized service partners",
  },
  seo: {
    slug: "apple-macbook-air-m4-13-inch",
    keywords: ["macbook air m4", "apple laptop", "m4 chip", "ultrabook", "apple macbook air"],
    metaTitle: "Apple MacBook Air M4 13-inch (16GB/256GB) | DESKTO",
    metaDescription: "Buy Apple MacBook Air 13-inch with M4 chip, 16GB RAM, 256GB SSD. Fanless design, up to 18-hour battery life. Best price with warranty at DESKTO.",
    tags: ["macbook air m4", "apple laptop", "m4 chip", "ultrabook", "apple macbook air"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const DELL_INSPIRON_15_PRODUCT: CatalogProduct = {
  id: 23,
  name: "Dell Inspiron 15 3530 (i5/8GB/512GB)",
  type: "general",
  category: "laptop",
  condition: "first-hand",
  brand: "Dell",
  model: "Inspiron 15 3530",
  sku: "DELL-INS15-3530-I5-512",
  price: 52990,
  orig: 59990,
  stock: 8,
  inStock: true,
  rating: 4.5,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: false,
  specs: [
    "Intel Core i5-1235U (10-core, up to 4.4GHz)",
    "8GB DDR4 RAM",
    "512GB SSD Storage",
    "15.6-inch FHD Display",
    "Intel UHD Graphics",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "1.65 kg",
  dimensions: "35.81 x 23.63 x 1.99 cm",
  processor: "Intel Core i5-1235U (10-core, up to 4.4GHz)",
  gpu: "Intel UHD Graphics",
  ram: "8GB DDR4 (expandable to 16GB)",
  storage: "512GB M.2 PCIe NVMe SSD",
  display: "15.6-inch FHD (1920x1080), anti-glare",
  refreshRate: "60Hz",
  powerRequirement: "65W Power Adapter",
  ports: "2x USB-A 3.2, 1x USB-C, HDMI 1.4, SD card reader, 3.5mm headphone jack",
  description: "The Dell Inspiron 15 3530 is a reliable everyday laptop built for productivity, study, and home use, combining a spacious FHD display with dependable Intel performance.",
  technicalDetails: "Intel Core i5-1235U 10-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, 15.6-inch FHD anti-glare display, Intel UHD Graphics, Waves MaxxAudio speakers.",
  useCase: "Great for students, home users, and office productivity — browsing, documents, video calls, and light multitasking.",
  performanceNotes: "10-core Intel i5 handles everyday multitasking smoothly with fast SSD storage for quick boot and app load times.",
  qualityNotes: "Genuine Dell product with 1-year manufacturer warranty and standard build quality checks.",
  features: [
    "Narrow-border FHD display",
    "Dell ExpressCharge fast charging",
    "Waves MaxxAudio sound",
    "Spill-resistant keyboard",
  ],
  boxContents: ["Laptop", "65W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals"],
  upgradeOptions: ["Add RAM up to 16GB", "Add secondary storage"],
  recommendedAccessories: ["Laptop Bag", "Wireless Mouse", "USB-C Hub"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Dell India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Dell-authorized service partners",
  },
  seo: {
    slug: "dell-inspiron-15-3530",
    keywords: ["dell inspiron 15", "dell laptop", "i5 laptop", "budget laptop", "dell inspiron 3530"],
    metaTitle: "Dell Inspiron 15 3530 (i5/8GB/512GB) | DESKTO",
    metaDescription: "Buy Dell Inspiron 15 3530 with Intel Core i5, 8GB RAM, 512GB SSD. Reliable everyday performance with warranty at DESKTO.",
    tags: ["dell inspiron 15", "dell laptop", "i5 laptop", "budget laptop", "dell inspiron 3530"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const HP_15S_PRODUCT: CatalogProduct = {
  id: 24,
  name: "HP 15s-fq5330TU (i5/8GB/512GB)",
  type: "general",
  category: "laptop",
  condition: "first-hand",
  brand: "HP",
  model: "15s-fq5330TU",
  sku: "HP-15S-FQ5330-I5-512",
  price: 47990,
  orig: 54990,
  stock: 10,
  inStock: true,
  rating: 4.4,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: false,
  specs: [
    "Intel Core i5-1235U (10-core, up to 4.4GHz)",
    "8GB DDR4 RAM",
    "512GB SSD Storage",
    "15.6-inch FHD Micro-edge Display",
    "Intel Iris Xe Graphics",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "1.69 kg",
  dimensions: "35.9 x 23.7 x 1.79 cm",
  processor: "Intel Core i5-1235U (10-core, up to 4.4GHz)",
  gpu: "Intel Iris Xe Graphics",
  ram: "8GB DDR4 (expandable to 16GB)",
  storage: "512GB PCIe NVMe SSD",
  display: "15.6-inch FHD (1920x1080), micro-edge, anti-glare",
  refreshRate: "60Hz",
  powerRequirement: "45W Power Adapter",
  ports: "1x USB-C, 2x USB-A, HDMI 1.4, SD card reader, 3.5mm headphone jack",
  description: "The HP 15s-fq5330TU is a slim, value-focused laptop for everyday computing, offering a crisp FHD display and dependable Intel performance in a portable design.",
  technicalDetails: "Intel Core i5-1235U 10-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, 15.6-inch FHD micro-edge display, Intel Iris Xe Graphics, dual speakers with HP Audio Boost.",
  useCase: "Ideal for students, home use, and everyday office work — web browsing, documents, streaming, and video calls.",
  performanceNotes: "10-core Intel i5 with Iris Xe graphics handles everyday multitasking and light creative work smoothly.",
  qualityNotes: "Genuine HP product with 1-year manufacturer warranty and standard build quality checks.",
  features: [
    "Micro-edge FHD display",
    "HP Fast Charge support",
    "HP Audio Boost dual speakers",
    "Lightweight portable design",
  ],
  boxContents: ["Laptop", "45W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals"],
  upgradeOptions: ["Add RAM up to 16GB", "Add secondary storage"],
  recommendedAccessories: ["Laptop Bag", "Wireless Mouse", "USB-C Hub"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "HP India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via HP-authorized service partners",
  },
  seo: {
    slug: "hp-15s-fq5330tu",
    keywords: ["hp 15s", "hp laptop", "i5 laptop", "budget laptop", "hp 15s fq5330"],
    metaTitle: "HP 15s-fq5330TU (i5/8GB/512GB) | DESKTO",
    metaDescription: "Buy HP 15s-fq5330TU with Intel Core i5, 8GB RAM, 512GB SSD. Slim, value-focused everyday laptop with warranty at DESKTO.",
    tags: ["hp 15s", "hp laptop", "i5 laptop", "budget laptop", "hp 15s fq5330"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const LENOVO_IDEAPAD_SLIM3_PRODUCT: CatalogProduct = {
  id: 25,
  name: "Lenovo IdeaPad Slim 3 15AMN8 (R5/8GB/512GB)",
  type: "general",
  category: "laptop",
  condition: "first-hand",
  brand: "Lenovo",
  model: "IdeaPad Slim 3 15AMN8",
  sku: "LEN-IPS3-15-R5-512",
  price: 42990,
  orig: 48990,
  stock: 10,
  inStock: true,
  rating: 4.4,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: false,
  specs: [
    "AMD Ryzen 5 7430U (6-core, up to 4.3GHz)",
    "8GB LPDDR5 RAM",
    "512GB SSD Storage",
    "15.6-inch FHD Display",
    "AMD Radeon Graphics",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "1.63 kg",
  dimensions: "35.9 x 23.3 x 1.9 cm",
  processor: "AMD Ryzen 5 7430U (6-core, up to 4.3GHz)",
  gpu: "AMD Radeon Graphics (integrated)",
  ram: "8GB LPDDR5",
  storage: "512GB PCIe NVMe SSD",
  display: "15.6-inch FHD (1920x1080), anti-glare, 60Hz",
  refreshRate: "60Hz",
  powerRequirement: "65W Power Adapter",
  ports: "2x USB-A 3.2, 1x USB-C, HDMI 1.4, SD card reader, 3.5mm headphone jack",
  description: "The Lenovo IdeaPad Slim 3 is a light, dependable everyday laptop built for students and home users who want smooth performance at an affordable price.",
  technicalDetails: "AMD Ryzen 5 7430U 6-core processor, 8GB LPDDR5 RAM, 512GB PCIe NVMe SSD, 15.6-inch FHD anti-glare display, AMD Radeon integrated graphics, dual stereo speakers.",
  useCase: "Great for students, home users, and everyday productivity — browsing, documents, streaming, and video calls.",
  performanceNotes: "Ryzen 5 7430U delivers smooth everyday multitasking with fast SSD storage for quick boot and app load times.",
  qualityNotes: "Genuine Lenovo product with 1-year manufacturer warranty and standard build quality checks.",
  features: ["Slim, lightweight chassis", "Rapid Charge support", "Dolby Audio speakers", "Privacy webcam shutter"],
  boxContents: ["Laptop", "65W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals"],
  upgradeOptions: ["Add secondary storage"],
  recommendedAccessories: ["Laptop Bag", "Wireless Mouse", "USB-C Hub"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Lenovo India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Lenovo-authorized service partners",
  },
  seo: {
    slug: "lenovo-ideapad-slim-3-15amn8",
    keywords: ["lenovo ideapad slim 3", "lenovo laptop", "ryzen 5 laptop", "budget laptop"],
    metaTitle: "Lenovo IdeaPad Slim 3 15AMN8 (R5/8GB/512GB) | DESKTO",
    metaDescription: "Buy Lenovo IdeaPad Slim 3 with AMD Ryzen 5, 8GB RAM, 512GB SSD. Light, dependable everyday laptop with warranty at DESKTO.",
    tags: ["lenovo ideapad slim 3", "lenovo laptop", "ryzen 5 laptop", "budget laptop"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const ASUS_VIVOBOOK_15_PRODUCT: CatalogProduct = {
  id: 26,
  name: "ASUS Vivobook 15 X1504VA (i5/16GB/512GB)",
  type: "general",
  category: "laptop",
  condition: "first-hand",
  brand: "ASUS",
  model: "Vivobook 15 X1504VA",
  sku: "ASUS-VB15-X1504-I5-512",
  price: 54990,
  orig: 62990,
  stock: 9,
  inStock: true,
  rating: 4.5,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: false,
  specs: [
    "Intel Core i5-1334U (10-core, up to 4.6GHz)",
    "16GB DDR4 RAM",
    "512GB SSD Storage",
    "15.6-inch FHD Display",
    "Intel UHD Graphics",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "1.7 kg",
  dimensions: "35.9 x 23.5 x 1.99 cm",
  processor: "Intel Core i5-1334U (10-core, up to 4.6GHz)",
  gpu: "Intel UHD Graphics",
  ram: "16GB DDR4",
  storage: "512GB PCIe NVMe SSD",
  display: "15.6-inch FHD (1920x1080), 60Hz",
  refreshRate: "60Hz",
  powerRequirement: "65W Power Adapter",
  ports: "2x USB-A 3.2, 1x USB-C, HDMI 1.4, SD card reader, 3.5mm headphone jack",
  description: "The ASUS Vivobook 15 blends generous 16GB memory with a spacious FHD display, making it a strong all-rounder for productivity and everyday multitasking.",
  technicalDetails: "Intel Core i5-1334U 10-core processor, 16GB DDR4 RAM, 512GB PCIe NVMe SSD, 15.6-inch FHD display, Intel UHD Graphics, ASUS SonicMaster audio.",
  useCase: "Ideal for students, professionals, and home users who want extra memory headroom for multitasking and light creative work.",
  performanceNotes: "16GB RAM and a 10-core i5 keep multiple apps and browser tabs running smoothly without slowdown.",
  qualityNotes: "Genuine ASUS product with 1-year manufacturer warranty and standard build quality checks.",
  features: ["ASUS SonicMaster audio", "Fingerprint sensor", "Backlit keyboard", "ErgoLift hinge design"],
  boxContents: ["Laptop", "65W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals"],
  upgradeOptions: ["Add secondary storage"],
  recommendedAccessories: ["Laptop Bag", "Wireless Mouse", "USB-C Hub"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "ASUS India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via ASUS-authorized service partners",
  },
  seo: {
    slug: "asus-vivobook-15-x1504va",
    keywords: ["asus vivobook 15", "asus laptop", "i5 laptop 16gb", "vivobook"],
    metaTitle: "ASUS Vivobook 15 X1504VA (i5/16GB/512GB) | DESKTO",
    metaDescription: "Buy ASUS Vivobook 15 with Intel Core i5, 16GB RAM, 512GB SSD. Strong all-round performance with warranty at DESKTO.",
    tags: ["asus vivobook 15", "asus laptop", "i5 laptop 16gb", "vivobook"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const MSI_KATANA_15_PRODUCT: CatalogProduct = {
  id: 27,
  name: "MSI Katana 15 B13VFK (i7/RTX 4060/16GB/1TB)",
  type: "gaming",
  category: "gaming-laptop",
  condition: "first-hand",
  brand: "MSI",
  model: "Katana 15 B13VFK",
  sku: "MSI-KAT15-B13VFK-I7-RTX4060",
  price: 109990,
  orig: 124990,
  stock: 5,
  inStock: true,
  rating: 4.6,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: true,
  specs: [
    "Intel Core i7-13620H (10-core, up to 4.9GHz)",
    "NVIDIA GeForce RTX 4060 8GB GDDR6",
    "16GB DDR5 RAM",
    "1TB NVMe SSD",
    "15.6-inch FHD 144Hz Display",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "2.25 kg",
  dimensions: "35.9 x 26.5 x 2.19 cm",
  processor: "Intel Core i7-13620H (10-core, up to 4.9GHz)",
  gpu: "NVIDIA GeForce RTX 4060 8GB GDDR6",
  ram: "16GB DDR5",
  storage: "1TB NVMe SSD",
  display: "15.6-inch FHD (1920x1080), 144Hz, IPS-level",
  refreshRate: "144Hz",
  powerRequirement: "180W Power Adapter",
  ports: "3x USB-A 3.2, 1x USB-C, HDMI 2.1, RJ45 LAN, 3.5mm headphone jack",
  description: "The MSI Katana 15 is a performance gaming laptop pairing an RTX 4060 GPU with a fast 144Hz display, built for competitive gaming and demanding workloads.",
  technicalDetails: "Intel Core i7-13620H 10-core processor, NVIDIA GeForce RTX 4060 8GB GDDR6, 16GB DDR5 RAM, 1TB NVMe SSD, 15.6-inch FHD 144Hz IPS-level display, Cooler Boost 5 thermal system.",
  useCase: "Built for gamers and creators who need high frame rates, fast rendering, and reliable thermals under sustained load.",
  performanceNotes: "RTX 4060 and i7-13620H deliver smooth 1080p gaming at high settings with strong multitasking headroom.",
  qualityNotes: "Genuine MSI product with 1-year manufacturer warranty and Cooler Boost thermal validation.",
  features: ["Cooler Boost 5 thermal system", "Per-key RGB-ready backlit keyboard", "144Hz refresh rate display", "MSI Center performance tuning"],
  boxContents: ["Laptop", "180W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals", "External GPU-ready ports"],
  upgradeOptions: ["Add secondary SSD storage", "Upgrade RAM up to 32GB"],
  recommendedAccessories: ["Gaming Mouse", "Cooling Pad", "Laptop Backpack"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "MSI India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via MSI-authorized service partners",
  },
  seo: {
    slug: "msi-katana-15-b13vfk",
    keywords: ["msi katana 15", "gaming laptop", "rtx 4060 laptop", "msi gaming laptop"],
    metaTitle: "MSI Katana 15 B13VFK (i7/RTX 4060/16GB/1TB) | DESKTO",
    metaDescription: "Buy MSI Katana 15 with Intel Core i7, RTX 4060, 16GB RAM, 1TB SSD. High-performance 144Hz gaming laptop with warranty at DESKTO.",
    tags: ["msi katana 15", "gaming laptop", "rtx 4060 laptop", "msi gaming laptop"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const ACER_PREDATOR_HELIOS_NEO_16_PRODUCT: CatalogProduct = {
  id: 28,
  name: "Acer Predator Helios Neo 16 PHN16-71 (i9/RTX 4070/16GB/1TB)",
  type: "gaming",
  category: "gaming-laptop",
  condition: "first-hand",
  brand: "Acer",
  model: "Predator Helios Neo 16 PHN16-71",
  sku: "ACER-PHN16-71-I9-RTX4070",
  price: 184990,
  orig: 209990,
  stock: 4,
  inStock: true,
  rating: 4.7,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: true,
  specs: [
    "Intel Core i9-13900HX (24-core)",
    "NVIDIA GeForce RTX 4070 8GB GDDR6",
    "16GB DDR5 RAM",
    "1TB NVMe SSD",
    "16-inch WQXGA 165Hz Display",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "2.6 kg",
  dimensions: "35.9 x 27.2 x 2.35 cm",
  processor: "Intel Core i9-13900HX (24-core)",
  gpu: "NVIDIA GeForce RTX 4070 8GB GDDR6",
  ram: "16GB DDR5",
  storage: "1TB NVMe SSD",
  display: "16-inch WQXGA (2560x1600), 165Hz",
  refreshRate: "165Hz",
  powerRequirement: "240W Power Adapter",
  ports: "3x USB-A 3.2, 1x USB-C Thunderbolt 4, HDMI 2.1, RJ45 LAN, 3.5mm headphone jack",
  description: "The Acer Predator Helios Neo 16 pairs a flagship Intel i9 processor with an RTX 4070 GPU and a high-resolution 165Hz display for serious gaming and content creation performance.",
  technicalDetails: "Intel Core i9-13900HX 24-core processor, NVIDIA GeForce RTX 4070 8GB GDDR6, 16GB DDR5 RAM, 1TB NVMe SSD, 16-inch WQXGA 165Hz display, 5th Gen AeroBlade 3D fan thermal system.",
  useCase: "Built for high-end gaming, streaming, and content creation workloads that demand top-tier CPU and GPU performance.",
  performanceNotes: "i9-13900HX and RTX 4070 combination handles AAA gaming at high/ultra settings and demanding creative workloads with ease.",
  qualityNotes: "Genuine Acer product with 1-year manufacturer warranty and 5th Gen AeroBlade thermal validation.",
  features: ["5th Gen AeroBlade 3D fan cooling", "PredatorSense performance tuning", "Per-zone RGB keyboard", "165Hz WQXGA display"],
  boxContents: ["Laptop", "240W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "Thunderbolt 4 accessories", "USB-C peripherals"],
  upgradeOptions: ["Add secondary SSD storage", "Upgrade RAM up to 32GB"],
  recommendedAccessories: ["Gaming Mouse", "Cooling Pad", "Laptop Backpack"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Acer India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Acer-authorized service partners",
  },
  seo: {
    slug: "acer-predator-helios-neo-16-phn16-71",
    keywords: ["acer predator helios neo 16", "gaming laptop", "rtx 4070 laptop", "acer predator"],
    metaTitle: "Acer Predator Helios Neo 16 (i9/RTX 4070/16GB/1TB) | DESKTO",
    metaDescription: "Buy Acer Predator Helios Neo 16 with Intel Core i9, RTX 4070, 16GB RAM, 1TB SSD. Flagship 165Hz gaming laptop with warranty at DESKTO.",
    tags: ["acer predator helios neo 16", "gaming laptop", "rtx 4070 laptop", "acer predator"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const LENOVO_LEGION_5_PRODUCT: CatalogProduct = {
  id: 29,
  name: "Lenovo Legion 5 16IRX9 (R7/RTX 4060/16GB/512GB)",
  type: "gaming",
  category: "gaming-laptop",
  condition: "first-hand",
  brand: "Lenovo",
  model: "Legion 5 16IRX9",
  sku: "LEN-LEG5-16IRX9-R7-RTX4060",
  price: 139990,
  orig: 154990,
  stock: 5,
  inStock: true,
  rating: 4.6,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: true,
  specs: [
    "AMD Ryzen 7 7735HS (8-core, up to 4.75GHz)",
    "NVIDIA GeForce RTX 4060 8GB GDDR6",
    "16GB DDR5 RAM",
    "512GB NVMe SSD",
    "16-inch WQXGA 165Hz Display",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "2.4 kg",
  dimensions: "35.7 x 26.1 x 2.29 cm",
  processor: "AMD Ryzen 7 7735HS (8-core, up to 4.75GHz)",
  gpu: "NVIDIA GeForce RTX 4060 8GB GDDR6",
  ram: "16GB DDR5",
  storage: "512GB NVMe SSD",
  display: "16-inch WQXGA (2560x1600), 165Hz",
  refreshRate: "165Hz",
  powerRequirement: "230W Power Adapter",
  ports: "3x USB-A 3.2, 1x USB-C, HDMI 2.1, RJ45 LAN, 3.5mm headphone jack",
  description: "The Lenovo Legion 5 combines an AMD Ryzen 7 processor with an RTX 4060 GPU and a sharp 165Hz WQXGA display, delivering strong gaming performance with solid build quality.",
  technicalDetails: "AMD Ryzen 7 7735HS 8-core processor, NVIDIA GeForce RTX 4060 8GB GDDR6, 16GB DDR5 RAM, 512GB NVMe SSD, 16-inch WQXGA 165Hz display, Legion Coldfront thermal system.",
  useCase: "Suited for gamers who want high frame rates and a sharp display without stepping up to flagship pricing.",
  performanceNotes: "Ryzen 7 7735HS and RTX 4060 deliver smooth 1440p gaming at high settings with efficient power draw.",
  qualityNotes: "Genuine Lenovo product with 1-year manufacturer warranty and Legion Coldfront thermal validation.",
  features: ["Legion Coldfront 5.0 cooling", "4-zone RGB keyboard", "165Hz WQXGA display", "Legion Space performance tuning"],
  boxContents: ["Laptop", "230W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "USB-C peripherals"],
  upgradeOptions: ["Add secondary SSD storage", "Upgrade RAM up to 32GB"],
  recommendedAccessories: ["Gaming Mouse", "Cooling Pad", "Laptop Backpack"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Lenovo India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Lenovo-authorized service partners",
  },
  seo: {
    slug: "lenovo-legion-5-16irx9",
    keywords: ["lenovo legion 5", "gaming laptop", "rtx 4060 laptop", "legion 5"],
    metaTitle: "Lenovo Legion 5 16IRX9 (R7/RTX 4060/16GB/512GB) | DESKTO",
    metaDescription: "Buy Lenovo Legion 5 with AMD Ryzen 7, RTX 4060, 16GB RAM, 512GB SSD. Sharp 165Hz gaming laptop with warranty at DESKTO.",
    tags: ["lenovo legion 5", "gaming laptop", "rtx 4060 laptop", "legion 5"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const ALIENWARE_M16_PRODUCT: CatalogProduct = {
  id: 30,
  name: "Alienware m16 R1 (i9/RTX 4070/32GB/1TB)",
  type: "gaming",
  category: "gaming-laptop",
  condition: "first-hand",
  brand: "Alienware",
  model: "Alienware m16 R1",
  sku: "DELL-ALW-M16R1-I9-RTX4070",
  price: 229990,
  orig: 254990,
  stock: 3,
  inStock: true,
  rating: 4.7,
  badge: "NEW",
  warrantyMonths: 12,
  rgb: true,
  specs: [
    "Intel Core i9-13900HX (24-core)",
    "NVIDIA GeForce RTX 4070 8GB GDDR6",
    "32GB DDR5 RAM",
    "1TB NVMe SSD",
    "16-inch QHD+ 240Hz Display",
  ],
  operatingSystem: "Windows 11 Home",
  weight: "2.85 kg",
  dimensions: "35.5 x 27.4 x 2.17 cm",
  processor: "Intel Core i9-13900HX (24-core)",
  gpu: "NVIDIA GeForce RTX 4070 8GB GDDR6",
  ram: "32GB DDR5",
  storage: "1TB NVMe SSD",
  display: "16-inch QHD+ (2560x1600), 240Hz",
  refreshRate: "240Hz",
  powerRequirement: "240W Power Adapter",
  ports: "3x USB-A 3.2, 1x USB-C Thunderbolt 4, HDMI 2.1, RJ45 LAN, 3.5mm headphone jack",
  description: "The Alienware m16 R1 is a premium gaming laptop pairing a flagship i9 processor and RTX 4070 GPU with a 240Hz QHD+ display and Alienware's signature Cryo-tech cooling.",
  technicalDetails: "Intel Core i9-13900HX 24-core processor, NVIDIA GeForce RTX 4070 8GB GDDR6, 32GB DDR5 RAM, 1TB NVMe SSD, 16-inch QHD+ 240Hz display, Alienware Cryo-tech thermal system.",
  useCase: "Built for enthusiast gamers and creators who want top-tier performance, high refresh rates, and premium build quality.",
  performanceNotes: "i9-13900HX and RTX 4070 with 32GB RAM deliver high frame rates at QHD+ resolution and handle demanding creative workloads smoothly.",
  qualityNotes: "Genuine Dell Alienware product with 1-year manufacturer warranty and Cryo-tech thermal validation.",
  features: ["Alienware Cryo-tech thermal design", "Per-key AlienFX RGB keyboard", "240Hz QHD+ display", "Alienware Command Center tuning"],
  boxContents: ["Laptop", "240W Power Adapter", "Documentation"],
  compatibility: ["Windows 11", "Thunderbolt 4 accessories", "USB-C peripherals"],
  upgradeOptions: ["Add secondary SSD storage"],
  recommendedAccessories: ["Gaming Mouse", "Cooling Pad", "Laptop Backpack"],
  deliveryInfo: {
    homeDelivery: true,
    storePickup: true,
    estimatedDelivery: "3-5 working days",
    shippingCharges: 0,
    freeShippingAbove: 50000,
    returnPolicy: "7-day returns",
  },
  warrantyInfo: {
    type: "Dell Alienware India Manufacturer Warranty (1 Year)",
    claimProcess: "Contact DESKTO support via WhatsApp or call",
    pickupPolicy: "Doorstep pickup available for warranty claims",
    repairTerms: "Repairs handled via Dell-authorized service partners",
  },
  seo: {
    slug: "alienware-m16-r1",
    keywords: ["alienware m16", "gaming laptop", "rtx 4070 laptop", "alienware"],
    metaTitle: "Alienware m16 R1 (i9/RTX 4070/32GB/1TB) | DESKTO",
    metaDescription: "Buy Alienware m16 R1 with Intel Core i9, RTX 4070, 32GB RAM, 1TB SSD. Premium 240Hz gaming laptop with warranty at DESKTO.",
    tags: ["alienware m16", "gaming laptop", "rtx 4070 laptop", "alienware"],
  },
  catalogStatus: "draft",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function draftCatalogProduct(p: Partial<CatalogProduct> & Pick<CatalogProduct, "id" | "name" | "brand" | "category" | "price" | "stock">): CatalogProduct {
  return {
    type: "general",
    condition: "first-hand",
    rating: 4.5,
    badge: "NEW",
    warrantyMonths: 12,
    rgb: false,
    inStock: p.stock > 0,
    deliveryInfo: {
      homeDelivery: true,
      storePickup: true,
      estimatedDelivery: "3-5 working days",
      shippingCharges: 0,
      freeShippingAbove: 50000,
      returnPolicy: "7-day returns",
    },
    warrantyInfo: {
      type: `${p.brand} India Manufacturer Warranty (1 Year)`,
      claimProcess: "Contact DESKTO support via WhatsApp or call",
      pickupPolicy: "Doorstep pickup available for warranty claims",
      repairTerms: `Repairs handled via ${p.brand}-authorized service partners`,
    },
    catalogStatus: "draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...p,
  };
}

// ── Office / prebuilt desktops ──
const DELL_OPTIPLEX_7010_PRODUCT = draftCatalogProduct({
  id: 31, name: "Dell OptiPlex 7010 SFF (i5/8GB/512GB)", category: "desktop-pc", brand: "Dell", model: "OptiPlex 7010 SFF",
  sku: "DELL-OPT7010-SFF-I5-8-512", price: 64990, orig: 72990, stock: 6,
  specs: ["Intel Core i5-13500 (14-core, up to 4.8GHz)", "8GB DDR5 RAM", "512GB SSD", "Intel UHD Graphics 770", "Windows 11 Pro"],
  operatingSystem: "Windows 11 Pro", weight: "5.4 kg", dimensions: "29.2 x 9.3 x 29.3 cm",
  processor: "Intel Core i5-13500 (14-core, up to 4.8GHz)", gpu: "Intel UHD Graphics 770 (integrated)", ram: "8GB DDR5", storage: "512GB PCIe NVMe SSD",
  powerRequirement: "260W Internal PSU", ports: "6x USB-A, 2x USB-C, DisplayPort x2, RJ45 LAN, 3.5mm headphone jack",
  description: "The Dell OptiPlex 7010 SFF is a compact, business-grade desktop built for reliable everyday office computing with enterprise security and manageability features.",
  technicalDetails: "Intel Core i5-13500 14-core processor, 8GB DDR5 RAM, 512GB PCIe NVMe SSD, Intel UHD Graphics 770, small form factor chassis with tool-less access.",
  useCase: "Ideal for office workstations, front-desk systems, and business productivity environments.",
  performanceNotes: "14-core i5 handles office multitasking, spreadsheets, and business applications smoothly.",
  qualityNotes: "Genuine Dell business product with 1-year manufacturer warranty and enterprise-grade build quality.",
  features: ["Small form factor chassis", "Tool-less internal access", "Dell Optimizer software", "TPM 2.0 security"],
  boxContents: ["Desktop unit", "Power cable", "Keyboard", "Mouse", "Documentation"],
  compatibility: ["Windows 11 Pro", "Standard peripherals"], upgradeOptions: ["Add RAM up to 32GB", "Add secondary storage"],
  recommendedAccessories: ["Monitor", "Keyboard & Mouse Combo", "UPS"],
  seo: { slug: "dell-optiplex-7010-sff", keywords: ["dell optiplex 7010", "office desktop", "business pc"], metaTitle: "Dell OptiPlex 7010 SFF (i5/8GB/512GB) | DESKTO", metaDescription: "Buy Dell OptiPlex 7010 SFF business desktop with Intel Core i5, 8GB RAM, 512GB SSD at DESKTO.", tags: ["dell optiplex 7010", "office desktop", "business pc"] },
});

const HP_PRODESK_400_PRODUCT = draftCatalogProduct({
  id: 32, name: "HP ProDesk 400 G9 SFF (i5/8GB/512GB)", category: "desktop-pc", brand: "HP", model: "ProDesk 400 G9 SFF",
  sku: "HP-PD400G9-SFF-I5-8-512", price: 58990, orig: 65990, stock: 7,
  specs: ["Intel Core i5-12500 (6-core, up to 4.6GHz)", "8GB DDR4 RAM", "512GB SSD", "Intel UHD Graphics 770", "Windows 11 Pro"],
  operatingSystem: "Windows 11 Pro", weight: "5.1 kg", dimensions: "29.9 x 9.8 x 30.4 cm",
  processor: "Intel Core i5-12500 (6-core, up to 4.6GHz)", gpu: "Intel UHD Graphics 770 (integrated)", ram: "8GB DDR4", storage: "512GB PCIe NVMe SSD",
  powerRequirement: "180W Internal PSU", ports: "6x USB-A, 2x USB-C, DisplayPort x2, RJ45 LAN, 3.5mm headphone jack",
  description: "The HP ProDesk 400 G9 SFF is a dependable small form factor business desktop designed for everyday office computing and easy IT management.",
  technicalDetails: "Intel Core i5-12500 6-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, Intel UHD Graphics 770, compact SFF chassis.",
  useCase: "Suited for office workstations, business productivity, and standard enterprise deployments.",
  performanceNotes: "6-core i5 comfortably handles office applications, browsing, and video conferencing.",
  qualityNotes: "Genuine HP business product with 1-year manufacturer warranty.",
  features: ["Small form factor chassis", "HP Wolf Security", "Tool-less chassis access", "Energy-efficient PSU"],
  boxContents: ["Desktop unit", "Power cable", "Keyboard", "Mouse", "Documentation"],
  compatibility: ["Windows 11 Pro", "Standard peripherals"], upgradeOptions: ["Add RAM up to 32GB", "Add secondary storage"],
  recommendedAccessories: ["Monitor", "Keyboard & Mouse Combo", "UPS"],
  seo: { slug: "hp-prodesk-400-g9-sff", keywords: ["hp prodesk 400", "office desktop", "business pc"], metaTitle: "HP ProDesk 400 G9 SFF (i5/8GB/512GB) | DESKTO", metaDescription: "Buy HP ProDesk 400 G9 SFF business desktop with Intel Core i5, 8GB RAM, 512GB SSD at DESKTO.", tags: ["hp prodesk 400", "office desktop", "business pc"] },
});

const LENOVO_THINKCENTRE_M70_PRODUCT = draftCatalogProduct({
  id: 33, name: "Lenovo ThinkCentre M70q Gen 4 (i5/8GB/512GB)", category: "desktop-pc", brand: "Lenovo", model: "ThinkCentre M70q Gen 4",
  sku: "LEN-M70Q-G4-I5-8-512", price: 56990, orig: 63990, stock: 8,
  specs: ["Intel Core i5-13400T (10-core, up to 4.6GHz)", "8GB DDR4 RAM", "512GB SSD", "Intel UHD Graphics 730", "Windows 11 Pro"],
  operatingSystem: "Windows 11 Pro", weight: "1.3 kg", dimensions: "17.9 x 18.2 x 3.49 cm",
  processor: "Intel Core i5-13400T (10-core, up to 4.6GHz)", gpu: "Intel UHD Graphics 730 (integrated)", ram: "8GB DDR4", storage: "512GB PCIe NVMe SSD",
  powerRequirement: "90W External Power Adapter", ports: "4x USB-A, 2x USB-C, DisplayPort, HDMI, RJ45 LAN, 3.5mm headphone jack",
  description: "The Lenovo ThinkCentre M70q Gen 4 is an ultra-compact 1-liter desktop that saves desk space without compromising on business performance.",
  technicalDetails: "Intel Core i5-13400T 10-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, Intel UHD Graphics 730, tiny-form-factor chassis with VESA mount support.",
  useCase: "Perfect for space-constrained office desks, receptionist counters, and digital signage setups.",
  performanceNotes: "10-core i5-T series balances efficient power draw with smooth office multitasking performance.",
  qualityNotes: "Genuine Lenovo business product with 1-year manufacturer warranty and MIL-SPEC durability testing.",
  features: ["1-liter tiny form factor", "VESA mount compatible", "ThinkShield security", "Low power consumption"],
  boxContents: ["Desktop unit", "Power adapter", "Keyboard", "Mouse", "Documentation"],
  compatibility: ["Windows 11 Pro", "Standard peripherals"], upgradeOptions: ["Add RAM up to 32GB", "Add secondary storage"],
  recommendedAccessories: ["Monitor", "Keyboard & Mouse Combo", "VESA Mount Bracket"],
  seo: { slug: "lenovo-thinkcentre-m70q-gen4", keywords: ["thinkcentre m70q", "lenovo desktop", "tiny desktop"], metaTitle: "Lenovo ThinkCentre M70q Gen 4 (i5/8GB/512GB) | DESKTO", metaDescription: "Buy Lenovo ThinkCentre M70q Gen 4 tiny desktop with Intel Core i5, 8GB RAM, 512GB SSD at DESKTO.", tags: ["thinkcentre m70q", "lenovo desktop", "tiny desktop"] },
});

const ASUS_EXPERTCENTER_D5_PRODUCT = draftCatalogProduct({
  id: 34, name: "ASUS ExpertCenter D500SD (i5/8GB/512GB)", category: "desktop-pc", brand: "ASUS", model: "ExpertCenter D500SD",
  sku: "ASUS-EC-D500SD-I5-8-512", price: 54990, orig: 61990, stock: 6,
  specs: ["Intel Core i5-13400 (10-core, up to 4.6GHz)", "8GB DDR4 RAM", "512GB SSD", "Intel UHD Graphics 730", "Windows 11 Pro"],
  operatingSystem: "Windows 11 Pro", weight: "5.6 kg", dimensions: "33.8 x 10 x 33.8 cm",
  processor: "Intel Core i5-13400 (10-core, up to 4.6GHz)", gpu: "Intel UHD Graphics 730 (integrated)", ram: "8GB DDR4", storage: "512GB PCIe NVMe SSD",
  powerRequirement: "250W Internal PSU", ports: "6x USB-A, 2x USB-C, DisplayPort, HDMI, RJ45 LAN, 3.5mm headphone jack",
  description: "The ASUS ExpertCenter D500SD is a reliable small form factor business desktop built for consistent day-to-day office performance.",
  technicalDetails: "Intel Core i5-13400 10-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, Intel UHD Graphics 730, tool-less SFF chassis.",
  useCase: "Suited for office workstations, business productivity, and standard enterprise deployments.",
  performanceNotes: "10-core i5 comfortably handles office applications, browsing, and video conferencing.",
  qualityNotes: "Genuine ASUS business product with 1-year manufacturer warranty.",
  features: ["Small form factor chassis", "Tool-less access", "ASUS Business Manager", "Energy-efficient PSU"],
  boxContents: ["Desktop unit", "Power cable", "Keyboard", "Mouse", "Documentation"],
  compatibility: ["Windows 11 Pro", "Standard peripherals"], upgradeOptions: ["Add RAM up to 32GB", "Add secondary storage"],
  recommendedAccessories: ["Monitor", "Keyboard & Mouse Combo", "UPS"],
  seo: { slug: "asus-expertcenter-d500sd", keywords: ["asus expertcenter d5", "office desktop", "business pc"], metaTitle: "ASUS ExpertCenter D500SD (i5/8GB/512GB) | DESKTO", metaDescription: "Buy ASUS ExpertCenter D500SD business desktop with Intel Core i5, 8GB RAM, 512GB SSD at DESKTO.", tags: ["asus expertcenter d5", "office desktop", "business pc"] },
});

const ACER_ASPIRE_TC_PRODUCT = draftCatalogProduct({
  id: 35, name: "Acer Aspire TC-1660 (i5/8GB/512GB)", category: "desktop-pc", brand: "Acer", model: "Aspire TC-1660",
  sku: "ACER-ATC1660-I5-8-512", price: 49990, orig: 56990, stock: 9,
  specs: ["Intel Core i5-13400 (10-core, up to 4.6GHz)", "8GB DDR4 RAM", "512GB SSD", "Intel UHD Graphics 730", "Windows 11 Home"],
  operatingSystem: "Windows 11 Home", weight: "6.2 kg", dimensions: "34.9 x 15 x 34.7 cm",
  processor: "Intel Core i5-13400 (10-core, up to 4.6GHz)", gpu: "Intel UHD Graphics 730 (integrated)", ram: "8GB DDR4", storage: "512GB PCIe NVMe SSD",
  powerRequirement: "300W Internal PSU", ports: "4x USB-A, 2x USB-C, DisplayPort, HDMI, VGA, RJ45 LAN, 3.5mm headphone jack",
  description: "The Acer Aspire TC-1660 is an affordable home tower desktop offering solid everyday performance for browsing, work, and entertainment.",
  technicalDetails: "Intel Core i5-13400 10-core processor, 8GB DDR4 RAM, 512GB PCIe NVMe SSD, Intel UHD Graphics 730, full tower chassis with expansion room.",
  useCase: "Great for home use, students, and general productivity with room to add a discrete GPU later.",
  performanceNotes: "10-core i5 handles everyday computing, browsing, and office tasks with ease.",
  qualityNotes: "Genuine Acer product with 1-year manufacturer warranty.",
  features: ["Tower chassis with expansion bays", "Acer PredatorSense not included (consumer line)", "Quiet cooling profile", "Multiple display outputs"],
  boxContents: ["Desktop unit", "Power cable", "Keyboard", "Mouse", "Documentation"],
  compatibility: ["Windows 11 Home", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add discrete GPU", "Add RAM up to 32GB", "Add secondary storage"],
  recommendedAccessories: ["Monitor", "Keyboard & Mouse Combo", "UPS"],
  seo: { slug: "acer-aspire-tc-1660", keywords: ["acer aspire tc", "home desktop", "tower pc"], metaTitle: "Acer Aspire TC-1660 (i5/8GB/512GB) | DESKTO", metaDescription: "Buy Acer Aspire TC-1660 tower desktop with Intel Core i5, 8GB RAM, 512GB SSD at DESKTO.", tags: ["acer aspire tc", "home desktop", "tower pc"] },
});

// ── Prebuilt gaming PCs ──
const CORSAIR_VENGEANCE_I7400_PRODUCT = draftCatalogProduct({
  id: 36, name: "Corsair Vengeance i7400 (i7/RTX 4070/32GB/1TB)", type: "gaming", category: "gaming-pc", brand: "Corsair", model: "Vengeance i7400",
  sku: "CORS-VENG-I7400-I7-RTX4070-32-1TB", price: 219990, orig: 244990, stock: 4, rgb: true,
  specs: ["Intel Core i7-14700KF (20-core)", "NVIDIA GeForce RTX 4070 12GB GDDR6X", "32GB DDR5 RAM", "1TB NVMe SSD", "Liquid CPU Cooling"],
  operatingSystem: "Windows 11 Home", weight: "12 kg", dimensions: "49.5 x 23 x 47 cm",
  processor: "Intel Core i7-14700KF (20-core, up to 5.6GHz)", gpu: "NVIDIA GeForce RTX 4070 12GB GDDR6X", ram: "32GB DDR5", storage: "1TB NVMe SSD",
  powerRequirement: "750W 80+ Gold PSU", ports: "6x USB-A, 2x USB-C, DisplayPort x3, HDMI x2, RJ45 LAN",
  description: "The Corsair Vengeance i7400 is a factory-built gaming PC combining a high-core-count Intel i7 with an RTX 4070 GPU inside a premium, professionally cable-managed chassis.",
  technicalDetails: "Intel Core i7-14700KF 20-core processor, NVIDIA GeForce RTX 4070 12GB GDDR6X, 32GB DDR5 RAM, 1TB NVMe SSD, Corsair liquid CPU cooler, tempered glass RGB chassis.",
  useCase: "Built for high-refresh-rate 1440p gaming, streaming, and demanding multitasking.",
  performanceNotes: "RTX 4070 and 20-core i7 combination delivers smooth 1440p gaming at high settings with strong streaming headroom.",
  qualityNotes: "Factory-assembled and stress-tested by Corsair with 1-year manufacturer warranty.",
  features: ["Liquid CPU cooling", "Tempered glass RGB chassis", "iCUE RGB lighting control", "Pre-cable-managed build"],
  boxContents: ["Desktop unit", "Power cable", "Documentation"],
  compatibility: ["Windows 11", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add secondary storage", "Upgrade RAM up to 64GB"],
  recommendedAccessories: ["Gaming Monitor", "Mechanical Keyboard", "Gaming Mouse"],
  seo: { slug: "corsair-vengeance-i7400", keywords: ["corsair vengeance i7400", "prebuilt gaming pc", "rtx 4070 pc"], metaTitle: "Corsair Vengeance i7400 (i7/RTX 4070/32GB/1TB) | DESKTO", metaDescription: "Buy Corsair Vengeance i7400 prebuilt gaming PC with Intel Core i7, RTX 4070, 32GB RAM, 1TB SSD at DESKTO.", tags: ["corsair vengeance i7400", "prebuilt gaming pc", "rtx 4070 pc"] },
});

const ASUS_ROG_G22CH_PRODUCT = draftCatalogProduct({
  id: 37, name: "ASUS ROG Strix G22CH (i7/RTX 4060/16GB/512GB)", type: "gaming", category: "gaming-pc", brand: "ASUS", model: "ROG Strix G22CH",
  sku: "ASUS-ROG-G22CH-I7-RTX4060-16-512", price: 144990, orig: 159990, stock: 5, rgb: true,
  specs: ["Intel Core i7-13700F (16-core)", "NVIDIA GeForce RTX 4060 8GB GDDR6", "16GB DDR5 RAM", "512GB NVMe SSD", "ROG-tuned cooling"],
  operatingSystem: "Windows 11 Home", weight: "10.5 kg", dimensions: "42.8 x 19 x 42.6 cm",
  processor: "Intel Core i7-13700F (16-core, up to 5.2GHz)", gpu: "NVIDIA GeForce RTX 4060 8GB GDDR6", ram: "16GB DDR5", storage: "512GB NVMe SSD",
  powerRequirement: "650W 80+ Bronze PSU", ports: "6x USB-A, 2x USB-C, DisplayPort, HDMI x2, RJ45 LAN",
  description: "The ASUS ROG Strix G22CH is a compact factory-built gaming desktop pairing an RTX 4060 GPU with a 16-core i7 for smooth mainstream gaming performance.",
  technicalDetails: "Intel Core i7-13700F 16-core processor, NVIDIA GeForce RTX 4060 8GB GDDR6, 16GB DDR5 RAM, 512GB NVMe SSD, ROG-tuned airflow chassis.",
  useCase: "Suited for 1080p/1440p gaming, esports, and everyday high-performance computing.",
  performanceNotes: "RTX 4060 and 16-core i7 deliver smooth high-frame-rate gaming at 1080p and solid 1440p performance.",
  qualityNotes: "Factory-assembled and stress-tested by ASUS with 1-year manufacturer warranty.",
  features: ["ROG-tuned cooling", "Tempered glass side panel", "Aura Sync RGB lighting", "Compact ATX chassis"],
  boxContents: ["Desktop unit", "Power cable", "Documentation"],
  compatibility: ["Windows 11", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add secondary storage", "Upgrade RAM up to 32GB"],
  recommendedAccessories: ["Gaming Monitor", "Mechanical Keyboard", "Gaming Mouse"],
  seo: { slug: "asus-rog-strix-g22ch", keywords: ["asus rog g22ch", "prebuilt gaming pc", "rtx 4060 pc"], metaTitle: "ASUS ROG Strix G22CH (i7/RTX 4060/16GB/512GB) | DESKTO", metaDescription: "Buy ASUS ROG Strix G22CH prebuilt gaming PC with Intel Core i7, RTX 4060, 16GB RAM, 512GB SSD at DESKTO.", tags: ["asus rog g22ch", "prebuilt gaming pc", "rtx 4060 pc"] },
});

const MSI_INFINITE_RS_PRODUCT = draftCatalogProduct({
  id: 38, name: "MSI Infinite RS 13th Gen (i9/RTX 4080/32GB/1TB)", type: "gaming", category: "gaming-pc", brand: "MSI", model: "Infinite RS 13NUC7",
  sku: "MSI-INFRS-13-I9-RTX4080-32-1TB", price: 294990, orig: 324990, stock: 3, rgb: true,
  specs: ["Intel Core i9-13900KF (24-core)", "NVIDIA GeForce RTX 4080 16GB GDDR6X", "32GB DDR5 RAM", "1TB NVMe SSD", "Liquid CPU Cooling"],
  operatingSystem: "Windows 11 Home", weight: "13.5 kg", dimensions: "50.7 x 23.3 x 47.6 cm",
  processor: "Intel Core i9-13900KF (24-core, up to 5.8GHz)", gpu: "NVIDIA GeForce RTX 4080 16GB GDDR6X", ram: "32GB DDR5", storage: "1TB NVMe SSD",
  powerRequirement: "850W 80+ Gold PSU", ports: "8x USB-A, 2x USB-C, DisplayPort x3, HDMI x2, RJ45 LAN",
  description: "The MSI Infinite RS is a flagship factory-built gaming desktop pairing a 24-core Intel i9 with an RTX 4080 GPU for high-end 4K gaming and content creation.",
  technicalDetails: "Intel Core i9-13900KF 24-core processor, NVIDIA GeForce RTX 4080 16GB GDDR6X, 32GB DDR5 RAM, 1TB NVMe SSD, MSI liquid CPU cooler, tempered glass RGB chassis.",
  useCase: "Built for 4K gaming, streaming, video editing, and other GPU-intensive creative workloads.",
  performanceNotes: "i9-13900KF and RTX 4080 combination handles 4K gaming at high settings and demanding creative workloads with ease.",
  qualityNotes: "Factory-assembled and stress-tested by MSI with 1-year manufacturer warranty.",
  features: ["Liquid CPU cooling", "Tempered glass RGB chassis", "MSI Mystic Light RGB control", "Pre-cable-managed build"],
  boxContents: ["Desktop unit", "Power cable", "Documentation"],
  compatibility: ["Windows 11", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add secondary storage", "Upgrade RAM up to 64GB"],
  recommendedAccessories: ["4K Gaming Monitor", "Mechanical Keyboard", "Gaming Mouse"],
  seo: { slug: "msi-infinite-rs-13", keywords: ["msi infinite rs", "prebuilt gaming pc", "rtx 4080 pc"], metaTitle: "MSI Infinite RS 13th Gen (i9/RTX 4080/32GB/1TB) | DESKTO", metaDescription: "Buy MSI Infinite RS prebuilt gaming PC with Intel Core i9, RTX 4080, 32GB RAM, 1TB SSD at DESKTO.", tags: ["msi infinite rs", "prebuilt gaming pc", "rtx 4080 pc"] },
});

const ALIENWARE_AURORA_R16_PRODUCT = draftCatalogProduct({
  id: 39, name: "Alienware Aurora R16 (i7/RTX 4070 Ti/32GB/1TB)", type: "gaming", category: "gaming-pc", brand: "Alienware", model: "Aurora R16",
  sku: "DELL-AUR-R16-I7-RTX4070TI-32-1TB", price: 264990, orig: 289990, stock: 3, rgb: true,
  specs: ["Intel Core i7-14700F (20-core)", "NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X", "32GB DDR5 RAM", "1TB NVMe SSD", "Alienware Cryo-tech Cooling"],
  operatingSystem: "Windows 11 Home", weight: "11.8 kg", dimensions: "46.7 x 19.7 x 41.6 cm",
  processor: "Intel Core i7-14700F (20-core, up to 5.4GHz)", gpu: "NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X", ram: "32GB DDR5", storage: "1TB NVMe SSD",
  powerRequirement: "850W 80+ Gold PSU", ports: "6x USB-A, 2x USB-C, DisplayPort x3, HDMI x2, RJ45 LAN",
  description: "The Alienware Aurora R16 is a premium factory-built gaming desktop with a distinctive Legend chassis, pairing a 20-core i7 with an RTX 4070 Ti for high-end gaming performance.",
  technicalDetails: "Intel Core i7-14700F 20-core processor, NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X, 32GB DDR5 RAM, 1TB NVMe SSD, Alienware Cryo-tech thermal design.",
  useCase: "Built for high-refresh-rate 1440p/4K gaming, streaming, and demanding multitasking.",
  performanceNotes: "RTX 4070 Ti and 20-core i7 combination delivers smooth high-settings gaming at 1440p and beyond.",
  qualityNotes: "Factory-assembled and stress-tested by Dell Alienware with 1-year manufacturer warranty.",
  features: ["Alienware Cryo-tech cooling", "Legend 2.0 chassis design", "AlienFX RGB lighting", "Tool-less upgradeable interior"],
  boxContents: ["Desktop unit", "Power cable", "Documentation"],
  compatibility: ["Windows 11", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add secondary storage", "Upgrade RAM up to 64GB"],
  recommendedAccessories: ["Gaming Monitor", "Mechanical Keyboard", "Gaming Mouse"],
  seo: { slug: "alienware-aurora-r16", keywords: ["alienware aurora r16", "prebuilt gaming pc", "rtx 4070 ti pc"], metaTitle: "Alienware Aurora R16 (i7/RTX 4070 Ti/32GB/1TB) | DESKTO", metaDescription: "Buy Alienware Aurora R16 prebuilt gaming PC with Intel Core i7, RTX 4070 Ti, 32GB RAM, 1TB SSD at DESKTO.", tags: ["alienware aurora r16", "prebuilt gaming pc", "rtx 4070 ti pc"] },
});

const NZXT_PLAYER_ONE_PRODUCT = draftCatalogProduct({
  id: 40, name: "NZXT Player One (i5/RTX 4060 Ti/16GB/1TB)", type: "gaming", category: "gaming-pc", brand: "NZXT", model: "Player One RTX 4060 Ti Edition",
  sku: "NZXT-PLAYER1-I5-RTX4060TI-16-1TB", price: 164990, orig: 179990, stock: 4, rgb: true,
  specs: ["Intel Core i5-13400F (10-core)", "NVIDIA GeForce RTX 4060 Ti 8GB GDDR6", "16GB DDR5 RAM", "1TB NVMe SSD", "NZXT Kraken AIO Cooling"],
  operatingSystem: "Windows 11 Home", weight: "10.2 kg", dimensions: "43.5 x 21 x 43.7 cm",
  processor: "Intel Core i5-13400F (10-core, up to 4.6GHz)", gpu: "NVIDIA GeForce RTX 4060 Ti 8GB GDDR6", ram: "16GB DDR5", storage: "1TB NVMe SSD",
  powerRequirement: "650W 80+ Gold PSU", ports: "6x USB-A, 2x USB-C, DisplayPort x3, HDMI x2, RJ45 LAN",
  description: "The NZXT Player One is a clean, minimalist factory-built gaming PC pairing an RTX 4060 Ti with a 10-core i5, assembled in NZXT's signature tidy chassis.",
  technicalDetails: "Intel Core i5-13400F 10-core processor, NVIDIA GeForce RTX 4060 Ti 8GB GDDR6, 16GB DDR5 RAM, 1TB NVMe SSD, NZXT Kraken AIO liquid cooler.",
  useCase: "Suited for 1080p/1440p gaming, streaming, and everyday high-performance computing.",
  performanceNotes: "RTX 4060 Ti and 10-core i5 deliver smooth high-frame-rate gaming at 1080p and solid 1440p performance.",
  qualityNotes: "Factory-assembled and stress-tested by NZXT with 1-year manufacturer warranty.",
  features: ["NZXT Kraken AIO cooling", "Clean cable-managed interior", "CAM software monitoring", "Tempered glass side panel"],
  boxContents: ["Desktop unit", "Power cable", "Documentation"],
  compatibility: ["Windows 11", "Standard peripherals", "PCIe expansion cards"], upgradeOptions: ["Add secondary storage", "Upgrade RAM up to 32GB"],
  recommendedAccessories: ["Gaming Monitor", "Mechanical Keyboard", "Gaming Mouse"],
  seo: { slug: "nzxt-player-one", keywords: ["nzxt player one", "prebuilt gaming pc", "rtx 4060 ti pc"], metaTitle: "NZXT Player One (i5/RTX 4060 Ti/16GB/1TB) | DESKTO", metaDescription: "Buy NZXT Player One prebuilt gaming PC with Intel Core i5, RTX 4060 Ti, 16GB RAM, 1TB SSD at DESKTO.", tags: ["nzxt player one", "prebuilt gaming pc", "rtx 4060 ti pc"] },
});

// ── Monitors ──
const LG_ULTRAGEAR_24GN650_PRODUCT = draftCatalogProduct({
  id: 41, name: "LG UltraGear 24GN650-B (23.8\" FHD 144Hz)", category: "monitor", brand: "LG", model: "24GN650-B",
  sku: "LG-24GN650-24-IPS-144", price: 15990, orig: 18990, stock: 12,
  specs: ["23.8-inch FHD IPS (1920x1080)", "144Hz refresh rate", "1ms response time", "AMD FreeSync Premium", "HDR10"],
  weight: "3.4 kg", dimensions: "54 x 20.9 x 47.9 cm", display: "23.8-inch FHD IPS (1920x1080), 144Hz, 1ms", refreshRate: "144Hz",
  powerRequirement: "External Power Adapter (~30W)", ports: "DisplayPort x1, HDMI x2, 3.5mm headphone jack",
  description: "The LG UltraGear 24GN650-B is a fast 144Hz IPS gaming monitor offering crisp FHD visuals and smooth motion clarity for competitive gaming.",
  technicalDetails: "23.8-inch FHD IPS panel, 144Hz refresh rate, 1ms (GtG) response time, AMD FreeSync Premium, HDR10 support, tilt-adjustable stand.",
  useCase: "Ideal for esports and fast-paced gaming where high refresh rate and low input lag matter most.",
  performanceNotes: "144Hz IPS panel with 1ms response delivers smooth, tear-free motion with AMD FreeSync Premium support.",
  qualityNotes: "Genuine LG product with 1-year manufacturer warranty and factory color calibration.",
  features: ["144Hz IPS panel", "AMD FreeSync Premium", "Black Stabilizer", "Tilt-adjustable stand"],
  boxContents: ["Monitor", "Power adapter", "HDMI cable", "Stand & base", "Documentation"],
  compatibility: ["PC", "PlayStation", "Xbox", "HDMI/DisplayPort sources"], upgradeOptions: ["Wall mount kit (VESA 100x100)"],
  recommendedAccessories: ["Monitor Arm", "HDMI Cable", "DisplayPort Cable"],
  seo: { slug: "lg-ultragear-24gn650-b", keywords: ["lg ultragear 24gn650", "gaming monitor", "144hz monitor"], metaTitle: "LG UltraGear 24GN650-B (23.8\" FHD 144Hz) | DESKTO", metaDescription: "Buy LG UltraGear 24GN650-B 144Hz IPS gaming monitor at DESKTO with warranty.", tags: ["lg ultragear 24gn650", "gaming monitor", "144hz monitor"] },
});

const SAMSUNG_ODYSSEY_G5_PRODUCT = draftCatalogProduct({
  id: 42, name: "Samsung Odyssey G5 (27\" QHD 165Hz Curved)", category: "monitor", brand: "Samsung", model: "Odyssey G5 LS27CG512",
  sku: "SAM-ODYG5-27-VA-165", price: 22990, orig: 26990, stock: 10,
  specs: ["27-inch QHD VA (2560x1440)", "165Hz refresh rate", "1ms response time", "1000R curved", "AMD FreeSync Premium"],
  weight: "4.4 kg", dimensions: "61.3 x 20.4 x 46.7 cm", display: "27-inch QHD VA (2560x1440), 165Hz, 1ms, 1000R curved", refreshRate: "165Hz",
  powerRequirement: "External Power Adapter (~40W)", ports: "DisplayPort x1, HDMI x2, 3.5mm headphone jack",
  description: "The Samsung Odyssey G5 is a 1000R curved QHD gaming monitor with 165Hz refresh rate, delivering an immersive, wraparound gaming experience.",
  technicalDetails: "27-inch QHD VA panel, 165Hz refresh rate, 1ms (MPRT) response time, 1000R curvature, AMD FreeSync Premium, HDR10 support.",
  useCase: "Great for immersive single-player and competitive gaming where curved QHD visuals add depth.",
  performanceNotes: "165Hz QHD VA panel delivers sharp detail with deep contrast and smooth, tear-free motion.",
  qualityNotes: "Genuine Samsung product with 1-year manufacturer warranty.",
  features: ["1000R curved VA panel", "AMD FreeSync Premium", "HDR10", "Eye Saver Mode"],
  boxContents: ["Monitor", "Power adapter", "HDMI cable", "Stand & base", "Documentation"],
  compatibility: ["PC", "PlayStation", "Xbox", "HDMI/DisplayPort sources"], upgradeOptions: ["Wall mount kit (VESA 100x100)"],
  recommendedAccessories: ["Monitor Arm", "HDMI Cable", "DisplayPort Cable"],
  seo: { slug: "samsung-odyssey-g5-27", keywords: ["samsung odyssey g5", "curved gaming monitor", "165hz monitor"], metaTitle: "Samsung Odyssey G5 (27\" QHD 165Hz Curved) | DESKTO", metaDescription: "Buy Samsung Odyssey G5 165Hz curved QHD gaming monitor at DESKTO with warranty.", tags: ["samsung odyssey g5", "curved gaming monitor", "165hz monitor"] },
});

const ASUS_TUF_VG249Q1A_PRODUCT = draftCatalogProduct({
  id: 43, name: "ASUS TUF Gaming VG249Q1A (23.8\" FHD 165Hz)", category: "monitor", brand: "ASUS", model: "TUF Gaming VG249Q1A",
  sku: "ASUS-TUF-VG249Q1A-24-IPS-165", price: 14490, orig: 16990, stock: 14,
  specs: ["23.8-inch FHD IPS (1920x1080)", "165Hz refresh rate", "1ms response time", "AMD FreeSync Premium", "Extreme Low Motion Blur"],
  weight: "3.4 kg", dimensions: "53.9 x 20.4 x 47.2 cm", display: "23.8-inch FHD IPS (1920x1080), 165Hz, 1ms", refreshRate: "165Hz",
  powerRequirement: "External Power Adapter (~30W)", ports: "DisplayPort x1, HDMI x2, 3.5mm headphone jack",
  description: "The ASUS TUF Gaming VG249Q1A is a value-focused 165Hz IPS monitor built for smooth, responsive gaming with reliable TUF-grade durability.",
  technicalDetails: "23.8-inch FHD IPS panel, 165Hz refresh rate, 1ms (MPRT) response time, AMD FreeSync Premium, Extreme Low Motion Blur, Shadow Boost.",
  useCase: "Ideal for budget-conscious gamers wanting a fast, responsive display for esports and everyday gaming.",
  performanceNotes: "165Hz IPS panel with 1ms response delivers smooth, tear-free motion with excellent color for the price.",
  qualityNotes: "Genuine ASUS product with 1-year manufacturer warranty and TUF-grade durability testing.",
  features: ["165Hz IPS panel", "AMD FreeSync Premium", "Shadow Boost", "Flicker-free, Low Blue Light"],
  boxContents: ["Monitor", "Power adapter", "HDMI cable", "Stand & base", "Documentation"],
  compatibility: ["PC", "PlayStation", "Xbox", "HDMI/DisplayPort sources"], upgradeOptions: ["Wall mount kit (VESA 100x100)"],
  recommendedAccessories: ["Monitor Arm", "HDMI Cable", "DisplayPort Cable"],
  seo: { slug: "asus-tuf-gaming-vg249q1a", keywords: ["asus tuf vg249q1a", "gaming monitor", "165hz monitor"], metaTitle: "ASUS TUF Gaming VG249Q1A (23.8\" FHD 165Hz) | DESKTO", metaDescription: "Buy ASUS TUF Gaming VG249Q1A 165Hz IPS gaming monitor at DESKTO with warranty.", tags: ["asus tuf vg249q1a", "gaming monitor", "165hz monitor"] },
});

const MSI_G274QPF_PRODUCT = draftCatalogProduct({
  id: 44, name: "MSI G274QPF (27\" QHD 180Hz Rapid IPS)", category: "monitor", brand: "MSI", model: "G274QPF",
  sku: "MSI-G274QPF-27-IPS-180", price: 24990, orig: 28990, stock: 8,
  specs: ["27-inch QHD Rapid IPS (2560x1440)", "180Hz refresh rate", "1ms response time", "AMD FreeSync Premium", "HDR Ready"],
  weight: "4.6 kg", dimensions: "61.4 x 20.5 x 47.6 cm", display: "27-inch QHD Rapid IPS (2560x1440), 180Hz, 1ms", refreshRate: "180Hz",
  powerRequirement: "External Power Adapter (~45W)", ports: "DisplayPort x1, HDMI x2, 3.5mm headphone jack",
  description: "The MSI G274QPF is a high-refresh QHD Rapid IPS monitor built for competitive gaming with sharp detail and exceptionally smooth motion.",
  technicalDetails: "27-inch QHD Rapid IPS panel, 180Hz refresh rate, 1ms (GtG) response time, AMD FreeSync Premium, HDR Ready, MSI Night Vision.",
  useCase: "Suited for competitive gaming and content creation where QHD sharpness and high refresh rate both matter.",
  performanceNotes: "180Hz Rapid IPS panel delivers exceptionally smooth, sharp motion clarity at QHD resolution.",
  qualityNotes: "Genuine MSI product with 1-year manufacturer warranty and factory color calibration.",
  features: ["180Hz Rapid IPS panel", "AMD FreeSync Premium", "MSI Night Vision", "Anti-flicker technology"],
  boxContents: ["Monitor", "Power adapter", "HDMI cable", "Stand & base", "Documentation"],
  compatibility: ["PC", "PlayStation", "Xbox", "HDMI/DisplayPort sources"], upgradeOptions: ["Wall mount kit (VESA 100x100)"],
  recommendedAccessories: ["Monitor Arm", "HDMI Cable", "DisplayPort Cable"],
  seo: { slug: "msi-g274qpf", keywords: ["msi g274qpf", "gaming monitor", "180hz monitor"], metaTitle: "MSI G274QPF (27\" QHD 180Hz Rapid IPS) | DESKTO", metaDescription: "Buy MSI G274QPF 180Hz QHD Rapid IPS gaming monitor at DESKTO with warranty.", tags: ["msi g274qpf", "gaming monitor", "180hz monitor"] },
});

const ACER_NITRO_VG240Y_PRODUCT = draftCatalogProduct({
  id: 45, name: "Acer Nitro VG240Y (23.8\" FHD 100Hz)", category: "monitor", brand: "Acer", model: "Nitro VG240Y",
  sku: "ACER-NITRO-VG240Y-24-IPS-100", price: 9990, orig: 11990, stock: 16,
  specs: ["23.8-inch FHD IPS (1920x1080)", "100Hz refresh rate", "1ms response time", "AMD FreeSync", "Zero Frame Design"],
  weight: "3.2 kg", dimensions: "53.9 x 20.1 x 46.4 cm", display: "23.8-inch FHD IPS (1920x1080), 100Hz, 1ms", refreshRate: "100Hz",
  powerRequirement: "External Power Adapter (~25W)", ports: "DisplayPort x1, HDMI x1, 3.5mm headphone jack",
  description: "The Acer Nitro VG240Y is an affordable entry-level gaming monitor offering a smooth 100Hz refresh rate and slim zero-frame design.",
  technicalDetails: "23.8-inch FHD IPS panel, 100Hz refresh rate, 1ms (VRB) response time, AMD FreeSync, zero-frame design, flicker-less technology.",
  useCase: "A great budget upgrade from 60Hz displays for casual and competitive gaming alike.",
  performanceNotes: "100Hz IPS panel offers a noticeable smoothness upgrade over standard 60Hz monitors at an accessible price.",
  qualityNotes: "Genuine Acer product with 1-year manufacturer warranty.",
  features: ["100Hz IPS panel", "AMD FreeSync", "Zero Frame design", "Flicker-less technology"],
  boxContents: ["Monitor", "Power adapter", "HDMI cable", "Stand & base", "Documentation"],
  compatibility: ["PC", "PlayStation", "Xbox", "HDMI/DisplayPort sources"], upgradeOptions: ["Wall mount kit (VESA 100x100)"],
  recommendedAccessories: ["Monitor Arm", "HDMI Cable"],
  seo: { slug: "acer-nitro-vg240y", keywords: ["acer nitro vg240y", "budget gaming monitor", "100hz monitor"], metaTitle: "Acer Nitro VG240Y (23.8\" FHD 100Hz) | DESKTO", metaDescription: "Buy Acer Nitro VG240Y 100Hz IPS gaming monitor at DESKTO with warranty.", tags: ["acer nitro vg240y", "budget gaming monitor", "100hz monitor"] },
});

// ── CPUs ──
const INTEL_I3_12100F_PRODUCT = draftCatalogProduct({
  id: 46, name: "Intel Core i3-12100F", category: "cpu", brand: "Intel", model: "Core i3-12100F",
  sku: "INTEL-I3-12100F", price: 8490, orig: 9990, stock: 20,
  specs: ["4 Cores / 8 Threads", "Up to 4.3GHz Boost Clock", "LGA1700 Socket", "No Integrated Graphics", "60W TDP"],
  processor: "Intel Core i3-12100F (4-core/8-thread, up to 4.3GHz)", gpu: "None — requires discrete GPU", powerRequirement: "60W TDP",
  description: "The Intel Core i3-12100F is a budget-friendly quad-core processor offering strong single-core performance for entry-level gaming and everyday computing builds.",
  technicalDetails: "4 cores, 8 threads, up to 4.3GHz boost clock, 12MB Intel Smart Cache, LGA1700 socket, 60W TDP, no integrated graphics (requires discrete GPU).",
  useCase: "Ideal for budget gaming PCs and everyday computing builds paired with an entry-level discrete GPU.",
  performanceNotes: "Strong single-core performance for its price segment, well-suited for 1080p gaming when paired with a mid-range GPU.",
  qualityNotes: "Genuine Intel boxed processor with 1-year manufacturer warranty.",
  features: ["Unlocked Smart Cache 12MB", "PCIe 5.0 & 4.0 support", "DDR5/DDR4 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["LGA1700 motherboards", "DDR4/DDR5 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with aftermarket cooler"],
  recommendedAccessories: ["LGA1700 Motherboard", "CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "intel-core-i3-12100f", keywords: ["intel i3 12100f", "budget cpu", "gaming cpu"], metaTitle: "Intel Core i3-12100F | DESKTO", metaDescription: "Buy Intel Core i3-12100F budget quad-core processor at DESKTO with warranty.", tags: ["intel i3 12100f", "budget cpu", "gaming cpu"] },
});

const INTEL_I5_12400F_PRODUCT = draftCatalogProduct({
  id: 47, name: "Intel Core i5-12400F", category: "cpu", brand: "Intel", model: "Core i5-12400F",
  sku: "INTEL-I5-12400F", price: 13490, orig: 15990, stock: 18,
  specs: ["6 Cores / 12 Threads", "Up to 4.4GHz Boost Clock", "LGA1700 Socket", "No Integrated Graphics", "65W TDP"],
  processor: "Intel Core i5-12400F (6-core/12-thread, up to 4.4GHz)", gpu: "None — requires discrete GPU", powerRequirement: "65W TDP",
  description: "The Intel Core i5-12400F is a popular mid-range six-core processor offering excellent price-to-performance for mainstream gaming builds.",
  technicalDetails: "6 cores, 12 threads, up to 4.4GHz boost clock, 18MB Intel Smart Cache, LGA1700 socket, 65W TDP, no integrated graphics (requires discrete GPU).",
  useCase: "One of the best value CPUs for 1080p/1440p gaming builds and general productivity.",
  performanceNotes: "Excellent gaming performance per rupee, pairs well with mid-to-high-end discrete GPUs without bottlenecking.",
  qualityNotes: "Genuine Intel boxed processor with 1-year manufacturer warranty.",
  features: ["18MB Smart Cache", "PCIe 5.0 & 4.0 support", "DDR5/DDR4 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["LGA1700 motherboards", "DDR4/DDR5 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with aftermarket cooler"],
  recommendedAccessories: ["LGA1700 Motherboard", "CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "intel-core-i5-12400f", keywords: ["intel i5 12400f", "gaming cpu", "mid-range cpu"], metaTitle: "Intel Core i5-12400F | DESKTO", metaDescription: "Buy Intel Core i5-12400F mid-range six-core processor at DESKTO with warranty.", tags: ["intel i5 12400f", "gaming cpu", "mid-range cpu"] },
});

const INTEL_I5_14400F_PRODUCT = draftCatalogProduct({
  id: 48, name: "Intel Core i5-14400F", category: "cpu", brand: "Intel", model: "Core i5-14400F",
  sku: "INTEL-I5-14400F", price: 16990, orig: 19990, stock: 15,
  specs: ["10 Cores (6P+4E) / 16 Threads", "Up to 4.7GHz Boost Clock", "LGA1700 Socket", "No Integrated Graphics", "65W TDP"],
  processor: "Intel Core i5-14400F (10-core: 6P+4E / 16-thread, up to 4.7GHz)", gpu: "None — requires discrete GPU", powerRequirement: "65W TDP",
  description: "The Intel Core i5-14400F brings a hybrid 10-core design to the mainstream segment, offering strong gaming and multitasking performance.",
  technicalDetails: "6 Performance-cores + 4 Efficient-cores (10 cores/16 threads), up to 4.7GHz boost clock, 20MB Intel Smart Cache, LGA1700 socket, 65W TDP, no integrated graphics.",
  useCase: "Well suited for high-refresh 1080p/1440p gaming builds and content creation on a budget.",
  performanceNotes: "Hybrid core design delivers strong gaming frame rates plus solid multi-threaded performance for productivity tasks.",
  qualityNotes: "Genuine Intel boxed processor with 1-year manufacturer warranty.",
  features: ["20MB Smart Cache", "Hybrid P-core/E-core architecture", "PCIe 5.0 & 4.0 support", "DDR5/DDR4 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["LGA1700 motherboards", "DDR4/DDR5 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with aftermarket cooler"],
  recommendedAccessories: ["LGA1700 Motherboard", "CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "intel-core-i5-14400f", keywords: ["intel i5 14400f", "gaming cpu", "14th gen intel"], metaTitle: "Intel Core i5-14400F | DESKTO", metaDescription: "Buy Intel Core i5-14400F 10-core processor at DESKTO with warranty.", tags: ["intel i5 14400f", "gaming cpu", "14th gen intel"] },
});

const INTEL_I7_14700K_PRODUCT = draftCatalogProduct({
  id: 49, name: "Intel Core i7-14700K", category: "cpu", brand: "Intel", model: "Core i7-14700K",
  sku: "INTEL-I7-14700K", price: 34990, orig: 39990, stock: 10,
  specs: ["20 Cores (8P+12E) / 28 Threads", "Up to 5.6GHz Boost Clock", "LGA1700 Socket", "Intel UHD Graphics 770", "125W TDP"],
  processor: "Intel Core i7-14700K (20-core: 8P+12E / 28-thread, up to 5.6GHz)", gpu: "Intel UHD Graphics 770 (integrated)", powerRequirement: "125W TDP (253W max turbo)",
  description: "The Intel Core i7-14700K is a high-performance unlocked processor with 20 cores, ideal for enthusiast gaming rigs and demanding creative workloads.",
  technicalDetails: "8 Performance-cores + 12 Efficient-cores (20 cores/28 threads), up to 5.6GHz boost clock, 33MB Intel Smart Cache, LGA1700 socket, unlocked for overclocking, Intel UHD Graphics 770.",
  useCase: "Built for enthusiast gaming builds, streaming, and heavy multitasking or content creation workloads.",
  performanceNotes: "20-core hybrid design delivers excellent gaming frame rates alongside strong multi-threaded rendering and encoding performance.",
  qualityNotes: "Genuine Intel boxed processor with 1-year manufacturer warranty.",
  features: ["Unlocked for overclocking", "33MB Smart Cache", "Integrated UHD Graphics 770", "PCIe 5.0 & 4.0 support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["LGA1700 motherboards (Z690/Z790 for overclocking)", "DDR4/DDR5 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with high-end AIO cooler"],
  recommendedAccessories: ["Z790 Motherboard", "AIO Liquid Cooler", "DDR5 RAM Kit"],
  seo: { slug: "intel-core-i7-14700k", keywords: ["intel i7 14700k", "high-end cpu", "14th gen intel"], metaTitle: "Intel Core i7-14700K | DESKTO", metaDescription: "Buy Intel Core i7-14700K 20-core unlocked processor at DESKTO with warranty.", tags: ["intel i7 14700k", "high-end cpu", "14th gen intel"] },
});

const AMD_RYZEN5_5600_PRODUCT = draftCatalogProduct({
  id: 50, name: "AMD Ryzen 5 5600", category: "cpu", brand: "AMD", model: "Ryzen 5 5600",
  sku: "AMD-R5-5600", price: 10990, orig: 12990, stock: 20,
  specs: ["6 Cores / 12 Threads", "Up to 4.4GHz Boost Clock", "AM4 Socket", "No Integrated Graphics", "65W TDP"],
  processor: "AMD Ryzen 5 5600 (6-core/12-thread, up to 4.4GHz)", gpu: "None — requires discrete GPU", powerRequirement: "65W TDP",
  description: "The AMD Ryzen 5 5600 is a proven, cost-effective six-core AM4 processor ideal for budget-to-mid-range gaming builds and easy platform upgrades.",
  technicalDetails: "6 cores, 12 threads, up to 4.4GHz boost clock, 32MB L3 cache, AM4 socket, 65W TDP, no integrated graphics (requires discrete GPU).",
  useCase: "Great for budget and mid-range gaming builds, and a popular upgrade path for existing AM4 motherboards.",
  performanceNotes: "Strong gaming performance per rupee, especially attractive for AM4 platform upgrades with existing motherboards.",
  qualityNotes: "Genuine AMD boxed processor with 1-year manufacturer warranty, includes stock Wraith Stealth cooler.",
  features: ["Includes Wraith Stealth cooler", "32MB L3 Cache", "PCIe 4.0 support", "AM4 platform longevity"],
  boxContents: ["Processor", "Wraith Stealth Cooler", "Documentation"],
  compatibility: ["AM4 motherboards", "DDR4 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with aftermarket cooler"],
  recommendedAccessories: ["AM4 Motherboard", "DDR4 RAM Kit"],
  seo: { slug: "amd-ryzen-5-5600", keywords: ["amd ryzen 5 5600", "am4 cpu", "budget gaming cpu"], metaTitle: "AMD Ryzen 5 5600 | DESKTO", metaDescription: "Buy AMD Ryzen 5 5600 six-core AM4 processor at DESKTO with warranty.", tags: ["amd ryzen 5 5600", "am4 cpu", "budget gaming cpu"] },
});

const AMD_RYZEN5_7600_PRODUCT = draftCatalogProduct({
  id: 51, name: "AMD Ryzen 5 7600", category: "cpu", brand: "AMD", model: "Ryzen 5 7600",
  sku: "AMD-R5-7600", price: 17990, orig: 20990, stock: 14,
  specs: ["6 Cores / 12 Threads", "Up to 5.1GHz Boost Clock", "AM5 Socket", "AMD Radeon Graphics", "65W TDP"],
  processor: "AMD Ryzen 5 7600 (6-core/12-thread, up to 5.1GHz)", gpu: "AMD Radeon Graphics (integrated)", powerRequirement: "65W TDP",
  description: "The AMD Ryzen 5 7600 brings Zen 4 architecture to the mainstream segment, offering high clock speeds and DDR5/PCIe 5.0 support on the modern AM5 platform.",
  technicalDetails: "6 cores, 12 threads, up to 5.1GHz boost clock, 32MB L3 cache, AM5 socket, integrated AMD Radeon Graphics, 65W TDP.",
  useCase: "Ideal for gamers building on the future-proof AM5 platform who want strong single-core performance.",
  performanceNotes: "Zen 4 architecture delivers excellent gaming frame rates and snappy single-core responsiveness.",
  qualityNotes: "Genuine AMD boxed processor with 1-year manufacturer warranty.",
  features: ["Integrated Radeon Graphics", "32MB L3 Cache", "PCIe 5.0 & 4.0 support", "DDR5 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["AM5 motherboards", "DDR5 RAM"], upgradeOptions: ["Pair with discrete GPU", "Pair with aftermarket cooler"],
  recommendedAccessories: ["AM5 Motherboard", "DDR5 RAM Kit", "CPU Cooler"],
  seo: { slug: "amd-ryzen-5-7600", keywords: ["amd ryzen 5 7600", "am5 cpu", "zen 4 cpu"], metaTitle: "AMD Ryzen 5 7600 | DESKTO", metaDescription: "Buy AMD Ryzen 5 7600 six-core AM5 processor at DESKTO with warranty.", tags: ["amd ryzen 5 7600", "am5 cpu", "zen 4 cpu"] },
});

const AMD_RYZEN7_7800X3D_PRODUCT = draftCatalogProduct({
  id: 52, name: "AMD Ryzen 7 7800X3D", category: "cpu", brand: "AMD", model: "Ryzen 7 7800X3D",
  sku: "AMD-R7-7800X3D", price: 36990, orig: 41990, stock: 8,
  specs: ["8 Cores / 16 Threads", "Up to 5.0GHz Boost Clock", "AM5 Socket", "96MB 3D V-Cache", "120W TDP"],
  processor: "AMD Ryzen 7 7800X3D (8-core/16-thread, up to 5.0GHz, 3D V-Cache)", gpu: "AMD Radeon Graphics (integrated)", powerRequirement: "120W TDP",
  description: "The AMD Ryzen 7 7800X3D is widely regarded as one of the best gaming CPUs available, using 3D V-Cache technology to deliver exceptional in-game frame rates.",
  technicalDetails: "8 cores, 16 threads, up to 5.0GHz boost clock, 96MB 3D V-Cache (L2+L3), AM5 socket, integrated AMD Radeon Graphics, 120W TDP.",
  useCase: "The go-to choice for enthusiast gaming builds prioritizing maximum in-game frame rates over pure multi-core workloads.",
  performanceNotes: "3D V-Cache technology delivers class-leading gaming performance, often outperforming higher-core-count CPUs in games.",
  qualityNotes: "Genuine AMD boxed processor with 1-year manufacturer warranty.",
  features: ["96MB 3D V-Cache", "Integrated Radeon Graphics", "PCIe 5.0 & 4.0 support", "DDR5 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["AM5 motherboards", "DDR5 RAM"], upgradeOptions: ["Pair with high-end discrete GPU", "Pair with high-end AIO cooler"],
  recommendedAccessories: ["AM5 Motherboard", "DDR5 RAM Kit", "AIO Liquid Cooler"],
  seo: { slug: "amd-ryzen-7-7800x3d", keywords: ["amd ryzen 7 7800x3d", "best gaming cpu", "3d v-cache"], metaTitle: "AMD Ryzen 7 7800X3D | DESKTO", metaDescription: "Buy AMD Ryzen 7 7800X3D 3D V-Cache gaming processor at DESKTO with warranty.", tags: ["amd ryzen 7 7800x3d", "best gaming cpu", "3d v-cache"] },
});

const AMD_RYZEN9_9950X_PRODUCT = draftCatalogProduct({
  id: 53, name: "AMD Ryzen 9 9950X", category: "cpu", brand: "AMD", model: "Ryzen 9 9950X",
  sku: "AMD-R9-9950X", price: 58990, orig: 64990, stock: 5,
  specs: ["16 Cores / 32 Threads", "Up to 5.7GHz Boost Clock", "AM5 Socket", "Zen 5 Architecture", "170W TDP"],
  processor: "AMD Ryzen 9 9950X (16-core/32-thread, up to 5.7GHz, Zen 5)", gpu: "AMD Radeon Graphics (integrated)", powerRequirement: "170W TDP",
  description: "The AMD Ryzen 9 9950X is a flagship Zen 5 processor delivering exceptional multi-core performance for the most demanding gaming, creative, and workstation workloads.",
  technicalDetails: "16 cores, 32 threads, up to 5.7GHz boost clock, 80MB L3+L2 cache, AM5 socket, Zen 5 architecture, integrated AMD Radeon Graphics, 170W TDP.",
  useCase: "Built for content creators, streamers, and power users who need top-tier multi-core performance alongside strong gaming capability.",
  performanceNotes: "16-core Zen 5 design delivers flagship-tier rendering, encoding, and compilation performance while remaining highly capable for gaming.",
  qualityNotes: "Genuine AMD boxed processor with 1-year manufacturer warranty.",
  features: ["Zen 5 architecture", "80MB total cache", "Integrated Radeon Graphics", "PCIe 5.0 support", "DDR5 memory support"],
  boxContents: ["Processor", "Documentation"],
  compatibility: ["AM5 motherboards (X670/X870 recommended)", "DDR5 RAM"], upgradeOptions: ["Pair with flagship discrete GPU", "Pair with high-end AIO cooler"],
  recommendedAccessories: ["X870 Motherboard", "DDR5 RAM Kit", "High-end AIO Cooler"],
  seo: { slug: "amd-ryzen-9-9950x", keywords: ["amd ryzen 9 9950x", "flagship cpu", "zen 5 cpu"], metaTitle: "AMD Ryzen 9 9950X | DESKTO", metaDescription: "Buy AMD Ryzen 9 9950X flagship 16-core Zen 5 processor at DESKTO with warranty.", tags: ["amd ryzen 9 9950x", "flagship cpu", "zen 5 cpu"] },
});

// Legacy demo catalog products removed at admin request — kept as an id set so any
// existing browser session (localStorage) also has them stripped out on next load.
const REMOVED_SEED_PRODUCT_IDS = new Set<number>([1, 2, 3, 7, 8, 11, 12, 15, 19, 20, 21]);

// ── GPUs ──
const RTX_3050_PRODUCT = draftCatalogProduct({
  id: 54, name: "NVIDIA GeForce RTX 3050 8GB", category: "gpu", brand: "NVIDIA", model: "GeForce RTX 3050 8GB",
  sku: "NV-RTX3050-8G", price: 19990, orig: 22990, stock: 15,
  specs: ["2560 CUDA Cores", "8GB GDDR6, 128-bit bus", "Boost Clock 1777 MHz", "130W TDP", "PCIe 4.0"],
  gpu: "NVIDIA GeForce RTX 3050 (2560 CUDA cores, boost 1777 MHz)", ram: "8GB GDDR6 (128-bit)", powerRequirement: "130W TDP, 550W PSU recommended",
  ports: "3x DisplayPort 1.4a, 1x HDMI 2.1",
  description: "The NVIDIA GeForce RTX 3050 8GB is an entry-level ray-tracing capable GPU offering solid 1080p gaming performance for budget builds.",
  technicalDetails: "2560 CUDA cores, 8GB GDDR6 memory on a 128-bit bus, 1777 MHz boost clock, 130W TDP, PCIe 4.0 interface, 2nd-gen ray tracing cores.",
  useCase: "Ideal for budget 1080p gaming builds and as an entry point into ray tracing and DLSS.",
  performanceNotes: "Handles most modern titles at 1080p medium-high settings with DLSS support for extra performance.",
  qualityNotes: "Genuine NVIDIA-based card with 1-year manufacturer warranty.",
  features: ["Ray tracing cores", "DLSS support", "PCIe 4.0", "Low power draw"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "550W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["550W PSU", "PCIe Riser Cable"],
  seo: { slug: "nvidia-geforce-rtx-3050-8gb", keywords: ["rtx 3050", "budget gpu", "1080p gaming gpu"], metaTitle: "NVIDIA GeForce RTX 3050 8GB | DESKTO", metaDescription: "Buy NVIDIA GeForce RTX 3050 8GB budget gaming GPU at DESKTO with warranty.", tags: ["rtx 3050", "budget gpu", "1080p gaming gpu"] },
});

const RTX_4060_PRODUCT = draftCatalogProduct({
  id: 55, name: "NVIDIA GeForce RTX 4060 8GB", category: "gpu", brand: "NVIDIA", model: "GeForce RTX 4060 8GB",
  sku: "NV-RTX4060-8G", price: 28990, orig: 32990, stock: 14,
  specs: ["3072 CUDA Cores", "8GB GDDR6, 128-bit bus", "Boost Clock 2460 MHz", "115W TDP", "PCIe 4.0"],
  gpu: "NVIDIA GeForce RTX 4060 (3072 CUDA cores, boost 2460 MHz)", ram: "8GB GDDR6 (128-bit)", powerRequirement: "115W TDP, 550W PSU recommended",
  ports: "3x DisplayPort 1.4a, 1x HDMI 2.1",
  description: "The NVIDIA GeForce RTX 4060 delivers efficient Ada Lovelace performance for smooth 1080p/1440p gaming with DLSS 3 frame generation.",
  technicalDetails: "3072 CUDA cores, 8GB GDDR6 memory on a 128-bit bus, 2460 MHz boost clock, 115W TDP, PCIe 4.0 interface, 3rd-gen ray tracing cores, DLSS 3.",
  useCase: "Great for 1080p high-refresh and 1440p gaming with excellent power efficiency.",
  performanceNotes: "DLSS 3 Frame Generation significantly boosts frame rates in supported titles at 1080p/1440p.",
  qualityNotes: "Genuine NVIDIA-based card with 1-year manufacturer warranty.",
  features: ["DLSS 3 Frame Generation", "3rd-gen RT cores", "AV1 encoding", "Low power draw"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "550W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["550W PSU", "PCIe Riser Cable"],
  seo: { slug: "nvidia-geforce-rtx-4060-8gb", keywords: ["rtx 4060", "1080p gaming gpu", "dlss 3 gpu"], metaTitle: "NVIDIA GeForce RTX 4060 8GB | DESKTO", metaDescription: "Buy NVIDIA GeForce RTX 4060 8GB gaming GPU at DESKTO with warranty.", tags: ["rtx 4060", "1080p gaming gpu", "dlss 3 gpu"] },
});

const RTX_4060TI_PRODUCT = draftCatalogProduct({
  id: 56, name: "NVIDIA GeForce RTX 4060 Ti 8GB", category: "gpu", brand: "NVIDIA", model: "GeForce RTX 4060 Ti 8GB",
  sku: "NV-RTX4060TI-8G", price: 38990, orig: 43990, stock: 10,
  specs: ["4352 CUDA Cores", "8GB GDDR6, 128-bit bus", "Boost Clock 2535 MHz", "160W TDP", "PCIe 4.0"],
  gpu: "NVIDIA GeForce RTX 4060 Ti (4352 CUDA cores, boost 2535 MHz)", ram: "8GB GDDR6 (128-bit)", powerRequirement: "160W TDP, 600W PSU recommended",
  ports: "3x DisplayPort 1.4a, 1x HDMI 2.1",
  description: "The NVIDIA GeForce RTX 4060 Ti steps up performance for smooth 1440p gaming with strong ray tracing and DLSS 3 capability.",
  technicalDetails: "4352 CUDA cores, 8GB GDDR6 memory on a 128-bit bus, 2535 MHz boost clock, 160W TDP, PCIe 4.0 interface, DLSS 3 Frame Generation.",
  useCase: "Suited for 1440p gaming at high settings and 1080p high-refresh esports.",
  performanceNotes: "Strong 1440p performance with DLSS 3 Frame Generation delivering large frame rate boosts in supported titles.",
  qualityNotes: "Genuine NVIDIA-based card with 1-year manufacturer warranty.",
  features: ["DLSS 3 Frame Generation", "3rd-gen RT cores", "AV1 encoding", "Efficient Ada Lovelace architecture"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "600W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["650W PSU", "PCIe Riser Cable"],
  seo: { slug: "nvidia-geforce-rtx-4060-ti-8gb", keywords: ["rtx 4060 ti", "1440p gaming gpu", "dlss 3 gpu"], metaTitle: "NVIDIA GeForce RTX 4060 Ti 8GB | DESKTO", metaDescription: "Buy NVIDIA GeForce RTX 4060 Ti 8GB gaming GPU at DESKTO with warranty.", tags: ["rtx 4060 ti", "1440p gaming gpu", "dlss 3 gpu"] },
});

const RTX_4070SUPER_PRODUCT = draftCatalogProduct({
  id: 57, name: "NVIDIA GeForce RTX 4070 Super 12GB", category: "gpu", brand: "NVIDIA", model: "GeForce RTX 4070 Super 12GB",
  sku: "NV-RTX4070S-12G", price: 59990, orig: 66990, stock: 8,
  specs: ["7168 CUDA Cores", "12GB GDDR6X, 192-bit bus", "Boost Clock 2475 MHz", "220W TDP", "PCIe 4.0"],
  gpu: "NVIDIA GeForce RTX 4070 Super (7168 CUDA cores, boost 2475 MHz)", ram: "12GB GDDR6X (192-bit)", powerRequirement: "220W TDP, 750W PSU recommended",
  ports: "3x DisplayPort 1.4a, 1x HDMI 2.1",
  description: "The NVIDIA GeForce RTX 4070 Super delivers excellent 1440p and entry-4K gaming performance with strong ray tracing headroom.",
  technicalDetails: "7168 CUDA cores, 12GB GDDR6X memory on a 192-bit bus, 2475 MHz boost clock, 220W TDP, PCIe 4.0 interface, DLSS 3 Frame Generation.",
  useCase: "Built for high-settings 1440p gaming and capable 4K gaming with DLSS upscaling.",
  performanceNotes: "Handles demanding AAA titles at 1440p ultra settings and 4K with DLSS enabled.",
  qualityNotes: "Genuine NVIDIA-based card with 1-year manufacturer warranty.",
  features: ["DLSS 3 Frame Generation", "3rd-gen RT cores", "12GB GDDR6X memory", "AV1 encoding"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "750W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["750W PSU", "PCIe Riser Cable"],
  seo: { slug: "nvidia-geforce-rtx-4070-super-12gb", keywords: ["rtx 4070 super", "1440p gaming gpu", "4k gaming gpu"], metaTitle: "NVIDIA GeForce RTX 4070 Super 12GB | DESKTO", metaDescription: "Buy NVIDIA GeForce RTX 4070 Super 12GB gaming GPU at DESKTO with warranty.", tags: ["rtx 4070 super", "1440p gaming gpu", "4k gaming gpu"] },
});

const RTX_5070_PRODUCT = draftCatalogProduct({
  id: 58, name: "NVIDIA GeForce RTX 5070 12GB", category: "gpu", brand: "NVIDIA", model: "GeForce RTX 5070 12GB",
  sku: "NV-RTX5070-12G", price: 64990, orig: 71990, stock: 6,
  specs: ["6144 CUDA Cores (Blackwell)", "12GB GDDR7, 192-bit bus", "Boost Clock 2510 MHz", "250W TDP", "PCIe 5.0"],
  gpu: "NVIDIA GeForce RTX 5070 (6144 CUDA cores, Blackwell, boost 2510 MHz)", ram: "12GB GDDR7 (192-bit)", powerRequirement: "250W TDP, 750W PSU recommended",
  ports: "3x DisplayPort 2.1, 1x HDMI 2.1b",
  description: "The NVIDIA GeForce RTX 5070 brings next-generation Blackwell architecture and GDDR7 memory for exceptional 1440p/4K gaming with DLSS 4.",
  technicalDetails: "6144 CUDA cores, 12GB GDDR7 memory on a 192-bit bus, 2510 MHz boost clock, 250W TDP, PCIe 5.0 interface, DLSS 4 with Multi Frame Generation.",
  useCase: "Built for enthusiast 1440p and 4K gaming with the latest DLSS 4 upscaling and frame generation.",
  performanceNotes: "GDDR7 memory and DLSS 4 Multi Frame Generation deliver class-leading frame rates at 1440p and 4K.",
  qualityNotes: "Genuine NVIDIA-based card with 1-year manufacturer warranty.",
  features: ["DLSS 4 Multi Frame Generation", "4th-gen RT cores", "12GB GDDR7 memory", "PCIe 5.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 5.0/4.0 motherboards", "750W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["850W PSU", "PCIe Riser Cable"],
  seo: { slug: "nvidia-geforce-rtx-5070-12gb", keywords: ["rtx 5070", "blackwell gpu", "4k gaming gpu"], metaTitle: "NVIDIA GeForce RTX 5070 12GB | DESKTO", metaDescription: "Buy NVIDIA GeForce RTX 5070 12GB Blackwell gaming GPU at DESKTO with warranty.", tags: ["rtx 5070", "blackwell gpu", "4k gaming gpu"] },
});

const RX_6600_PRODUCT = draftCatalogProduct({
  id: 59, name: "AMD Radeon RX 6600 8GB", category: "gpu", brand: "AMD", model: "Radeon RX 6600 8GB",
  sku: "AMD-RX6600-8G", price: 19490, orig: 22490, stock: 12,
  specs: ["1792 Stream Processors", "8GB GDDR6, 128-bit bus", "Boost Clock 2491 MHz", "132W TDP", "PCIe 4.0"],
  gpu: "AMD Radeon RX 6600 (1792 stream processors, boost 2491 MHz)", ram: "8GB GDDR6 (128-bit)", powerRequirement: "132W TDP, 500W PSU recommended",
  ports: "1x DisplayPort 1.4, 1x HDMI 2.1",
  description: "The AMD Radeon RX 6600 is a power-efficient 1080p gaming GPU offering strong value in the budget segment.",
  technicalDetails: "1792 stream processors, 8GB GDDR6 memory on a 128-bit bus, 2491 MHz boost clock, 132W TDP, PCIe 4.0 interface, AMD FidelityFX Super Resolution support.",
  useCase: "Ideal for smooth 1080p gaming on a budget with low power consumption.",
  performanceNotes: "Efficient RDNA 2 architecture delivers strong 1080p frame rates at a competitive price point.",
  qualityNotes: "Genuine AMD-based card with 1-year manufacturer warranty.",
  features: ["AMD FidelityFX Super Resolution", "Low power draw", "PCIe 4.0", "RDNA 2 architecture"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "500W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["550W PSU", "PCIe Riser Cable"],
  seo: { slug: "amd-radeon-rx-6600-8gb", keywords: ["rx 6600", "budget gpu", "1080p gaming gpu"], metaTitle: "AMD Radeon RX 6600 8GB | DESKTO", metaDescription: "Buy AMD Radeon RX 6600 8GB budget gaming GPU at DESKTO with warranty.", tags: ["rx 6600", "budget gpu", "1080p gaming gpu"] },
});

const RX_7600_PRODUCT = draftCatalogProduct({
  id: 60, name: "AMD Radeon RX 7600 8GB", category: "gpu", brand: "AMD", model: "Radeon RX 7600 8GB",
  sku: "AMD-RX7600-8G", price: 27990, orig: 31990, stock: 11,
  specs: ["2048 Stream Processors", "8GB GDDR6, 128-bit bus", "Boost Clock 2655 MHz", "165W TDP", "PCIe 4.0"],
  gpu: "AMD Radeon RX 7600 (2048 stream processors, boost 2655 MHz)", ram: "8GB GDDR6 (128-bit)", powerRequirement: "165W TDP, 550W PSU recommended",
  ports: "1x DisplayPort 2.1, 1x HDMI 2.1",
  description: "The AMD Radeon RX 7600 brings RDNA 3 architecture to the mainstream segment for smooth 1080p gaming with modern encoding features.",
  technicalDetails: "2048 stream processors, 8GB GDDR6 memory on a 128-bit bus, 2655 MHz boost clock, 165W TDP, PCIe 4.0 interface, AV1 encoding support.",
  useCase: "Great for high-refresh 1080p gaming and content creators who need AV1 encoding.",
  performanceNotes: "RDNA 3 architecture delivers smooth 1080p performance with efficient power draw.",
  qualityNotes: "Genuine AMD-based card with 1-year manufacturer warranty.",
  features: ["AV1 encoding", "AMD FidelityFX Super Resolution 3", "RDNA 3 architecture", "PCIe 4.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "550W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["600W PSU", "PCIe Riser Cable"],
  seo: { slug: "amd-radeon-rx-7600-8gb", keywords: ["rx 7600", "1080p gaming gpu", "rdna 3 gpu"], metaTitle: "AMD Radeon RX 7600 8GB | DESKTO", metaDescription: "Buy AMD Radeon RX 7600 8GB gaming GPU at DESKTO with warranty.", tags: ["rx 7600", "1080p gaming gpu", "rdna 3 gpu"] },
});

const RX_7700XT_PRODUCT = draftCatalogProduct({
  id: 61, name: "AMD Radeon RX 7700 XT 12GB", category: "gpu", brand: "AMD", model: "Radeon RX 7700 XT 12GB",
  sku: "AMD-RX7700XT-12G", price: 42990, orig: 47990, stock: 8,
  specs: ["3456 Stream Processors", "12GB GDDR6, 192-bit bus", "Boost Clock 2544 MHz", "245W TDP", "PCIe 4.0"],
  gpu: "AMD Radeon RX 7700 XT (3456 stream processors, boost 2544 MHz)", ram: "12GB GDDR6 (192-bit)", powerRequirement: "245W TDP, 700W PSU recommended",
  ports: "1x DisplayPort 2.1, 1x HDMI 2.1",
  description: "The AMD Radeon RX 7700 XT offers strong 1440p gaming performance with generous 12GB VRAM for demanding modern titles.",
  technicalDetails: "3456 stream processors, 12GB GDDR6 memory on a 192-bit bus, 2544 MHz boost clock, 245W TDP, PCIe 4.0 interface, AV1 encoding support.",
  useCase: "Suited for high-settings 1440p gaming with plenty of VRAM headroom for future titles.",
  performanceNotes: "12GB VRAM and RDNA 3 architecture deliver excellent 1440p performance in VRAM-hungry titles.",
  qualityNotes: "Genuine AMD-based card with 1-year manufacturer warranty.",
  features: ["12GB GDDR6 memory", "AV1 encoding", "AMD FidelityFX Super Resolution 3", "RDNA 3 architecture"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "700W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["750W PSU", "PCIe Riser Cable"],
  seo: { slug: "amd-radeon-rx-7700-xt-12gb", keywords: ["rx 7700 xt", "1440p gaming gpu", "rdna 3 gpu"], metaTitle: "AMD Radeon RX 7700 XT 12GB | DESKTO", metaDescription: "Buy AMD Radeon RX 7700 XT 12GB gaming GPU at DESKTO with warranty.", tags: ["rx 7700 xt", "1440p gaming gpu", "rdna 3 gpu"] },
});

const RX_7800XT_PRODUCT = draftCatalogProduct({
  id: 62, name: "AMD Radeon RX 7800 XT 16GB", category: "gpu", brand: "AMD", model: "Radeon RX 7800 XT 16GB",
  sku: "AMD-RX7800XT-16G", price: 52990, orig: 58990, stock: 7,
  specs: ["3840 Stream Processors", "16GB GDDR6, 256-bit bus", "Boost Clock 2430 MHz", "263W TDP", "PCIe 4.0"],
  gpu: "AMD Radeon RX 7800 XT (3840 stream processors, boost 2430 MHz)", ram: "16GB GDDR6 (256-bit)", powerRequirement: "263W TDP, 750W PSU recommended",
  ports: "1x DisplayPort 2.1, 1x HDMI 2.1",
  description: "The AMD Radeon RX 7800 XT delivers excellent 1440p ultra and entry-4K gaming performance with a generous 16GB VRAM buffer.",
  technicalDetails: "3840 stream processors, 16GB GDDR6 memory on a 256-bit bus, 2430 MHz boost clock, 263W TDP, PCIe 4.0 interface, AV1 encoding support.",
  useCase: "Built for high-settings 1440p and capable 4K gaming with ample VRAM for future-proofing.",
  performanceNotes: "16GB VRAM and RDNA 3 architecture handle demanding AAA titles at 1440p ultra and 4K high settings.",
  qualityNotes: "Genuine AMD-based card with 1-year manufacturer warranty.",
  features: ["16GB GDDR6 memory", "AV1 encoding", "AMD FidelityFX Super Resolution 3", "RDNA 3 architecture"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "750W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["800W PSU", "PCIe Riser Cable"],
  seo: { slug: "amd-radeon-rx-7800-xt-16gb", keywords: ["rx 7800 xt", "4k gaming gpu", "rdna 3 gpu"], metaTitle: "AMD Radeon RX 7800 XT 16GB | DESKTO", metaDescription: "Buy AMD Radeon RX 7800 XT 16GB gaming GPU at DESKTO with warranty.", tags: ["rx 7800 xt", "4k gaming gpu", "rdna 3 gpu"] },
});

const RX_9070XT_PRODUCT = draftCatalogProduct({
  id: 63, name: "AMD Radeon RX 9070 XT 16GB", category: "gpu", brand: "AMD", model: "Radeon RX 9070 XT 16GB",
  sku: "AMD-RX9070XT-16G", price: 74990, orig: 82990, stock: 5,
  specs: ["4096 Stream Processors (RDNA 4)", "16GB GDDR6, 256-bit bus", "Boost Clock 2970 MHz", "304W TDP", "PCIe 5.0"],
  gpu: "AMD Radeon RX 9070 XT (4096 stream processors, RDNA 4, boost 2970 MHz)", ram: "16GB GDDR6 (256-bit)", powerRequirement: "304W TDP, 750W PSU recommended",
  ports: "1x DisplayPort 2.1a, 2x HDMI 2.1b",
  description: "The AMD Radeon RX 9070 XT is a flagship RDNA 4 GPU delivering exceptional 1440p and 4K gaming performance with dramatically improved ray tracing.",
  technicalDetails: "4096 stream processors, 16GB GDDR6 memory on a 256-bit bus, 2970 MHz boost clock, 304W TDP, PCIe 5.0 interface, RDNA 4 architecture with next-gen ray tracing.",
  useCase: "Built for enthusiast 1440p and 4K gaming with high ray tracing fidelity and future-proof VRAM.",
  performanceNotes: "RDNA 4 architecture delivers a major leap in ray tracing performance alongside excellent rasterized frame rates at 4K.",
  qualityNotes: "Genuine AMD-based card with 1-year manufacturer warranty.",
  features: ["RDNA 4 architecture", "Next-gen ray tracing", "16GB GDDR6 memory", "PCIe 5.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 5.0/4.0 motherboards", "750W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["850W PSU", "PCIe Riser Cable"],
  seo: { slug: "amd-radeon-rx-9070-xt-16gb", keywords: ["rx 9070 xt", "rdna 4 gpu", "4k gaming gpu"], metaTitle: "AMD Radeon RX 9070 XT 16GB | DESKTO", metaDescription: "Buy AMD Radeon RX 9070 XT 16GB RDNA 4 gaming GPU at DESKTO with warranty.", tags: ["rx 9070 xt", "rdna 4 gpu", "4k gaming gpu"] },
});

const ARC_A580_PRODUCT = draftCatalogProduct({
  id: 64, name: "Intel Arc A580 8GB", category: "gpu", brand: "Intel", model: "Arc A580 8GB",
  sku: "INTEL-ARCA580-8G", price: 17990, orig: 20990, stock: 10,
  specs: ["24 Xe-cores", "8GB GDDR6, 256-bit bus", "Boost Clock 1700 MHz", "175W TDP", "PCIe 4.0"],
  gpu: "Intel Arc A580 (24 Xe-cores, boost 1700 MHz)", ram: "8GB GDDR6 (256-bit)", powerRequirement: "175W TDP, 550W PSU recommended",
  ports: "3x DisplayPort 2.0, 1x HDMI 2.1",
  description: "The Intel Arc A580 is a value-focused GPU with a wide 256-bit memory bus, offering solid 1080p gaming performance with modern feature support.",
  technicalDetails: "24 Xe-cores, 8GB GDDR6 memory on a 256-bit bus, 1700 MHz boost clock, 175W TDP, PCIe 4.0 interface, Intel XeSS upscaling support.",
  useCase: "Good for budget 1080p gaming builds, especially in titles that benefit from Intel's wide memory bus.",
  performanceNotes: "Wide 256-bit memory bus gives the A580 an edge in memory-bandwidth-sensitive titles at its price point.",
  qualityNotes: "Genuine Intel-based card with 1-year manufacturer warranty.",
  features: ["Intel XeSS upscaling", "AV1 encoding", "256-bit memory bus", "PCIe 4.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "550W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["600W PSU", "PCIe Riser Cable"],
  seo: { slug: "intel-arc-a580-8gb", keywords: ["intel arc a580", "budget gpu", "1080p gaming gpu"], metaTitle: "Intel Arc A580 8GB | DESKTO", metaDescription: "Buy Intel Arc A580 8GB budget gaming GPU at DESKTO with warranty.", tags: ["intel arc a580", "budget gpu", "1080p gaming gpu"] },
});

const ARC_A750_PRODUCT = draftCatalogProduct({
  id: 65, name: "Intel Arc A750 8GB", category: "gpu", brand: "Intel", model: "Arc A750 8GB",
  sku: "INTEL-ARCA750-8G", price: 21990, orig: 24990, stock: 9,
  specs: ["28 Xe-cores", "8GB GDDR6, 256-bit bus", "Boost Clock 2050 MHz", "225W TDP", "PCIe 4.0"],
  gpu: "Intel Arc A750 (28 Xe-cores, boost 2050 MHz)", ram: "8GB GDDR6 (256-bit)", powerRequirement: "225W TDP, 600W PSU recommended",
  ports: "3x DisplayPort 2.0, 1x HDMI 2.1",
  description: "The Intel Arc A750 offers competitive 1080p/1440p gaming performance with a wide memory bus and strong AV1 encoding for streamers.",
  technicalDetails: "28 Xe-cores, 8GB GDDR6 memory on a 256-bit bus, 2050 MHz boost clock, 225W TDP, PCIe 4.0 interface, Intel XeSS upscaling support.",
  useCase: "Suited for 1080p high-refresh and 1440p gaming, and popular with streamers for its AV1 encoder.",
  performanceNotes: "Strong rasterized performance at 1080p/1440p, with driver improvements steadily closing the gap with competitors.",
  qualityNotes: "Genuine Intel-based card with 1-year manufacturer warranty.",
  features: ["Intel XeSS upscaling", "AV1 encoding", "256-bit memory bus", "PCIe 4.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "600W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["650W PSU", "PCIe Riser Cable"],
  seo: { slug: "intel-arc-a750-8gb", keywords: ["intel arc a750", "1080p gaming gpu", "streaming gpu"], metaTitle: "Intel Arc A750 8GB | DESKTO", metaDescription: "Buy Intel Arc A750 8GB gaming GPU at DESKTO with warranty.", tags: ["intel arc a750", "1080p gaming gpu", "streaming gpu"] },
});

const ARC_B580_PRODUCT = draftCatalogProduct({
  id: 66, name: "Intel Arc B580 12GB", category: "gpu", brand: "Intel", model: "Arc B580 12GB",
  sku: "INTEL-ARCB580-12G", price: 28990, orig: 32990, stock: 10,
  specs: ["20 Xe2-cores (Battlemage)", "12GB GDDR6, 192-bit bus", "Boost Clock 2670 MHz", "190W TDP", "PCIe 4.0"],
  gpu: "Intel Arc B580 (20 Xe2-cores, Battlemage, boost 2670 MHz)", ram: "12GB GDDR6 (192-bit)", powerRequirement: "190W TDP, 600W PSU recommended",
  ports: "3x DisplayPort 2.1, 1x HDMI 2.1",
  description: "The Intel Arc B580 is a second-generation Battlemage GPU offering excellent price-to-performance with 12GB VRAM for 1440p gaming.",
  technicalDetails: "20 Xe2-cores, 12GB GDDR6 memory on a 192-bit bus, 2670 MHz boost clock, 190W TDP, PCIe 4.0 interface, Intel XeSS 2 upscaling support.",
  useCase: "Strong value pick for 1080p/1440p gaming with generous VRAM for modern titles.",
  performanceNotes: "Battlemage architecture brings major performance-per-dollar improvements over the previous Arc generation.",
  qualityNotes: "Genuine Intel-based card with 1-year manufacturer warranty.",
  features: ["Intel XeSS 2 upscaling", "AV1 encoding", "12GB GDDR6 memory", "PCIe 4.0"],
  boxContents: ["Graphics card", "Documentation"], compatibility: ["PCIe 4.0/3.0 motherboards", "600W+ PSU"],
  upgradeOptions: ["Pair with higher wattage PSU for overclocking headroom"], recommendedAccessories: ["650W PSU", "PCIe Riser Cable"],
  seo: { slug: "intel-arc-b580-12gb", keywords: ["intel arc b580", "1440p gaming gpu", "battlemage gpu"], metaTitle: "Intel Arc B580 12GB | DESKTO", metaDescription: "Buy Intel Arc B580 12GB Battlemage gaming GPU at DESKTO with warranty.", tags: ["intel arc b580", "1440p gaming gpu", "battlemage gpu"] },
});

// ── RAM ──
const CORSAIR_VENGEANCE_LPX_16_PRODUCT = draftCatalogProduct({
  id: 67, name: "Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz", category: "ram", brand: "Corsair", model: "Vengeance LPX 16GB DDR4-3200",
  sku: "CORS-VLPX-16-DDR4-3200", price: 3990, orig: 4690, stock: 25,
  specs: ["16GB (2x8GB) Kit", "DDR4 3200MHz", "CL16 Latency", "Low-profile heatspreader", "1.35V"],
  ram: "16GB (2x8GB) DDR4-3200 CL16, low-profile aluminum heatspreader",
  description: "Corsair Vengeance LPX 16GB DDR4 3200MHz is a proven, low-profile memory kit offering reliable performance for mainstream gaming and productivity builds.",
  technicalDetails: "16GB (2x8GB) dual-channel kit, DDR4 3200MHz, CL16-18-18-36 timings, 1.35V, low-profile design for CPU cooler clearance, XMP 2.0 support.",
  useCase: "A dependable everyday RAM upgrade for gaming and productivity DDR4 builds.",
  performanceNotes: "3200MHz CL16 timings offer a strong balance of speed and latency for AM4/older Intel platforms.",
  qualityNotes: "Genuine Corsair product with lifetime manufacturer warranty and hand-tested memory chips.",
  features: ["Low-profile heatspreader", "XMP 2.0 support", "Lifetime warranty", "Wide motherboard compatibility"],
  boxContents: ["2x 8GB RAM modules", "Documentation"], compatibility: ["DDR4 motherboards (AM4/LGA1200/LGA1700 with DDR4)"],
  upgradeOptions: ["Pair with a second kit for 32GB total (verify motherboard QVL)"], recommendedAccessories: ["Compatible DDR4 Motherboard"],
  seo: { slug: "corsair-vengeance-lpx-16gb-ddr4-3200", keywords: ["corsair vengeance lpx", "ddr4 ram", "16gb ram kit"], metaTitle: "Corsair Vengeance LPX 16GB DDR4 3200MHz | DESKTO", metaDescription: "Buy Corsair Vengeance LPX 16GB DDR4 3200MHz RAM kit at DESKTO with warranty.", tags: ["corsair vengeance lpx", "ddr4 ram", "16gb ram kit"] },
  warrantyMonths: 120,
});

const KINGSTON_FURY_BEAST_16_PRODUCT = draftCatalogProduct({
  id: 68, name: "Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz", category: "ram", brand: "Kingston", model: "Fury Beast 16GB DDR4-3200",
  sku: "KING-FURYBEAST-16-DDR4-3200", price: 3790, orig: 4490, stock: 28,
  specs: ["16GB (2x8GB) Kit", "DDR4 3200MHz", "CL16 Latency", "Low-profile heatspreader", "1.35V"],
  ram: "16GB (2x8GB) DDR4-3200 CL16, low-profile heatspreader",
  description: "Kingston Fury Beast 16GB DDR4 3200MHz delivers plug-and-play performance and reliability for everyday gaming and productivity systems.",
  technicalDetails: "16GB (2x8GB) dual-channel kit, DDR4 3200MHz, CL16 timings, 1.35V, Intel XMP 2.0 support, low-profile heatspreader design.",
  useCase: "A solid, budget-friendly RAM upgrade for DDR4 gaming and everyday-use builds.",
  performanceNotes: "3200MHz CL16 provides reliable performance across a wide range of DDR4 motherboards.",
  qualityNotes: "Genuine Kingston product with lifetime manufacturer warranty.",
  features: ["Low-profile heatspreader", "XMP 2.0 support", "Lifetime warranty", "Plug-and-play compatibility"],
  boxContents: ["2x 8GB RAM modules", "Documentation"], compatibility: ["DDR4 motherboards (AM4/LGA1200/LGA1700 with DDR4)"],
  upgradeOptions: ["Pair with a second kit for 32GB total (verify motherboard QVL)"], recommendedAccessories: ["Compatible DDR4 Motherboard"],
  seo: { slug: "kingston-fury-beast-16gb-ddr4-3200", keywords: ["kingston fury beast", "ddr4 ram", "16gb ram kit"], metaTitle: "Kingston Fury Beast 16GB DDR4 3200MHz | DESKTO", metaDescription: "Buy Kingston Fury Beast 16GB DDR4 3200MHz RAM kit at DESKTO with warranty.", tags: ["kingston fury beast", "ddr4 ram", "16gb ram kit"] },
  warrantyMonths: 120,
});

const GSKILL_RIPJAWS_V_16_PRODUCT = draftCatalogProduct({
  id: 69, name: "G.Skill Ripjaws V 16GB (2x8GB) DDR4 3600MHz", category: "ram", brand: "G.Skill", model: "Ripjaws V 16GB DDR4-3600",
  sku: "GSKILL-RIPJAWSV-16-DDR4-3600", price: 4190, orig: 4890, stock: 22,
  specs: ["16GB (2x8GB) Kit", "DDR4 3600MHz", "CL16 Latency", "Aggressive heatspreader design", "1.35V"],
  ram: "16GB (2x8GB) DDR4-3600 CL16, performance heatspreader",
  description: "G.Skill Ripjaws V 16GB DDR4 3600MHz offers higher clock speeds for AM4 and Intel builds that benefit from faster memory bandwidth.",
  technicalDetails: "16GB (2x8GB) dual-channel kit, DDR4 3600MHz, CL16-19-19-39 timings, 1.35V, Intel XMP 2.0 support.",
  useCase: "Great for AMD Ryzen builds where higher memory clocks improve Infinity Fabric performance.",
  performanceNotes: "3600MHz sweet-spot speed is particularly beneficial for AMD Ryzen platforms.",
  qualityNotes: "Genuine G.Skill product with lifetime manufacturer warranty.",
  features: ["Performance heatspreader", "XMP 2.0 support", "Lifetime warranty", "Ryzen-optimized speed"],
  boxContents: ["2x 8GB RAM modules", "Documentation"], compatibility: ["DDR4 motherboards (AM4/LGA1200/LGA1700 with DDR4)"],
  upgradeOptions: ["Pair with a second kit for 32GB total (verify motherboard QVL)"], recommendedAccessories: ["Compatible DDR4 Motherboard"],
  seo: { slug: "gskill-ripjaws-v-16gb-ddr4-3600", keywords: ["gskill ripjaws v", "ddr4 ram", "16gb ram kit"], metaTitle: "G.Skill Ripjaws V 16GB DDR4 3600MHz | DESKTO", metaDescription: "Buy G.Skill Ripjaws V 16GB DDR4 3600MHz RAM kit at DESKTO with warranty.", tags: ["gskill ripjaws v", "ddr4 ram", "16gb ram kit"] },
  warrantyMonths: 120,
});

const CRUCIAL_PRO_DDR5_16_PRODUCT = draftCatalogProduct({
  id: 70, name: "Crucial Pro DDR5 16GB (2x8GB) 5600MHz", category: "ram", brand: "Crucial", model: "Pro DDR5 16GB-5600",
  sku: "CRUCIAL-PRO-16-DDR5-5600", price: 5490, orig: 6290, stock: 20,
  specs: ["16GB (2x8GB) Kit", "DDR5 5600MHz", "CL46 Latency", "Intel XMP 3.0 / AMD EXPO ready", "1.1V"],
  ram: "16GB (2x8GB) DDR5-5600 CL46, XMP 3.0 / EXPO ready",
  description: "Crucial Pro DDR5 16GB 5600MHz brings fast, reliable memory for modern AM5 and Intel LGA1700/1851 DDR5 platforms.",
  technicalDetails: "16GB (2x8GB) dual-channel kit, DDR5 5600MHz, CL46 timings, 1.1V, Intel XMP 3.0 and AMD EXPO profile support.",
  useCase: "Ideal for current-generation AM5 and Intel DDR5 builds needing reliable, plug-and-play high-speed memory.",
  performanceNotes: "5600MHz native JEDEC speed with XMP/EXPO profiles for easy one-click overclocking.",
  qualityNotes: "Genuine Crucial (Micron) product with limited lifetime manufacturer warranty.",
  features: ["XMP 3.0 & AMD EXPO support", "Low-profile design", "Lifetime warranty", "Micron memory chips"],
  boxContents: ["2x 8GB RAM modules", "Documentation"], compatibility: ["DDR5 motherboards (AM5/LGA1700/LGA1851)"],
  upgradeOptions: ["Pair with a second kit for 32GB total (verify motherboard QVL)"], recommendedAccessories: ["Compatible DDR5 Motherboard"],
  seo: { slug: "crucial-pro-ddr5-16gb-5600", keywords: ["crucial pro ddr5", "ddr5 ram", "16gb ram kit"], metaTitle: "Crucial Pro DDR5 16GB 5600MHz | DESKTO", metaDescription: "Buy Crucial Pro DDR5 16GB 5600MHz RAM kit at DESKTO with warranty.", tags: ["crucial pro ddr5", "ddr5 ram", "16gb ram kit"] },
  warrantyMonths: 120,
});

const TEAMGROUP_TFORCE_VULCAN_PRODUCT = draftCatalogProduct({
  id: 71, name: "TeamGroup T-Force Vulcan 16GB (2x8GB) DDR4 3200MHz", category: "ram", brand: "TeamGroup", model: "T-Force Vulcan 16GB DDR4-3200",
  sku: "TEAMGROUP-TFVULCAN-16-DDR4-3200", price: 3690, orig: 4390, stock: 24,
  specs: ["16GB (2x8GB) Kit", "DDR4 3200MHz", "CL16 Latency", "Gaming-styled heatspreader", "1.35V"],
  ram: "16GB (2x8GB) DDR4-3200 CL16, gaming heatspreader design",
  description: "TeamGroup T-Force Vulcan 16GB DDR4 3200MHz is an affordable, gaming-styled memory kit offering reliable performance for budget builds.",
  technicalDetails: "16GB (2x8GB) dual-channel kit, DDR4 3200MHz, CL16 timings, 1.35V, Intel XMP 2.0 support, brushed aluminum heatspreader.",
  useCase: "A cost-effective RAM choice for budget gaming and everyday-use DDR4 builds.",
  performanceNotes: "3200MHz CL16 provides dependable performance for mainstream gaming builds.",
  qualityNotes: "Genuine TeamGroup product with lifetime manufacturer warranty.",
  features: ["Gaming-styled heatspreader", "XMP 2.0 support", "Lifetime warranty", "Budget-friendly"],
  boxContents: ["2x 8GB RAM modules", "Documentation"], compatibility: ["DDR4 motherboards (AM4/LGA1200/LGA1700 with DDR4)"],
  upgradeOptions: ["Pair with a second kit for 32GB total (verify motherboard QVL)"], recommendedAccessories: ["Compatible DDR4 Motherboard"],
  seo: { slug: "teamgroup-tforce-vulcan-16gb-ddr4-3200", keywords: ["teamgroup t-force vulcan", "ddr4 ram", "16gb ram kit"], metaTitle: "TeamGroup T-Force Vulcan 16GB DDR4 3200MHz | DESKTO", metaDescription: "Buy TeamGroup T-Force Vulcan 16GB DDR4 3200MHz RAM kit at DESKTO with warranty.", tags: ["teamgroup t-force vulcan", "ddr4 ram", "16gb ram kit"] },
  warrantyMonths: 120,
});

// ── SSDs ──
const SAMSUNG_990PRO_PRODUCT = draftCatalogProduct({
  id: 72, name: "Samsung 990 Pro 1TB NVMe SSD", category: "nvme", brand: "Samsung", model: "990 Pro 1TB",
  sku: "SAM-990PRO-1TB", price: 9990, orig: 11990, stock: 20,
  specs: ["1TB NVMe PCIe 4.0", "Sequential Read 7450 MB/s", "Sequential Write 6900 MB/s", "M.2 2280 Form Factor", "Samsung V-NAND"],
  storage: "1TB NVMe PCIe 4.0 SSD, 7450/6900 MB/s read/write, M.2 2280",
  description: "The Samsung 990 Pro 1TB is a flagship PCIe 4.0 NVMe SSD delivering top-tier sequential and random performance for gaming and creative workloads.",
  technicalDetails: "1TB capacity, PCIe 4.0 x4 interface, M.2 2280 form factor, up to 7450 MB/s sequential read and 6900 MB/s sequential write, Samsung in-house controller and V-NAND.",
  useCase: "Ideal for gaming PCs, content creation rigs, and anyone wanting the fastest available PCIe 4.0 storage.",
  performanceNotes: "Class-leading PCIe 4.0 speeds with excellent sustained performance and thermal management.",
  qualityNotes: "Genuine Samsung product with 5-year manufacturer warranty.",
  features: ["Samsung V-NAND", "Nickel-coated controller for heat dissipation", "5-year warranty", "PCIe 4.0 x4"],
  boxContents: ["NVMe SSD", "Documentation"], compatibility: ["M.2 NVMe PCIe 4.0/3.0 slots"],
  upgradeOptions: ["Add heatsink for sustained high-load performance"], recommendedAccessories: ["M.2 Heatsink", "PCIe 4.0 Motherboard"],
  seo: { slug: "samsung-990-pro-1tb", keywords: ["samsung 990 pro", "nvme ssd", "pcie 4.0 ssd"], metaTitle: "Samsung 990 Pro 1TB NVMe SSD | DESKTO", metaDescription: "Buy Samsung 990 Pro 1TB PCIe 4.0 NVMe SSD at DESKTO with warranty.", tags: ["samsung 990 pro", "nvme ssd", "pcie 4.0 ssd"] },
  warrantyMonths: 60,
});

const WD_SN850X_PRODUCT = draftCatalogProduct({
  id: 73, name: "WD Black SN850X 1TB NVMe SSD", category: "nvme", brand: "Western Digital", model: "Black SN850X 1TB",
  sku: "WD-SN850X-1TB", price: 8990, orig: 10490, stock: 22,
  specs: ["1TB NVMe PCIe 4.0", "Sequential Read 7300 MB/s", "Sequential Write 6300 MB/s", "M.2 2280 Form Factor", "Gaming-optimized firmware"],
  storage: "1TB NVMe PCIe 4.0 SSD, 7300/6300 MB/s read/write, M.2 2280",
  description: "The WD Black SN850X 1TB is a gaming-focused PCIe 4.0 NVMe SSD with Game Mode 2.0 for consistent low-latency performance.",
  technicalDetails: "1TB capacity, PCIe 4.0 x4 interface, M.2 2280 form factor, up to 7300 MB/s sequential read and 6300 MB/s sequential write, WD in-house controller and 3D NAND.",
  useCase: "Great for gaming rigs wanting fast load times and consistent frame delivery from storage.",
  performanceNotes: "Game Mode 2.0 firmware optimization reduces latency spikes during active gameplay.",
  qualityNotes: "Genuine Western Digital product with 5-year manufacturer warranty.",
  features: ["Game Mode 2.0", "WD_BLACK Dashboard software", "5-year warranty", "PCIe 4.0 x4"],
  boxContents: ["NVMe SSD", "Documentation"], compatibility: ["M.2 NVMe PCIe 4.0/3.0 slots"],
  upgradeOptions: ["Add heatsink for sustained high-load performance"], recommendedAccessories: ["M.2 Heatsink", "PCIe 4.0 Motherboard"],
  seo: { slug: "wd-black-sn850x-1tb", keywords: ["wd sn850x", "nvme ssd", "gaming ssd"], metaTitle: "WD Black SN850X 1TB NVMe SSD | DESKTO", metaDescription: "Buy WD Black SN850X 1TB PCIe 4.0 gaming NVMe SSD at DESKTO with warranty.", tags: ["wd sn850x", "nvme ssd", "gaming ssd"] },
  warrantyMonths: 60,
});

const CRUCIAL_T500_PRODUCT = draftCatalogProduct({
  id: 74, name: "Crucial T500 1TB NVMe SSD", category: "nvme", brand: "Crucial", model: "T500 1TB",
  sku: "CRUCIAL-T500-1TB", price: 8490, orig: 9990, stock: 18,
  specs: ["1TB NVMe PCIe 4.0", "Sequential Read 7400 MB/s", "Sequential Write 7000 MB/s", "M.2 2280 Form Factor", "Crucial Micron NAND"],
  storage: "1TB NVMe PCIe 4.0 SSD, 7400/7000 MB/s read/write, M.2 2280",
  description: "The Crucial T500 1TB is a high-performance PCIe 4.0 NVMe SSD combining fast sequential speeds with efficient power consumption.",
  technicalDetails: "1TB capacity, PCIe 4.0 x4 interface, M.2 2280 form factor, up to 7400 MB/s sequential read and 7000 MB/s sequential write, Micron 3D NAND.",
  useCase: "Well suited for gaming, video editing, and general high-performance storage upgrades.",
  performanceNotes: "Near-flagship sequential speeds with strong sustained write performance thanks to SLC caching and DRAM cache.",
  qualityNotes: "Genuine Crucial (Micron) product with 5-year manufacturer warranty.",
  features: ["DRAM cache", "Crucial Storage Executive software", "5-year warranty", "PCIe 4.0 x4"],
  boxContents: ["NVMe SSD", "Documentation"], compatibility: ["M.2 NVMe PCIe 4.0/3.0 slots"],
  upgradeOptions: ["Add heatsink for sustained high-load performance"], recommendedAccessories: ["M.2 Heatsink", "PCIe 4.0 Motherboard"],
  seo: { slug: "crucial-t500-1tb", keywords: ["crucial t500", "nvme ssd", "pcie 4.0 ssd"], metaTitle: "Crucial T500 1TB NVMe SSD | DESKTO", metaDescription: "Buy Crucial T500 1TB PCIe 4.0 NVMe SSD at DESKTO with warranty.", tags: ["crucial t500", "nvme ssd", "pcie 4.0 ssd"] },
  warrantyMonths: 60,
});

const KINGSTON_KC3000_PRODUCT = draftCatalogProduct({
  id: 75, name: "Kingston KC3000 1TB NVMe SSD", category: "nvme", brand: "Kingston", model: "KC3000 1TB",
  sku: "KING-KC3000-1TB", price: 7990, orig: 9490, stock: 16,
  specs: ["1TB NVMe PCIe 4.0", "Sequential Read 7000 MB/s", "Sequential Write 6000 MB/s", "M.2 2280 Form Factor", "Low-profile graphene heat spreader"],
  storage: "1TB NVMe PCIe 4.0 SSD, 7000/6000 MB/s read/write, M.2 2280",
  description: "The Kingston KC3000 1TB is a high-endurance PCIe 4.0 NVMe SSD designed for demanding workstation and gaming workloads.",
  technicalDetails: "1TB capacity, PCIe 4.0 x4 interface, M.2 2280 form factor, up to 7000 MB/s sequential read and 6000 MB/s sequential write, low-profile graphene heat spreader.",
  useCase: "Suited for workstation builds, gaming, and users who value high endurance ratings.",
  performanceNotes: "Strong sustained performance with a low-profile design that fits under most M.2 heatsinks without modification.",
  qualityNotes: "Genuine Kingston product with 5-year manufacturer warranty and high TBW endurance rating.",
  features: ["Graphene heat spreader", "High endurance (TBW) rating", "5-year warranty", "PCIe 4.0 x4"],
  boxContents: ["NVMe SSD", "Documentation"], compatibility: ["M.2 NVMe PCIe 4.0/3.0 slots"],
  upgradeOptions: ["Add heatsink for sustained high-load performance"], recommendedAccessories: ["M.2 Heatsink", "PCIe 4.0 Motherboard"],
  seo: { slug: "kingston-kc3000-1tb", keywords: ["kingston kc3000", "nvme ssd", "workstation ssd"], metaTitle: "Kingston KC3000 1TB NVMe SSD | DESKTO", metaDescription: "Buy Kingston KC3000 1TB PCIe 4.0 NVMe SSD at DESKTO with warranty.", tags: ["kingston kc3000", "nvme ssd", "workstation ssd"] },
  warrantyMonths: 60,
});

const SEAGATE_FIRECUDA_530_PRODUCT = draftCatalogProduct({
  id: 76, name: "Seagate FireCuda 530 1TB NVMe SSD", category: "nvme", brand: "Seagate", model: "FireCuda 530 1TB",
  sku: "SEA-FIRECUDA530-1TB", price: 8790, orig: 10290, stock: 15,
  specs: ["1TB NVMe PCIe 4.0", "Sequential Read 7300 MB/s", "Sequential Write 6000 MB/s", "M.2 2280 Form Factor", "PS5-compatible"],
  storage: "1TB NVMe PCIe 4.0 SSD, 7300/6000 MB/s read/write, M.2 2280",
  description: "The Seagate FireCuda 530 1TB is a high-performance, high-endurance PCIe 4.0 NVMe SSD built for gaming rigs and PS5 storage expansion.",
  technicalDetails: "1TB capacity, PCIe 4.0 x4 interface, M.2 2280 form factor, up to 7300 MB/s sequential read and 6000 MB/s sequential write, rated for high TBW endurance.",
  useCase: "Ideal for gaming PCs and PlayStation 5 storage expansion needing sustained high-speed performance.",
  performanceNotes: "High endurance rating and consistent sustained speeds make it a reliable choice for heavy read/write workloads.",
  qualityNotes: "Genuine Seagate product with 5-year manufacturer warranty and Rescue Data Recovery Services eligibility.",
  features: ["PS5-compatible", "High endurance (TBW) rating", "5-year warranty", "PCIe 4.0 x4"],
  boxContents: ["NVMe SSD", "Documentation"], compatibility: ["M.2 NVMe PCIe 4.0/3.0 slots", "PlayStation 5 M.2 expansion slot"],
  upgradeOptions: ["Add heatsink for sustained high-load performance"], recommendedAccessories: ["M.2 Heatsink", "PCIe 4.0 Motherboard"],
  seo: { slug: "seagate-firecuda-530-1tb", keywords: ["seagate firecuda 530", "nvme ssd", "ps5 ssd"], metaTitle: "Seagate FireCuda 530 1TB NVMe SSD | DESKTO", metaDescription: "Buy Seagate FireCuda 530 1TB PCIe 4.0 NVMe SSD at DESKTO with warranty.", tags: ["seagate firecuda 530", "nvme ssd", "ps5 ssd"] },
  warrantyMonths: 60,
});

// ── Motherboards ──
const ASUS_TUF_B650PLUS_PRODUCT = draftCatalogProduct({
  id: 77, name: "ASUS TUF Gaming B650-Plus WiFi", category: "motherboard", brand: "ASUS", model: "TUF Gaming B650-Plus WiFi",
  sku: "ASUS-TUF-B650PLUS-WIFI", price: 16990, orig: 18990, stock: 10,
  specs: ["AM5 Socket, B650 Chipset", "DDR5 RAM, up to 128GB", "PCIe 4.0 x16", "WiFi 6 & Bluetooth 5.2", "ATX Form Factor"],
  processor: "Supports AMD Ryzen 7000/8000/9000 series (AM5 socket)", ram: "4x DDR5 DIMM slots, up to 128GB, up to 6400MHz (OC)",
  ports: "4x USB 3.2 Gen 2, HDMI 2.1, DisplayPort 1.4, RJ45 2.5G LAN, WiFi 6", powerRequirement: "24-pin ATX + 8-pin EPS12V",
  description: "The ASUS TUF Gaming B650-Plus WiFi is a durable, feature-rich AM5 motherboard built for reliable everyday gaming performance.",
  technicalDetails: "AM5 socket, B650 chipset, ATX form factor, 4x DDR5 slots up to 128GB, PCIe 4.0 x16 slot, 2.5G LAN, integrated WiFi 6 and Bluetooth 5.2, military-grade components.",
  useCase: "A dependable AM5 platform choice for mid-range to high-end Ryzen gaming builds.",
  performanceNotes: "Robust VRM design provides stable power delivery for Ryzen 7000/9000 series CPUs under sustained load.",
  qualityNotes: "Genuine ASUS product with 3-year manufacturer warranty and TUF-grade military-spec components.",
  features: ["TUF-grade durability", "Integrated WiFi 6", "2.5G LAN", "PCIe 4.0 support"],
  boxContents: ["Motherboard", "SATA cables", "WiFi antenna", "Documentation"], compatibility: ["AMD Ryzen 7000/8000/9000 series", "DDR5 RAM", "ATX cases"],
  upgradeOptions: ["Add NVMe SSD in M.2 slots", "Upgrade RAM up to 128GB"], recommendedAccessories: ["AM5 CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "asus-tuf-gaming-b650-plus-wifi", keywords: ["asus tuf b650-plus", "am5 motherboard", "b650 motherboard"], metaTitle: "ASUS TUF Gaming B650-Plus WiFi | DESKTO", metaDescription: "Buy ASUS TUF Gaming B650-Plus WiFi AM5 motherboard at DESKTO with warranty.", tags: ["asus tuf b650-plus", "am5 motherboard", "b650 motherboard"] },
  warrantyMonths: 36,
});

const MSI_MAG_B650_TOMAHAWK_PRODUCT = draftCatalogProduct({
  id: 78, name: "MSI MAG B650 Tomahawk WiFi", category: "motherboard", brand: "MSI", model: "MAG B650 Tomahawk WiFi",
  sku: "MSI-MAG-B650TOMAHAWK-WIFI", price: 17990, orig: 19990, stock: 9,
  specs: ["AM5 Socket, B650 Chipset", "DDR5 RAM, up to 128GB", "PCIe 4.0 x16", "WiFi 6E & Bluetooth 5.3", "ATX Form Factor"],
  processor: "Supports AMD Ryzen 7000/8000/9000 series (AM5 socket)", ram: "4x DDR5 DIMM slots, up to 128GB, up to 6600MHz (OC)",
  ports: "4x USB 3.2 Gen 2, HDMI 2.1, DisplayPort 1.4, RJ45 2.5G LAN, WiFi 6E", powerRequirement: "24-pin ATX + 8-pin EPS12V",
  description: "The MSI MAG B650 Tomahawk WiFi is a well-rounded AM5 motherboard offering strong power delivery and connectivity for enthusiast builds.",
  technicalDetails: "AM5 socket, B650 chipset, ATX form factor, 4x DDR5 slots up to 128GB, PCIe 4.0 x16 slot, 2.5G LAN, integrated WiFi 6E and Bluetooth 5.3, extended heatsinks.",
  useCase: "A strong choice for mid-to-high-end Ryzen gaming and content creation builds needing reliable power delivery.",
  performanceNotes: "Extended VRM heatsinks and robust power design support sustained overclocking on higher-end Ryzen CPUs.",
  qualityNotes: "Genuine MSI product with 3-year manufacturer warranty.",
  features: ["Extended VRM heatsinks", "Integrated WiFi 6E", "2.5G LAN", "PCIe 4.0 support"],
  boxContents: ["Motherboard", "SATA cables", "WiFi antenna", "Documentation"], compatibility: ["AMD Ryzen 7000/8000/9000 series", "DDR5 RAM", "ATX cases"],
  upgradeOptions: ["Add NVMe SSD in M.2 slots", "Upgrade RAM up to 128GB"], recommendedAccessories: ["AM5 CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "msi-mag-b650-tomahawk-wifi", keywords: ["msi mag b650 tomahawk", "am5 motherboard", "b650 motherboard"], metaTitle: "MSI MAG B650 Tomahawk WiFi | DESKTO", metaDescription: "Buy MSI MAG B650 Tomahawk WiFi AM5 motherboard at DESKTO with warranty.", tags: ["msi mag b650 tomahawk", "am5 motherboard", "b650 motherboard"] },
  warrantyMonths: 36,
});

const GIGABYTE_B650_AORUS_ELITE_PRODUCT = draftCatalogProduct({
  id: 79, name: "Gigabyte B650 Aorus Elite AX", category: "motherboard", brand: "Gigabyte", model: "B650 Aorus Elite AX",
  sku: "GIGA-B650-AORUSELITE-AX", price: 16490, orig: 18490, stock: 11,
  specs: ["AM5 Socket, B650 Chipset", "DDR5 RAM, up to 128GB", "PCIe 4.0 x16", "WiFi 6E & Bluetooth 5.2", "ATX Form Factor"],
  processor: "Supports AMD Ryzen 7000/8000/9000 series (AM5 socket)", ram: "4x DDR5 DIMM slots, up to 128GB, up to 6400MHz (OC)",
  ports: "4x USB 3.2 Gen 2, HDMI 2.1, DisplayPort 1.4, RJ45 2.5G LAN, WiFi 6E", powerRequirement: "24-pin ATX + 8-pin EPS12V",
  description: "The Gigabyte B650 Aorus Elite AX offers a balanced feature set with a durable 12+2+2 power design for AM5 gaming builds.",
  technicalDetails: "AM5 socket, B650 chipset, ATX form factor, 4x DDR5 slots up to 128GB, PCIe 4.0 x16 slot, 2.5G LAN, integrated WiFi 6E and Bluetooth 5.2, 12+2+2 power stages.",
  useCase: "Good fit for mid-range to high-end Ryzen gaming builds wanting solid VRM headroom.",
  performanceNotes: "12+2+2 power stage design provides stable delivery for higher core-count Ryzen CPUs.",
  qualityNotes: "Genuine Gigabyte product with 3-year manufacturer warranty.",
  features: ["12+2+2 power design", "Integrated WiFi 6E", "2.5G LAN", "PCIe 4.0 support"],
  boxContents: ["Motherboard", "SATA cables", "WiFi antenna", "Documentation"], compatibility: ["AMD Ryzen 7000/8000/9000 series", "DDR5 RAM", "ATX cases"],
  upgradeOptions: ["Add NVMe SSD in M.2 slots", "Upgrade RAM up to 128GB"], recommendedAccessories: ["AM5 CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "gigabyte-b650-aorus-elite-ax", keywords: ["gigabyte b650 aorus elite", "am5 motherboard", "b650 motherboard"], metaTitle: "Gigabyte B650 Aorus Elite AX | DESKTO", metaDescription: "Buy Gigabyte B650 Aorus Elite AX AM5 motherboard at DESKTO with warranty.", tags: ["gigabyte b650 aorus elite", "am5 motherboard", "b650 motherboard"] },
  warrantyMonths: 36,
});

const ASROCK_B650M_PRO_RS_PRODUCT = draftCatalogProduct({
  id: 80, name: "ASRock B650M Pro RS WiFi", category: "motherboard", brand: "ASRock", model: "B650M Pro RS WiFi",
  sku: "ASROCK-B650M-PRORS-WIFI", price: 13990, orig: 15990, stock: 12,
  specs: ["AM5 Socket, B650 Chipset", "DDR5 RAM, up to 128GB", "PCIe 4.0 x16", "WiFi 6 & Bluetooth 5.2", "mATX Form Factor"],
  processor: "Supports AMD Ryzen 7000/8000/9000 series (AM5 socket)", ram: "4x DDR5 DIMM slots, up to 128GB, up to 6400MHz (OC)",
  ports: "4x USB 3.2 Gen 2, HDMI 2.1, DisplayPort 1.4, RJ45 2.5G LAN, WiFi 6", powerRequirement: "24-pin ATX + 8-pin EPS12V",
  description: "The ASRock B650M Pro RS WiFi is a compact, value-oriented mATX AM5 motherboard for budget-conscious Ryzen gaming builds.",
  technicalDetails: "AM5 socket, B650 chipset, mATX form factor, 4x DDR5 slots up to 128GB, PCIe 4.0 x16 slot, 2.5G LAN, integrated WiFi 6 and Bluetooth 5.2.",
  useCase: "Great for compact mATX Ryzen builds that don't need full ATX expansion.",
  performanceNotes: "Solid power delivery for mainstream Ryzen CPUs in a space-saving mATX footprint.",
  qualityNotes: "Genuine ASRock product with 3-year manufacturer warranty.",
  features: ["Compact mATX form factor", "Integrated WiFi 6", "2.5G LAN", "PCIe 4.0 support"],
  boxContents: ["Motherboard", "SATA cables", "WiFi antenna", "Documentation"], compatibility: ["AMD Ryzen 7000/8000/9000 series", "DDR5 RAM", "ATX/mATX cases"],
  upgradeOptions: ["Add NVMe SSD in M.2 slots", "Upgrade RAM up to 128GB"], recommendedAccessories: ["AM5 CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "asrock-b650m-pro-rs-wifi", keywords: ["asrock b650m pro rs", "am5 motherboard", "matx motherboard"], metaTitle: "ASRock B650M Pro RS WiFi | DESKTO", metaDescription: "Buy ASRock B650M Pro RS WiFi mATX AM5 motherboard at DESKTO with warranty.", tags: ["asrock b650m pro rs", "am5 motherboard", "matx motherboard"] },
  warrantyMonths: 36,
});

const BIOSTAR_B760MX_PRODUCT = draftCatalogProduct({
  id: 81, name: "Biostar B760MX-E Pro", category: "motherboard", brand: "Biostar", model: "B760MX-E Pro",
  sku: "BIOSTAR-B760MX-E-PRO", price: 9990, orig: 11490, stock: 14,
  specs: ["LGA1700 Socket, B760 Chipset", "DDR5 RAM, up to 128GB", "PCIe 4.0 x16", "Gigabit LAN", "mATX Form Factor"],
  processor: "Supports Intel Core 12th/13th/14th Gen (LGA1700 socket)", ram: "2x DDR5 DIMM slots, up to 128GB, up to 5600MHz (OC)",
  ports: "4x USB 3.2 Gen 1, HDMI 2.1, DisplayPort 1.2, RJ45 Gigabit LAN", powerRequirement: "24-pin ATX + 8-pin EPS12V",
  description: "The Biostar B760MX-E Pro is a budget-friendly mATX motherboard for Intel 12th/13th/14th Gen builds needing essential features at a low price.",
  technicalDetails: "LGA1700 socket, B760 chipset, mATX form factor, 2x DDR5 slots up to 128GB, PCIe 4.0 x16 slot, Gigabit LAN, essential I/O for budget builds.",
  useCase: "A cost-effective choice for budget Intel 12th/13th/14th Gen builds without discrete GPU overclocking needs.",
  performanceNotes: "Delivers reliable performance for non-K Intel CPUs and everyday computing/gaming workloads.",
  qualityNotes: "Genuine Biostar product with 3-year manufacturer warranty.",
  features: ["Budget-friendly mATX design", "Gigabit LAN", "PCIe 4.0 support", "DDR5 memory support"],
  boxContents: ["Motherboard", "SATA cables", "Documentation"], compatibility: ["Intel Core 12th/13th/14th Gen", "DDR5 RAM", "ATX/mATX cases"],
  upgradeOptions: ["Add NVMe SSD in M.2 slot", "Upgrade RAM up to 128GB"], recommendedAccessories: ["LGA1700 CPU Cooler", "DDR5 RAM Kit"],
  seo: { slug: "biostar-b760mx-e-pro", keywords: ["biostar b760mx", "lga1700 motherboard", "budget motherboard"], metaTitle: "Biostar B760MX-E Pro | DESKTO", metaDescription: "Buy Biostar B760MX-E Pro budget LGA1700 motherboard at DESKTO with warranty.", tags: ["biostar b760mx", "lga1700 motherboard", "budget motherboard"] },
  warrantyMonths: 36,
});

// ── Power supplies ──
const CORSAIR_RM750E_PRODUCT = draftCatalogProduct({
  id: 82, name: "Corsair RM750e 750W 80+ Gold", category: "psu", brand: "Corsair", model: "RM750e",
  sku: "CORS-RM750E-750W-GOLD", price: 8490, orig: 9490, stock: 12,
  specs: ["750W Output", "80+ Gold Certified", "Fully Modular", "ATX 3.0 & PCIe 5.0 ready", "135mm Fluid Dynamic Bearing Fan"],
  powerRequirement: "750W continuous output, 80+ Gold efficiency",
  description: "The Corsair RM750e is a fully modular 80+ Gold PSU delivering clean, stable power with near-silent operation for mid-to-high-end builds.",
  technicalDetails: "750W continuous output, 80+ Gold certified, fully modular cabling, ATX 3.0 and PCIe 5.0 12VHPWR ready, 135mm fluid dynamic bearing fan, zero RPM fan mode.",
  useCase: "Well suited for mid-to-high-end gaming PCs including builds with RTX 40/50-series GPUs.",
  performanceNotes: "Zero RPM fan mode keeps the PSU silent under light-to-moderate loads.",
  qualityNotes: "Genuine Corsair product with 7-year manufacturer warranty.",
  features: ["Fully modular cabling", "Zero RPM fan mode", "ATX 3.0 / PCIe 5.0 ready", "80+ Gold efficiency"],
  boxContents: ["PSU unit", "Modular cables", "Power cord", "Mounting screws", "Documentation"],
  compatibility: ["ATX cases", "PCIe 5.0 GPUs", "Standard ATX motherboards"],
  upgradeOptions: ["Add individually sleeved cables"], recommendedAccessories: ["Cable Management Kit"],
  seo: { slug: "corsair-rm750e-750w", keywords: ["corsair rm750e", "80+ gold psu", "modular psu"], metaTitle: "Corsair RM750e 750W 80+ Gold PSU | DESKTO", metaDescription: "Buy Corsair RM750e 750W 80+ Gold fully modular PSU at DESKTO with warranty.", tags: ["corsair rm750e", "80+ gold psu", "modular psu"] },
  warrantyMonths: 84,
});

const CM_MWE_650_BRONZE_PRODUCT = draftCatalogProduct({
  id: 83, name: "Cooler Master MWE 650 Bronze V2", category: "psu", brand: "Cooler Master", model: "MWE 650 Bronze V2",
  sku: "CM-MWE650-BRONZE-V2", price: 3990, orig: 4490, stock: 18,
  specs: ["650W Output", "80+ Bronze Certified", "Non-Modular", "120mm HDB Fan", "Flat Black Cables"],
  powerRequirement: "650W continuous output, 80+ Bronze efficiency",
  description: "The Cooler Master MWE 650 Bronze V2 is a dependable, budget-friendly PSU offering solid power delivery for mainstream builds.",
  technicalDetails: "650W continuous output, 80+ Bronze certified, non-modular cabling, 120mm hydraulic dynamic bearing fan, flat black ribbon-style cables.",
  useCase: "A cost-effective choice for budget-to-mid-range gaming and office PC builds.",
  performanceNotes: "Stable voltage regulation and quiet operation for everyday use.",
  qualityNotes: "Genuine Cooler Master product with 5-year manufacturer warranty.",
  features: ["80+ Bronze efficiency", "Flat black cables", "Quiet HDB fan", "Protection circuits (OVP/UVP/SCP/OPP)"],
  boxContents: ["PSU unit", "Power cord", "Mounting screws", "Documentation"],
  compatibility: ["ATX cases", "Standard ATX motherboards"],
  upgradeOptions: ["Upgrade to a modular PSU for cleaner cable routing"], recommendedAccessories: ["Cable Management Kit"],
  seo: { slug: "cooler-master-mwe-650-bronze-v2", keywords: ["cooler master mwe 650", "80+ bronze psu", "budget psu"], metaTitle: "Cooler Master MWE 650 Bronze V2 | DESKTO", metaDescription: "Buy Cooler Master MWE 650 Bronze V2 PSU at DESKTO with warranty.", tags: ["cooler master mwe 650", "80+ bronze psu", "budget psu"] },
  warrantyMonths: 60,
});

const DEEPCOOL_PK650D_PRODUCT = draftCatalogProduct({
  id: 84, name: "DeepCool PK650D 650W 80+ Bronze", category: "psu", brand: "DeepCool", model: "PK650D",
  sku: "DEEPCOOL-PK650D-650W", price: 3490, orig: 3990, stock: 20,
  specs: ["650W Output", "80+ Bronze Certified", "Non-Modular", "120mm Fan", "Compact ATX Design"],
  powerRequirement: "650W continuous output, 80+ Bronze efficiency",
  description: "The DeepCool PK650D is an affordable 650W PSU offering reliable power delivery for budget gaming and everyday-use builds.",
  technicalDetails: "650W continuous output, 80+ Bronze certified, non-modular cabling, 120mm cooling fan, compact ATX form factor.",
  useCase: "A practical choice for entry-level gaming PCs and office builds on a tight budget.",
  performanceNotes: "Stable power delivery suitable for single mid-range GPU configurations.",
  qualityNotes: "Genuine DeepCool product with 3-year manufacturer warranty.",
  features: ["80+ Bronze efficiency", "Compact design", "Built-in protection circuits", "Quiet operation"],
  boxContents: ["PSU unit", "Power cord", "Mounting screws", "Documentation"],
  compatibility: ["ATX cases", "Standard ATX motherboards"],
  upgradeOptions: ["Upgrade to a modular PSU for cleaner cable routing"], recommendedAccessories: ["Cable Management Kit"],
  seo: { slug: "deepcool-pk650d-650w", keywords: ["deepcool pk650d", "80+ bronze psu", "budget psu"], metaTitle: "DeepCool PK650D 650W 80+ Bronze PSU | DESKTO", metaDescription: "Buy DeepCool PK650D 650W 80+ Bronze PSU at DESKTO with warranty.", tags: ["deepcool pk650d", "80+ bronze psu", "budget psu"] },
  warrantyMonths: 36,
});

const MSI_MAG_A650BN_PRODUCT = draftCatalogProduct({
  id: 85, name: "MSI MAG A650BN 650W 80+ Bronze", category: "psu", brand: "MSI", model: "MAG A650BN",
  sku: "MSI-MAGA650BN-650W", price: 3790, orig: 4290, stock: 16,
  specs: ["650W Output", "80+ Bronze Certified", "Non-Modular", "120mm Fan", "Flat Cable Design"],
  powerRequirement: "650W continuous output, 80+ Bronze efficiency",
  description: "The MSI MAG A650BN delivers reliable 80+ Bronze efficiency and stable power delivery for mainstream gaming builds.",
  technicalDetails: "650W continuous output, 80+ Bronze certified, non-modular flat cable design, 120mm cooling fan, built-in protection circuits.",
  useCase: "Suited for budget-to-mid-range gaming PCs needing dependable single-GPU power delivery.",
  performanceNotes: "Consistent voltage regulation for stable performance under gaming loads.",
  qualityNotes: "Genuine MSI product with 5-year manufacturer warranty.",
  features: ["80+ Bronze efficiency", "Flat cable design", "Protection circuits (OVP/UVP/SCP/OPP)", "120mm cooling fan"],
  boxContents: ["PSU unit", "Power cord", "Mounting screws", "Documentation"],
  compatibility: ["ATX cases", "Standard ATX motherboards"],
  upgradeOptions: ["Upgrade to a modular PSU for cleaner cable routing"], recommendedAccessories: ["Cable Management Kit"],
  seo: { slug: "msi-mag-a650bn-650w", keywords: ["msi mag a650bn", "80+ bronze psu", "budget psu"], metaTitle: "MSI MAG A650BN 650W 80+ Bronze PSU | DESKTO", metaDescription: "Buy MSI MAG A650BN 650W 80+ Bronze PSU at DESKTO with warranty.", tags: ["msi mag a650bn", "80+ bronze psu", "budget psu"] },
  warrantyMonths: 60,
});

const TT_TOUGHPOWER_GF_A3_PRODUCT = draftCatalogProduct({
  id: 86, name: "Thermaltake Toughpower GF A3 750W 80+ Gold", category: "psu", brand: "Thermaltake", model: "Toughpower GF A3 750W",
  sku: "TT-TOUGHPOWER-GFA3-750W", price: 7990, orig: 8990, stock: 10,
  specs: ["750W Output", "80+ Gold Certified", "Fully Modular", "ATX 3.0 & PCIe 5.0 ready", "140mm Fan"],
  powerRequirement: "750W continuous output, 80+ Gold efficiency",
  description: "The Thermaltake Toughpower GF A3 750W is a fully modular 80+ Gold PSU with native PCIe 5.0 support for modern high-performance builds.",
  technicalDetails: "750W continuous output, 80+ Gold certified, fully modular cabling, ATX 3.0 and native PCIe 5.0 12VHPWR connector, 140mm hydraulic bearing fan, smart zero fan mode.",
  useCase: "A strong choice for high-end gaming builds running RTX 40/50-series GPUs.",
  performanceNotes: "Native PCIe 5.0 connector eliminates the need for adapter cables with newer GPUs.",
  qualityNotes: "Genuine Thermaltake product with 10-year manufacturer warranty.",
  features: ["Native PCIe 5.0 connector", "Fully modular cabling", "Smart zero fan mode", "80+ Gold efficiency"],
  boxContents: ["PSU unit", "Modular cables", "Power cord", "Mounting screws", "Documentation"],
  compatibility: ["ATX cases", "PCIe 5.0 GPUs", "Standard ATX motherboards"],
  upgradeOptions: ["Add individually sleeved cables"], recommendedAccessories: ["Cable Management Kit"],
  seo: { slug: "thermaltake-toughpower-gf-a3-750w", keywords: ["thermaltake toughpower gf a3", "80+ gold psu", "pcie 5.0 psu"], metaTitle: "Thermaltake Toughpower GF A3 750W | DESKTO", metaDescription: "Buy Thermaltake Toughpower GF A3 750W 80+ Gold PSU at DESKTO with warranty.", tags: ["thermaltake toughpower gf a3", "80+ gold psu", "pcie 5.0 psu"] },
  warrantyMonths: 120,
});

// ── Cabinets ──
const NZXT_H5_FLOW_PRODUCT = draftCatalogProduct({
  id: 87, name: "NZXT H5 Flow", category: "cabinet", brand: "NZXT", model: "H5 Flow",
  sku: "NZXT-H5-FLOW", price: 6490, orig: 7490, stock: 12,
  specs: ["Mid-Tower ATX Case", "High-Airflow Front Mesh", "Tempered Glass Side Panel", "2x 120mm Fans Included", "Supports up to 360mm Radiator"],
  weight: "6.8 kg", dimensions: "43.0 x 21 x 45 cm", ports: "1x USB-C, 2x USB-A 3.2, Audio/Mic combo jack",
  description: "The NZXT H5 Flow is a clean, high-airflow mid-tower case with a minimalist design and excellent thermal performance out of the box.",
  technicalDetails: "ATX mid-tower, high-airflow perforated front panel, tempered glass side panel, 2x 120mm fans pre-installed, supports up to 360mm radiators, cable management channels.",
  useCase: "A great all-around case for gaming builds prioritizing airflow and clean aesthetics.",
  performanceNotes: "High-airflow front mesh keeps internal temperatures low even with mid-to-high-end components.",
  qualityNotes: "Genuine NZXT product with 2-year manufacturer warranty.",
  features: ["High-airflow mesh front", "Tempered glass side panel", "Cable management channels", "Up to 360mm radiator support"],
  boxContents: ["Case", "2x 120mm fans (pre-installed)", "Screws & standoffs", "Documentation"],
  compatibility: ["ATX/mATX/ITX motherboards", "Standard ATX PSUs"],
  upgradeOptions: ["Add more case fans", "Add AIO liquid cooler"], recommendedAccessories: ["Additional Case Fans", "AIO Liquid Cooler"],
  seo: { slug: "nzxt-h5-flow", keywords: ["nzxt h5 flow", "pc case", "airflow case"], metaTitle: "NZXT H5 Flow PC Case | DESKTO", metaDescription: "Buy NZXT H5 Flow high-airflow mid-tower case at DESKTO with warranty.", tags: ["nzxt h5 flow", "pc case", "airflow case"] },
  warrantyMonths: 24,
});

const CORSAIR_4000D_AIRFLOW_PRODUCT = draftCatalogProduct({
  id: 88, name: "Corsair 4000D Airflow", category: "cabinet", brand: "Corsair", model: "4000D Airflow",
  sku: "CORS-4000D-AIRFLOW", price: 7990, orig: 8990, stock: 14,
  specs: ["Mid-Tower ATX Case", "High-Airflow Front Panel", "Tempered Glass Side Panel", "2x 120mm Fans Included", "Supports up to 360mm Radiator"],
  weight: "7.2 kg", dimensions: "45.3 x 23 x 46.6 cm", ports: "1x USB-C, 2x USB-A 3.2, Audio/Mic combo jack",
  description: "The Corsair 4000D Airflow is one of the most popular mid-tower cases, balancing excellent airflow, spacious interior, and clean cable management.",
  technicalDetails: "ATX mid-tower, high-airflow front panel, tempered glass side panel, 2x 120mm AirGuide fans pre-installed, supports up to 360mm radiators, generous cable routing space.",
  useCase: "A versatile, widely recommended case for gaming and general PC builds of all budgets.",
  performanceNotes: "AirGuide fan technology directs airflow efficiently across internal components.",
  qualityNotes: "Genuine Corsair product with 2-year manufacturer warranty.",
  features: ["High-airflow front panel", "AirGuide fan technology", "Generous cable routing space", "Up to 360mm radiator support"],
  boxContents: ["Case", "2x 120mm AirGuide fans (pre-installed)", "Screws & standoffs", "Documentation"],
  compatibility: ["ATX/mATX/ITX motherboards", "Standard ATX PSUs"],
  upgradeOptions: ["Add more case fans", "Add AIO liquid cooler"], recommendedAccessories: ["Additional Case Fans", "AIO Liquid Cooler"],
  seo: { slug: "corsair-4000d-airflow", keywords: ["corsair 4000d airflow", "pc case", "airflow case"], metaTitle: "Corsair 4000D Airflow PC Case | DESKTO", metaDescription: "Buy Corsair 4000D Airflow mid-tower case at DESKTO with warranty.", tags: ["corsair 4000d airflow", "pc case", "airflow case"] },
  warrantyMonths: 24,
});

const LIAN_LI_LANCOOL_216_PRODUCT = draftCatalogProduct({
  id: 89, name: "Lian Li Lancool 216", category: "cabinet", brand: "Lian Li", model: "Lancool 216",
  sku: "LIANLI-LANCOOL216", price: 7490, orig: 8490, stock: 10,
  specs: ["Mid-Tower ATX Case", "Dual Mesh Front Design", "Tempered Glass Side Panel", "2x 160mm Fans Included", "Supports up to 360mm Radiator"],
  weight: "8.6 kg", dimensions: "49.9 x 23 x 48.98 cm", ports: "1x USB-C, 2x USB-A 3.2, Audio/Mic combo jack",
  description: "The Lian Li Lancool 216 features a distinctive dual-mesh front design with large 160mm fans, delivering exceptional airflow for high-performance builds.",
  technicalDetails: "ATX mid-tower, dual-mesh front panel, tempered glass side panel, 2x 160mm fans pre-installed, supports up to 360mm radiators, spacious interior for large GPUs.",
  useCase: "Ideal for high-performance gaming builds that need maximum airflow for hot-running components.",
  performanceNotes: "Large 160mm intake fans move significantly more air than standard 120mm fans, improving thermal headroom.",
  qualityNotes: "Genuine Lian Li product with 2-year manufacturer warranty.",
  features: ["Dual-mesh front design", "Large 160mm fans", "Spacious GPU clearance", "Up to 360mm radiator support"],
  boxContents: ["Case", "2x 160mm fans (pre-installed)", "Screws & standoffs", "Documentation"],
  compatibility: ["ATX/mATX/ITX motherboards", "Standard ATX PSUs"],
  upgradeOptions: ["Add more case fans", "Add AIO liquid cooler"], recommendedAccessories: ["Additional Case Fans", "AIO Liquid Cooler"],
  seo: { slug: "lian-li-lancool-216", keywords: ["lian li lancool 216", "pc case", "airflow case"], metaTitle: "Lian Li Lancool 216 PC Case | DESKTO", metaDescription: "Buy Lian Li Lancool 216 high-airflow mid-tower case at DESKTO with warranty.", tags: ["lian li lancool 216", "pc case", "airflow case"] },
  warrantyMonths: 24,
});

const CM_TD500_MESH_PRODUCT = draftCatalogProduct({
  id: 90, name: "Cooler Master TD500 Mesh", category: "cabinet", brand: "Cooler Master", model: "TD500 Mesh",
  sku: "CM-TD500-MESH", price: 6990, orig: 7990, stock: 11,
  specs: ["Mid-Tower ATX Case", "Polygonal Mesh Front", "Tempered Glass Side Panel", "3x ARGB Fans Included", "Supports up to 360mm Radiator"],
  weight: "7.5 kg", dimensions: "46.2 x 21.5 x 47.6 cm", ports: "1x USB-C, 2x USB-A 3.2, Audio/Mic combo jack",
  description: "The Cooler Master TD500 Mesh combines a distinctive polygonal mesh front with pre-installed ARGB fans for strong airflow and eye-catching aesthetics.",
  technicalDetails: "ATX mid-tower, polygonal mesh front panel, tempered glass side panel, 3x ARGB fans pre-installed, supports up to 360mm radiators, built-in ARGB controller.",
  useCase: "Great for gaming builds wanting strong airflow combined with RGB lighting aesthetics.",
  performanceNotes: "Polygonal mesh front maximizes intake airflow while the pre-installed ARGB fans add visual flair.",
  qualityNotes: "Genuine Cooler Master product with 2-year manufacturer warranty.",
  features: ["Polygonal mesh front", "3x pre-installed ARGB fans", "Built-in ARGB controller", "Up to 360mm radiator support"],
  boxContents: ["Case", "3x ARGB fans (pre-installed)", "Screws & standoffs", "Documentation"],
  compatibility: ["ATX/mATX/ITX motherboards", "Standard ATX PSUs"],
  upgradeOptions: ["Add more case fans", "Add AIO liquid cooler"], recommendedAccessories: ["Additional Case Fans", "AIO Liquid Cooler"],
  seo: { slug: "cooler-master-td500-mesh", keywords: ["cooler master td500 mesh", "pc case", "argb case"], metaTitle: "Cooler Master TD500 Mesh PC Case | DESKTO", metaDescription: "Buy Cooler Master TD500 Mesh ARGB mid-tower case at DESKTO with warranty.", tags: ["cooler master td500 mesh", "pc case", "argb case"] },
  warrantyMonths: 24,
});

const DEEPCOOL_CH560_PRODUCT = draftCatalogProduct({
  id: 91, name: "DeepCool CH560", category: "cabinet", brand: "DeepCool", model: "CH560",
  sku: "DEEPCOOL-CH560", price: 6290, orig: 7290, stock: 13,
  specs: ["Mid-Tower ATX Case", "Mesh Front Panel", "Dual Tempered Glass Panels", "4x ARGB Fans Included", "Supports up to 360mm Radiator"],
  weight: "8.0 kg", dimensions: "46.5 x 22.5 x 49 cm", ports: "1x USB-C, 2x USB-A 3.2, Audio/Mic combo jack",
  description: "The DeepCool CH560 offers a showcase build aesthetic with dual tempered glass panels and four pre-installed ARGB fans at a competitive price.",
  technicalDetails: "ATX mid-tower, mesh front panel, dual tempered glass side and top panels, 4x ARGB fans pre-installed, supports up to 360mm radiators, built-in ARGB hub.",
  useCase: "A strong value pick for RGB showcase builds wanting maximum visual impact on a budget.",
  performanceNotes: "Mesh front panel maintains solid airflow despite the dual tempered glass showcase design.",
  qualityNotes: "Genuine DeepCool product with 2-year manufacturer warranty.",
  features: ["Dual tempered glass panels", "4x pre-installed ARGB fans", "Built-in ARGB hub", "Up to 360mm radiator support"],
  boxContents: ["Case", "4x ARGB fans (pre-installed)", "Screws & standoffs", "Documentation"],
  compatibility: ["ATX/mATX/ITX motherboards", "Standard ATX PSUs"],
  upgradeOptions: ["Add more case fans", "Add AIO liquid cooler"], recommendedAccessories: ["Additional Case Fans", "AIO Liquid Cooler"],
  seo: { slug: "deepcool-ch560", keywords: ["deepcool ch560", "pc case", "argb case"], metaTitle: "DeepCool CH560 PC Case | DESKTO", metaDescription: "Buy DeepCool CH560 ARGB mid-tower case at DESKTO with warranty.", tags: ["deepcool ch560", "pc case", "argb case"] },
  warrantyMonths: 24,
});

// ── Keyboards ──
const LOGITECH_G213_PRODUCT = draftCatalogProduct({
  id: 92, name: "Logitech G213 Prodigy", category: "keyboard", brand: "Logitech", model: "G213 Prodigy",
  sku: "LOGI-G213-PRODIGY", price: 3490, orig: 3990, stock: 20,
  specs: ["Membrane Keys with Mech-Dome switches", "5-Zone RGB Lighting", "Spill-Resistant Design", "Dedicated Media Controls", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "1.01 kg",
  description: "The Logitech G213 Prodigy is a budget-friendly RGB gaming keyboard with responsive Mech-Dome keys and dedicated media controls.",
  technicalDetails: "Membrane keyboard with Mech-Dome key switches, 5-zone customizable RGB lighting via Logitech G HUB, spill-resistant design, dedicated multimedia keys, wired USB connection.",
  useCase: "A solid entry-level gaming keyboard for casual and competitive gamers on a budget.",
  performanceNotes: "Mech-Dome switches offer more tactile feedback than standard membrane keys at a lower price than full mechanical boards.",
  qualityNotes: "Genuine Logitech product with 1-year manufacturer warranty.",
  features: ["5-zone RGB lighting", "Spill-resistant design", "Dedicated media controls", "Logitech G HUB software support"],
  boxContents: ["Keyboard", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a gaming mouse for a matching setup"], recommendedAccessories: ["Gaming Mouse", "Mouse Pad"],
  seo: { slug: "logitech-g213-prodigy", keywords: ["logitech g213", "rgb gaming keyboard", "budget keyboard"], metaTitle: "Logitech G213 Prodigy RGB Keyboard | DESKTO", metaDescription: "Buy Logitech G213 Prodigy RGB gaming keyboard at DESKTO with warranty.", tags: ["logitech g213", "rgb gaming keyboard", "budget keyboard"] },
  rgb: true,
});

const RAZER_BLACKWIDOW_V4_PRODUCT = draftCatalogProduct({
  id: 93, name: "Razer BlackWidow V4", category: "keyboard", brand: "Razer", model: "BlackWidow V4",
  sku: "RAZER-BLACKWIDOW-V4", price: 12990, orig: 14990, stock: 8,
  specs: ["Razer Green Mechanical Switches", "Per-Key RGB Chroma Lighting", "Dedicated Media Roller & Macro Keys", "Ergonomic Wrist Rest Included", "Wired USB Connection"],
  ports: "Wired USB-A connection (passthrough included)", weight: "1.45 kg",
  description: "The Razer BlackWidow V4 is a full-size mechanical gaming keyboard with tactile Razer Green switches, per-key RGB, and dedicated macro controls.",
  technicalDetails: "Razer Green clicky mechanical switches, per-key Chroma RGB lighting, dedicated macro keys and multi-function roller, USB passthrough, magnetic ergonomic wrist rest.",
  useCase: "Built for enthusiast gamers who want tactile mechanical feedback and extensive customization.",
  performanceNotes: "Razer Green switches provide crisp tactile and audible feedback favored for competitive gaming.",
  qualityNotes: "Genuine Razer product with 2-year manufacturer warranty.",
  features: ["Per-key Chroma RGB", "Dedicated macro keys", "USB passthrough", "Magnetic wrist rest"],
  boxContents: ["Keyboard", "Magnetic wrist rest", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a Razer gaming mouse for Chroma sync"], recommendedAccessories: ["Gaming Mouse", "Mouse Pad"],
  seo: { slug: "razer-blackwidow-v4", keywords: ["razer blackwidow v4", "mechanical keyboard", "rgb keyboard"], metaTitle: "Razer BlackWidow V4 Mechanical Keyboard | DESKTO", metaDescription: "Buy Razer BlackWidow V4 mechanical RGB gaming keyboard at DESKTO with warranty.", tags: ["razer blackwidow v4", "mechanical keyboard", "rgb keyboard"] },
  rgb: true, warrantyMonths: 24,
});

const CORSAIR_K55_RGB_PRODUCT = draftCatalogProduct({
  id: 94, name: "Corsair K55 RGB Pro", category: "keyboard", brand: "Corsair", model: "K55 RGB Pro",
  sku: "CORS-K55-RGB-PRO", price: 5490, orig: 6290, stock: 15,
  specs: ["Membrane Keys", "6-Zone RGB Lighting", "Spill-Resistant Design", "Dedicated Media Controls & Macro Keys", "Detachable Palm Rest"],
  ports: "Wired USB-A connection", weight: "1.1 kg",
  description: "The Corsair K55 RGB Pro is a feature-rich membrane gaming keyboard with 6-zone RGB lighting, macro keys, and a detachable palm rest.",
  technicalDetails: "Membrane keyboard, 6-zone customizable RGB lighting via Corsair iCUE, spill-resistant design, dedicated media controls and macro keys, detachable palm rest.",
  useCase: "A comfortable, feature-packed choice for gamers who prefer membrane keys with full RGB customization.",
  performanceNotes: "Anti-ghosting key matrix ensures reliable input registration during fast-paced gameplay.",
  qualityNotes: "Genuine Corsair product with 2-year manufacturer warranty.",
  features: ["6-zone RGB lighting", "Detachable palm rest", "Dedicated macro keys", "Corsair iCUE software support"],
  boxContents: ["Keyboard", "Detachable palm rest", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a Corsair gaming mouse for iCUE sync"], recommendedAccessories: ["Gaming Mouse", "Mouse Pad"],
  seo: { slug: "corsair-k55-rgb-pro", keywords: ["corsair k55 rgb", "rgb gaming keyboard", "membrane keyboard"], metaTitle: "Corsair K55 RGB Pro Keyboard | DESKTO", metaDescription: "Buy Corsair K55 RGB Pro gaming keyboard at DESKTO with warranty.", tags: ["corsair k55 rgb", "rgb gaming keyboard", "membrane keyboard"] },
  rgb: true, warrantyMonths: 24,
});

const REDRAGON_K552_PRODUCT = draftCatalogProduct({
  id: 95, name: "Redragon K552 Kumara", category: "keyboard", brand: "Redragon", model: "K552 Kumara",
  sku: "REDRAGON-K552-KUMARA", price: 3290, orig: 3790, stock: 22,
  specs: ["Outemu Blue Mechanical Switches", "Red LED Backlighting", "Compact Tenkeyless Layout", "Anti-Ghosting", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "0.8 kg",
  description: "The Redragon K552 Kumara is a compact tenkeyless mechanical keyboard offering genuine mechanical switches at an entry-level price.",
  technicalDetails: "Outemu Blue clicky mechanical switches, red LED backlighting, compact tenkeyless (87-key) layout, anti-ghosting key rollover, durable metal top plate.",
  useCase: "A great entry point into mechanical keyboards for budget-conscious gamers.",
  performanceNotes: "Genuine mechanical switches deliver noticeably better feel and durability than membrane keyboards at this price.",
  qualityNotes: "Genuine Redragon product with 1-year manufacturer warranty.",
  features: ["Mechanical switches", "Compact tenkeyless layout", "Metal top plate", "Anti-ghosting"],
  boxContents: ["Keyboard", "Keycap puller", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Add keycap set for customization"], recommendedAccessories: ["Gaming Mouse", "Wrist Rest"],
  seo: { slug: "redragon-k552-kumara", keywords: ["redragon k552", "mechanical keyboard", "budget mechanical keyboard"], metaTitle: "Redragon K552 Kumara Mechanical Keyboard | DESKTO", metaDescription: "Buy Redragon K552 Kumara mechanical gaming keyboard at DESKTO with warranty.", tags: ["redragon k552", "mechanical keyboard", "budget mechanical keyboard"] },
  rgb: false,
});

const HYPERX_ALLOY_ORIGINS_PRODUCT = draftCatalogProduct({
  id: 96, name: "HyperX Alloy Origins", category: "keyboard", brand: "HyperX", model: "Alloy Origins",
  sku: "HYPERX-ALLOY-ORIGINS", price: 8990, orig: 9990, stock: 10,
  specs: ["HyperX Red Mechanical Switches", "Per-Key RGB Lighting", "Aircraft-Grade Aluminum Body", "Compact Tenkeyless Layout", "Wired USB-C Connection"],
  ports: "Wired USB-C connection (detachable cable)", weight: "0.98 kg",
  description: "The HyperX Alloy Origins is a premium tenkeyless mechanical keyboard with an aircraft-grade aluminum frame and in-house HyperX switches.",
  technicalDetails: "HyperX Red linear mechanical switches, per-key RGB lighting, solid aircraft-grade aluminum body, tenkeyless layout, detachable USB-C cable.",
  useCase: "Built for competitive gamers who want a durable, compact keyboard with premium build quality.",
  performanceNotes: "HyperX Red linear switches offer fast, smooth actuation ideal for rapid key presses in competitive titles.",
  qualityNotes: "Genuine HyperX product with 2-year manufacturer warranty.",
  features: ["Aircraft-grade aluminum body", "Per-key RGB lighting", "Detachable USB-C cable", "Compact tenkeyless layout"],
  boxContents: ["Keyboard", "USB-C cable", "Keycap puller", "Documentation"], compatibility: ["Windows", "macOS", "USB-C port"],
  upgradeOptions: ["Add custom keycap set"], recommendedAccessories: ["Gaming Mouse", "Wrist Rest"],
  seo: { slug: "hyperx-alloy-origins", keywords: ["hyperx alloy origins", "mechanical keyboard", "premium keyboard"], metaTitle: "HyperX Alloy Origins Mechanical Keyboard | DESKTO", metaDescription: "Buy HyperX Alloy Origins mechanical gaming keyboard at DESKTO with warranty.", tags: ["hyperx alloy origins", "mechanical keyboard", "premium keyboard"] },
  rgb: true, warrantyMonths: 24,
});

// ── Mice ──
const LOGITECH_G102_PRODUCT = draftCatalogProduct({
  id: 97, name: "Logitech G102 Lightsync", category: "mouse", brand: "Logitech", model: "G102 Lightsync",
  sku: "LOGI-G102-LIGHTSYNC", price: 1290, orig: 1490, stock: 30,
  specs: ["8000 DPI Optical Sensor", "RGB Lightsync Lighting", "6 Programmable Buttons", "Lightweight Design", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "85 g",
  description: "The Logitech G102 Lightsync is a lightweight, affordable gaming mouse with a precise optical sensor and customizable RGB lighting.",
  technicalDetails: "8000 DPI optical sensor, RGB Lightsync lighting via Logitech G HUB, 6 programmable buttons, lightweight 85g design, wired USB connection.",
  useCase: "A reliable entry-level gaming mouse suited for esports titles and everyday use.",
  performanceNotes: "Accurate optical sensor tracking with adjustable DPI for both precision aiming and fast flick shots.",
  qualityNotes: "Genuine Logitech product with 1-year manufacturer warranty.",
  features: ["RGB Lightsync lighting", "6 programmable buttons", "Lightweight design", "Logitech G HUB software support"],
  boxContents: ["Mouse", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a mouse pad for consistent tracking"], recommendedAccessories: ["Gaming Mouse Pad", "Gaming Keyboard"],
  seo: { slug: "logitech-g102-lightsync", keywords: ["logitech g102", "budget gaming mouse", "rgb mouse"], metaTitle: "Logitech G102 Lightsync Gaming Mouse | DESKTO", metaDescription: "Buy Logitech G102 Lightsync gaming mouse at DESKTO with warranty.", tags: ["logitech g102", "budget gaming mouse", "rgb mouse"] },
  rgb: true,
});

const RAZER_DEATHADDER_V3_PRODUCT = draftCatalogProduct({
  id: 98, name: "Razer DeathAdder V3", category: "mouse", brand: "Razer", model: "DeathAdder V3",
  sku: "RAZER-DEATHADDER-V3", price: 6490, orig: 7490, stock: 14,
  specs: ["30000 DPI Focus Pro Sensor", "Ergonomic Right-Handed Shape", "59g Ultra-Lightweight Design", "5 Programmable Buttons", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "59 g",
  description: "The Razer DeathAdder V3 refines Razer's iconic ergonomic shape into an ultra-lightweight 59g design with a flagship-grade optical sensor.",
  technicalDetails: "30000 DPI Focus Pro 30K optical sensor, ergonomic right-handed shape, 59g ultra-lightweight shell, 5 programmable buttons, wired USB connection with braided cable.",
  useCase: "Built for competitive and casual gamers who want a proven ergonomic shape with top-tier sensor performance.",
  performanceNotes: "Focus Pro 30K sensor delivers exceptional tracking accuracy with zero smoothing or acceleration.",
  qualityNotes: "Genuine Razer product with 2-year manufacturer warranty.",
  features: ["Focus Pro 30K sensor", "Ultra-lightweight 59g shell", "Ergonomic right-handed shape", "Razer Speedflex cable"],
  boxContents: ["Mouse", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a mouse pad for consistent tracking"], recommendedAccessories: ["Gaming Mouse Pad", "Gaming Keyboard"],
  seo: { slug: "razer-deathadder-v3", keywords: ["razer deathadder v3", "gaming mouse", "lightweight mouse"], metaTitle: "Razer DeathAdder V3 Gaming Mouse | DESKTO", metaDescription: "Buy Razer DeathAdder V3 lightweight gaming mouse at DESKTO with warranty.", tags: ["razer deathadder v3", "gaming mouse", "lightweight mouse"] },
  warrantyMonths: 24,
});

const STEELSERIES_RIVAL_3_PRODUCT = draftCatalogProduct({
  id: 99, name: "SteelSeries Rival 3", category: "mouse", brand: "SteelSeries", model: "Rival 3",
  sku: "STEELSERIES-RIVAL-3", price: 2490, orig: 2890, stock: 20,
  specs: ["8500 DPI TrueMove Core Sensor", "8-Zone RGB Lighting", "6 Programmable Buttons", "IP54 Water/Dust Resistance", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "77 g",
  description: "The SteelSeries Rival 3 is a durable, budget-friendly gaming mouse with IP54 water and dust resistance and vivid 8-zone RGB lighting.",
  technicalDetails: "8500 DPI TrueMove Core optical sensor, 8-zone customizable RGB lighting via SteelSeries GG, 6 programmable buttons, IP54-rated shell, wired USB connection.",
  useCase: "A great value pick for gamers wanting durability and RGB customization on a budget.",
  performanceNotes: "TrueMove Core sensor delivers reliable, accurate tracking for casual and competitive play.",
  qualityNotes: "Genuine SteelSeries product with 2-year manufacturer warranty and IP54 durability rating.",
  features: ["IP54 water/dust resistance", "8-zone RGB lighting", "6 programmable buttons", "SteelSeries GG software support"],
  boxContents: ["Mouse", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a mouse pad for consistent tracking"], recommendedAccessories: ["Gaming Mouse Pad", "Gaming Keyboard"],
  seo: { slug: "steelseries-rival-3", keywords: ["steelseries rival 3", "budget gaming mouse", "rgb mouse"], metaTitle: "SteelSeries Rival 3 Gaming Mouse | DESKTO", metaDescription: "Buy SteelSeries Rival 3 gaming mouse at DESKTO with warranty.", tags: ["steelseries rival 3", "budget gaming mouse", "rgb mouse"] },
  rgb: true, warrantyMonths: 24,
});

const CORSAIR_HARPOON_RGB_PRODUCT = draftCatalogProduct({
  id: 100, name: "Corsair Harpoon RGB", category: "mouse", brand: "Corsair", model: "Harpoon RGB",
  sku: "CORS-HARPOON-RGB", price: 1990, orig: 2390, stock: 18,
  specs: ["6000 DPI Optical Sensor", "RGB Lighting", "6 Programmable Buttons", "Lightweight 85g Design", "Wired USB Connection"],
  ports: "Wired USB-A connection", weight: "85 g",
  description: "The Corsair Harpoon RGB is a compact, lightweight gaming mouse offering solid everyday performance with customizable RGB lighting.",
  technicalDetails: "6000 DPI optical sensor, single-zone RGB lighting via Corsair iCUE, 6 programmable buttons, lightweight 85g design, wired USB connection.",
  useCase: "A comfortable, affordable everyday gaming mouse for casual play and general use.",
  performanceNotes: "Reliable optical tracking for everyday gaming and productivity tasks.",
  qualityNotes: "Genuine Corsair product with 2-year manufacturer warranty.",
  features: ["RGB lighting", "6 programmable buttons", "Lightweight design", "Corsair iCUE software support"],
  boxContents: ["Mouse", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a mouse pad for consistent tracking"], recommendedAccessories: ["Gaming Mouse Pad", "Gaming Keyboard"],
  seo: { slug: "corsair-harpoon-rgb", keywords: ["corsair harpoon rgb", "budget gaming mouse", "rgb mouse"], metaTitle: "Corsair Harpoon RGB Gaming Mouse | DESKTO", metaDescription: "Buy Corsair Harpoon RGB gaming mouse at DESKTO with warranty.", tags: ["corsair harpoon rgb", "budget gaming mouse", "rgb mouse"] },
  rgb: true, warrantyMonths: 24,
});

const HYPERX_PULSEFIRE_HASTE2_PRODUCT = draftCatalogProduct({
  id: 101, name: "HyperX Pulsefire Haste 2", category: "mouse", brand: "HyperX", model: "Pulsefire Haste 2",
  sku: "HYPERX-PULSEFIRE-HASTE2", price: 4990, orig: 5690, stock: 12,
  specs: ["26000 DPI Sensor", "Wireless 2.4GHz Connection", "Honeycomb Lightweight Shell", "61g Weight", "Up to 100 hours battery life"],
  ports: "Wireless 2.4GHz USB dongle (USB-C charging)", weight: "61 g",
  description: "The HyperX Pulsefire Haste 2 is an ultra-lightweight wireless gaming mouse with a honeycomb shell design and long battery life.",
  technicalDetails: "26000 DPI optical sensor, wireless 2.4GHz connection, honeycomb-perforated lightweight shell, 61g weight, up to 100 hours battery life, USB-C charging.",
  useCase: "Great for competitive gamers who want wireless freedom without sacrificing weight or responsiveness.",
  performanceNotes: "2.4GHz wireless connection delivers near-zero latency comparable to wired mice.",
  qualityNotes: "Genuine HyperX product with 2-year manufacturer warranty.",
  features: ["Honeycomb lightweight shell", "Up to 100 hours battery life", "2.4GHz low-latency wireless", "USB-C charging"],
  boxContents: ["Mouse", "USB dongle", "USB-C charging cable", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a mouse pad for consistent tracking"], recommendedAccessories: ["Gaming Mouse Pad", "Gaming Keyboard"],
  seo: { slug: "hyperx-pulsefire-haste-2", keywords: ["hyperx pulsefire haste 2", "wireless gaming mouse", "lightweight mouse"], metaTitle: "HyperX Pulsefire Haste 2 Wireless Mouse | DESKTO", metaDescription: "Buy HyperX Pulsefire Haste 2 wireless gaming mouse at DESKTO with warranty.", tags: ["hyperx pulsefire haste 2", "wireless gaming mouse", "lightweight mouse"] },
  warrantyMonths: 24,
});

// ── Headsets ──
const HYPERX_CLOUD_II_PRODUCT = draftCatalogProduct({
  id: 102, name: "HyperX Cloud II", category: "headset", brand: "HyperX", model: "Cloud II",
  sku: "HYPERX-CLOUD-II", price: 6990, orig: 7990, stock: 16,
  specs: ["53mm Drivers", "7.1 Virtual Surround Sound (USB)", "Detachable Noise-Cancelling Mic", "Memory Foam Ear Cushions", "Wired 3.5mm / USB Connection"],
  ports: "Wired 3.5mm + USB sound card adapter", weight: "320 g",
  description: "The HyperX Cloud II is a legendary comfort-focused gaming headset with 7.1 virtual surround sound and memory foam ear cushions.",
  technicalDetails: "53mm drivers, 7.1 virtual surround sound via USB sound card, detachable noise-cancelling microphone, memory foam ear cushions and headband, braided cable.",
  useCase: "A long-session comfort favorite for gamers who prioritize all-day wearability and clear audio.",
  performanceNotes: "Memory foam cushions and a durable steel frame make this one of the most comfortable headsets for extended gaming sessions.",
  qualityNotes: "Genuine HyperX product with 2-year manufacturer warranty.",
  features: ["7.1 virtual surround (USB)", "Detachable noise-cancelling mic", "Memory foam ear cushions", "In-line audio controls"],
  boxContents: ["Headset", "USB sound card adapter", "Detachable microphone", "Documentation"], compatibility: ["PC", "PS5", "Xbox", "Mobile (3.5mm)"],
  upgradeOptions: ["Add a headset stand"], recommendedAccessories: ["Headset Stand", "Gaming Mouse"],
  seo: { slug: "hyperx-cloud-ii", keywords: ["hyperx cloud ii", "gaming headset", "7.1 surround headset"], metaTitle: "HyperX Cloud II Gaming Headset | DESKTO", metaDescription: "Buy HyperX Cloud II 7.1 surround gaming headset at DESKTO with warranty.", tags: ["hyperx cloud ii", "gaming headset", "7.1 surround headset"] },
  warrantyMonths: 24,
});

const LOGITECH_G435_PRODUCT = draftCatalogProduct({
  id: 103, name: "Logitech G435 Lightspeed", category: "headset", brand: "Logitech", model: "G435 Lightspeed",
  sku: "LOGI-G435-LIGHTSPEED", price: 4990, orig: 5690, stock: 15,
  specs: ["40mm Drivers", "Bluetooth + 2.4GHz Lightspeed Wireless", "18g Ultra-Lightweight Design", "Dual Beamforming Mics", "Up to 18 hours battery life"],
  ports: "Bluetooth 5.1 & 2.4GHz USB dongle (dual wireless)", weight: "18 g",
  description: "The Logitech G435 Lightspeed is an ultra-lightweight wireless headset offering dual Bluetooth and 2.4GHz connectivity in a compact, comfortable design.",
  technicalDetails: "40mm drivers, dual wireless via Bluetooth 5.1 and 2.4GHz Lightspeed USB dongle, 18g weight, dual beamforming microphones, up to 18 hours battery life.",
  useCase: "Great for gamers who want a lightweight, portable headset that works across PC, console, and mobile.",
  performanceNotes: "Dual wireless modes let you connect to a PC via Lightspeed while staying paired to a phone via Bluetooth simultaneously.",
  qualityNotes: "Genuine Logitech product with 1-year manufacturer warranty.",
  features: ["Dual wireless (BT + 2.4GHz)", "Ultra-lightweight 18g", "Dual beamforming mics", "18-hour battery life"],
  boxContents: ["Headset", "USB-C charging cable", "2.4GHz USB dongle", "Documentation"], compatibility: ["PC", "PS5", "Nintendo Switch", "Mobile (Bluetooth)"],
  upgradeOptions: ["Add a headset stand"], recommendedAccessories: ["Headset Stand", "Gaming Mouse"],
  seo: { slug: "logitech-g435-lightspeed", keywords: ["logitech g435", "wireless gaming headset", "lightweight headset"], metaTitle: "Logitech G435 Lightspeed Headset | DESKTO", metaDescription: "Buy Logitech G435 Lightspeed wireless gaming headset at DESKTO with warranty.", tags: ["logitech g435", "wireless gaming headset", "lightweight headset"] },
});

const STEELSERIES_ARCTIS_NOVA5_PRODUCT = draftCatalogProduct({
  id: 104, name: "SteelSeries Arctis Nova 5", category: "headset", brand: "SteelSeries", model: "Arctis Nova 5",
  sku: "STEELSERIES-ARCTIS-NOVA5", price: 10990, orig: 12490, stock: 10,
  specs: ["40mm Neodymium Drivers", "Hi-Res Audio Certified", "Active Noise Cancelling Mic", "Wireless 2.4GHz + Bluetooth", "Up to 60 hours battery life"],
  ports: "2.4GHz USB-C dongle + Bluetooth 5.3", weight: "310 g",
  description: "The SteelSeries Arctis Nova 5 is a Hi-Res certified wireless headset with active noise-cancelling microphone and multi-platform dual wireless connectivity.",
  technicalDetails: "40mm neodymium drivers with Hi-Res Audio certification, active noise-cancelling microphone, dual wireless via 2.4GHz USB-C dongle and Bluetooth 5.3, up to 60 hours battery life.",
  useCase: "Suited for gamers and streamers who want premium audio quality and long battery life across multiple devices.",
  performanceNotes: "Hi-Res Audio certification delivers noticeably richer detail compared to standard gaming headsets.",
  qualityNotes: "Genuine SteelSeries product with 2-year manufacturer warranty.",
  features: ["Hi-Res Audio certified", "ClearCast Gen 2 noise-cancelling mic", "Dual wireless (2.4GHz + BT)", "60-hour battery life"],
  boxContents: ["Headset", "USB-C dongle", "USB-C charging cable", "Documentation"], compatibility: ["PC", "PS5", "Xbox", "Mobile (Bluetooth)"],
  upgradeOptions: ["Add a headset stand"], recommendedAccessories: ["Headset Stand", "Gaming Mouse"],
  seo: { slug: "steelseries-arctis-nova-5", keywords: ["steelseries arctis nova 5", "wireless gaming headset", "hi-res headset"], metaTitle: "SteelSeries Arctis Nova 5 Headset | DESKTO", metaDescription: "Buy SteelSeries Arctis Nova 5 wireless gaming headset at DESKTO with warranty.", tags: ["steelseries arctis nova 5", "wireless gaming headset", "hi-res headset"] },
  warrantyMonths: 24,
});

const RAZER_BLACKSHARK_V2_PRODUCT = draftCatalogProduct({
  id: 105, name: "Razer BlackShark V2", category: "headset", brand: "Razer", model: "BlackShark V2",
  sku: "RAZER-BLACKSHARK-V2", price: 7990, orig: 8990, stock: 9,
  specs: ["50mm Titanium Drivers", "THX Spatial Audio", "Detachable Noise-Cancelling Mic", "Memory Foam Ear Cushions", "Wired 3.5mm / USB"],
  ports: "Wired 3.5mm + USB sound card adapter", weight: "262 g",
  description: "The Razer BlackShark V2 is an esports-focused headset with THX Spatial Audio and titanium drivers tuned for precise positional sound.",
  technicalDetails: "50mm Titanium drivers, THX Spatial Audio via USB sound card, detachable noise-cancelling microphone, memory foam ear cushions, wired connection.",
  useCase: "Built for competitive esports players who rely on precise positional audio cues.",
  performanceNotes: "THX Spatial Audio and titanium-coated drivers deliver sharp, accurate directional sound for competitive play.",
  qualityNotes: "Genuine Razer product with 2-year manufacturer warranty.",
  features: ["THX Spatial Audio", "Titanium-coated 50mm drivers", "Detachable noise-cancelling mic", "Memory foam cushions"],
  boxContents: ["Headset", "USB sound card adapter", "Detachable microphone", "Documentation"], compatibility: ["PC", "PS5", "Xbox", "Mobile (3.5mm)"],
  upgradeOptions: ["Add a headset stand"], recommendedAccessories: ["Headset Stand", "Gaming Mouse"],
  seo: { slug: "razer-blackshark-v2", keywords: ["razer blackshark v2", "esports headset", "thx spatial audio headset"], metaTitle: "Razer BlackShark V2 Headset | DESKTO", metaDescription: "Buy Razer BlackShark V2 esports gaming headset at DESKTO with warranty.", tags: ["razer blackshark v2", "esports headset", "thx spatial audio headset"] },
  warrantyMonths: 24,
});

const CORSAIR_HS55_PRODUCT = draftCatalogProduct({
  id: 106, name: "Corsair HS55 Stereo", category: "headset", brand: "Corsair", model: "HS55 Stereo",
  sku: "CORS-HS55-STEREO", price: 4490, orig: 5190, stock: 14,
  specs: ["50mm Neodymium Drivers", "Memory Foam Ear Cushions", "Detachable Omni-Directional Mic", "Lightweight Aluminum Frame", "Wired 3.5mm Connection"],
  ports: "Wired 3.5mm connection", weight: "319 g",
  description: "The Corsair HS55 Stereo is a comfortable, multi-platform wired headset with a durable aluminum frame and memory foam cushions.",
  technicalDetails: "50mm neodymium drivers, detachable omni-directional broadcast microphone, memory foam ear cushions, lightweight aluminum frame, wired 3.5mm connection.",
  useCase: "A dependable everyday headset for gaming and calls across PC, console, and mobile via 3.5mm.",
  performanceNotes: "Balanced sound signature with clear mids and detailed highs suited for both gaming and music.",
  qualityNotes: "Genuine Corsair product with 2-year manufacturer warranty.",
  features: ["Aluminum frame construction", "Detachable broadcast mic", "Memory foam cushions", "Multi-platform 3.5mm compatibility"],
  boxContents: ["Headset", "Detachable microphone", "Documentation"], compatibility: ["PC", "PS5", "Xbox", "Mobile (3.5mm)"],
  upgradeOptions: ["Add a headset stand"], recommendedAccessories: ["Headset Stand", "Gaming Mouse"],
  seo: { slug: "corsair-hs55-stereo", keywords: ["corsair hs55", "wired gaming headset", "budget headset"], metaTitle: "Corsair HS55 Stereo Headset | DESKTO", metaDescription: "Buy Corsair HS55 Stereo wired gaming headset at DESKTO with warranty.", tags: ["corsair hs55", "wired gaming headset", "budget headset"] },
  warrantyMonths: 24,
});

// ── Routers ──
const TPLINK_ARCHER_C6_PRODUCT = draftCatalogProduct({
  id: 107, name: "TP-Link Archer C6", category: "router", brand: "TP-Link", model: "Archer C6",
  sku: "TPLINK-ARCHER-C6", price: 2190, orig: 2590, stock: 20,
  specs: ["AC1200 Dual-Band WiFi", "4x Gigabit LAN Ports", "4 External Antennas", "MU-MIMO Support", "Beamforming Technology"],
  ports: "4x Gigabit LAN, 1x Gigabit WAN", powerRequirement: "12V DC power adapter",
  description: "The TP-Link Archer C6 is an affordable AC1200 dual-band router offering reliable Gigabit wired and wireless connectivity for home networks.",
  technicalDetails: "AC1200 dual-band (300+867 Mbps), 4x Gigabit LAN ports, 4 external antennas, MU-MIMO support, beamforming technology, TP-Link Tether app management.",
  useCase: "Suited for home networks needing dependable dual-band WiFi and Gigabit wired connections on a budget.",
  performanceNotes: "Beamforming technology focuses signal strength toward connected devices for more consistent coverage.",
  qualityNotes: "Genuine TP-Link product with 2-year manufacturer warranty.",
  features: ["Dual-band AC1200", "Gigabit LAN ports", "MU-MIMO support", "TP-Link Tether app"],
  boxContents: ["Router", "Power adapter", "Ethernet cable", "Documentation"], compatibility: ["Broadband/fiber modems", "2.4GHz & 5GHz devices"],
  upgradeOptions: ["Add a WiFi extender for larger homes"], recommendedAccessories: ["WiFi Extender", "Ethernet Cable"],
  seo: { slug: "tp-link-archer-c6", keywords: ["tp-link archer c6", "dual-band router", "budget router"], metaTitle: "TP-Link Archer C6 Router | DESKTO", metaDescription: "Buy TP-Link Archer C6 AC1200 dual-band router at DESKTO with warranty.", tags: ["tp-link archer c6", "dual-band router", "budget router"] },
  warrantyMonths: 24,
});

const ASUS_RT_AX58U_PRODUCT = draftCatalogProduct({
  id: 108, name: "ASUS RT-AX58U", category: "router", brand: "ASUS", model: "RT-AX58U",
  sku: "ASUS-RT-AX58U", price: 6990, orig: 7990, stock: 12,
  specs: ["AX3000 WiFi 6 Dual-Band", "4x Gigabit LAN Ports", "OFDMA & MU-MIMO", "AiProtection Security", "ASUS Router App"],
  ports: "4x Gigabit LAN, 1x Gigabit WAN, 1x USB 3.2", powerRequirement: "19V DC power adapter",
  description: "The ASUS RT-AX58U is a WiFi 6 router delivering faster speeds and better multi-device performance with built-in AiProtection security.",
  technicalDetails: "AX3000 WiFi 6 dual-band (574+2402 Mbps), 4x Gigabit LAN ports, OFDMA and MU-MIMO for efficient multi-device handling, AiProtection Pro security, USB 3.2 port.",
  useCase: "Great for modern homes with many connected devices wanting WiFi 6 speed and built-in network security.",
  performanceNotes: "WiFi 6 OFDMA technology significantly improves performance in congested, multi-device households.",
  qualityNotes: "Genuine ASUS product with 2-year manufacturer warranty.",
  features: ["WiFi 6 (802.11ax)", "AiProtection Pro security", "USB 3.2 port for network storage", "ASUS Router app management"],
  boxContents: ["Router", "Power adapter", "Ethernet cable", "Documentation"], compatibility: ["Broadband/fiber modems", "WiFi 6 & legacy devices"],
  upgradeOptions: ["Add AiMesh nodes for whole-home coverage"], recommendedAccessories: ["AiMesh Node", "Ethernet Cable"],
  seo: { slug: "asus-rt-ax58u", keywords: ["asus rt-ax58u", "wifi 6 router", "ax3000 router"], metaTitle: "ASUS RT-AX58U WiFi 6 Router | DESKTO", metaDescription: "Buy ASUS RT-AX58U AX3000 WiFi 6 router at DESKTO with warranty.", tags: ["asus rt-ax58u", "wifi 6 router", "ax3000 router"] },
  warrantyMonths: 24,
});

const DLINK_DIRX1560_PRODUCT = draftCatalogProduct({
  id: 109, name: "D-Link DIR-X1560", category: "router", brand: "D-Link", model: "DIR-X1560",
  sku: "DLINK-DIRX1560", price: 3990, orig: 4590, stock: 14,
  specs: ["AX1500 WiFi 6 Dual-Band", "4x Gigabit LAN Ports", "OFDMA Support", "Voice Assistant Compatible", "D-Link Wi-Fi App"],
  ports: "4x Gigabit LAN, 1x Gigabit WAN", powerRequirement: "12V DC power adapter",
  description: "The D-Link DIR-X1560 brings entry-level WiFi 6 performance and Gigabit wired ports to budget-conscious home networks.",
  technicalDetails: "AX1500 WiFi 6 dual-band (300+1201 Mbps), 4x Gigabit LAN ports, OFDMA support, voice assistant compatibility, D-Link Wi-Fi app management.",
  useCase: "A cost-effective entry point into WiFi 6 for small-to-medium homes.",
  performanceNotes: "OFDMA support improves efficiency when multiple devices are connected simultaneously.",
  qualityNotes: "Genuine D-Link product with 2-year manufacturer warranty.",
  features: ["WiFi 6 (802.11ax)", "Gigabit LAN ports", "Voice assistant compatible", "D-Link Wi-Fi app"],
  boxContents: ["Router", "Power adapter", "Ethernet cable", "Documentation"], compatibility: ["Broadband/fiber modems", "WiFi 6 & legacy devices"],
  upgradeOptions: ["Add a WiFi extender for larger homes"], recommendedAccessories: ["WiFi Extender", "Ethernet Cable"],
  seo: { slug: "d-link-dir-x1560", keywords: ["d-link dir-x1560", "wifi 6 router", "budget wifi 6 router"], metaTitle: "D-Link DIR-X1560 WiFi 6 Router | DESKTO", metaDescription: "Buy D-Link DIR-X1560 AX1500 WiFi 6 router at DESKTO with warranty.", tags: ["d-link dir-x1560", "wifi 6 router", "budget wifi 6 router"] },
  warrantyMonths: 24,
});

const NETGEAR_NIGHTHAWK_AX4_PRODUCT = draftCatalogProduct({
  id: 110, name: "Netgear Nighthawk AX4", category: "router", brand: "Netgear", model: "Nighthawk AX4 (RAX20)",
  sku: "NETGEAR-NIGHTHAWK-AX4", price: 5490, orig: 6290, stock: 11,
  specs: ["AX1800 WiFi 6 Dual-Band", "4x Gigabit LAN Ports", "MU-MIMO & OFDMA", "Netgear Armor Security Ready", "Nighthawk App"],
  ports: "4x Gigabit LAN, 1x Gigabit WAN, 1x USB 3.0", powerRequirement: "12V DC power adapter",
  description: "The Netgear Nighthawk AX4 delivers solid WiFi 6 speeds and coverage for mid-size homes with an easy-to-use Nighthawk app.",
  technicalDetails: "AX1800 WiFi 6 dual-band (600+1201 Mbps), 4x Gigabit LAN ports, MU-MIMO and OFDMA support, USB 3.0 port, Netgear Armor security subscription ready.",
  useCase: "A solid mid-range router for households wanting reliable WiFi 6 coverage and simple app-based setup.",
  performanceNotes: "MU-MIMO and OFDMA together improve simultaneous streaming and gaming performance across multiple devices.",
  qualityNotes: "Genuine Netgear product with 2-year manufacturer warranty.",
  features: ["WiFi 6 (802.11ax)", "USB 3.0 port", "Netgear Armor security ready", "Nighthawk app management"],
  boxContents: ["Router", "Power adapter", "Ethernet cable", "Documentation"], compatibility: ["Broadband/fiber modems", "WiFi 6 & legacy devices"],
  upgradeOptions: ["Subscribe to Netgear Armor for advanced security"], recommendedAccessories: ["Ethernet Cable", "WiFi Extender"],
  seo: { slug: "netgear-nighthawk-ax4", keywords: ["netgear nighthawk ax4", "wifi 6 router", "ax1800 router"], metaTitle: "Netgear Nighthawk AX4 Router | DESKTO", metaDescription: "Buy Netgear Nighthawk AX4 WiFi 6 router at DESKTO with warranty.", tags: ["netgear nighthawk ax4", "wifi 6 router", "ax1800 router"] },
  warrantyMonths: 24,
});

const TENDA_AC10_PRODUCT = draftCatalogProduct({
  id: 111, name: "Tenda AC10", category: "router", brand: "Tenda", model: "AC10",
  sku: "TENDA-AC10", price: 1890, orig: 2190, stock: 18,
  specs: ["AC1200 Dual-Band WiFi", "4x Gigabit LAN Ports", "4 High-Gain Antennas", "Beamforming+ Technology", "Tenda WiFi App"],
  ports: "4x Gigabit LAN, 1x Gigabit WAN", powerRequirement: "12V DC power adapter",
  description: "The Tenda AC10 is a budget dual-band router with Gigabit ports, offering solid coverage for small home networks.",
  technicalDetails: "AC1200 dual-band (300+867 Mbps), 4x Gigabit LAN ports, 4 high-gain external antennas, Beamforming+ technology, Tenda WiFi app management.",
  useCase: "A practical, affordable choice for small homes needing basic dual-band WiFi with Gigabit wired ports.",
  performanceNotes: "High-gain antennas and Beamforming+ improve signal reach in small-to-medium apartments.",
  qualityNotes: "Genuine Tenda product with 2-year manufacturer warranty.",
  features: ["Dual-band AC1200", "Gigabit LAN ports", "4 high-gain antennas", "Tenda WiFi app"],
  boxContents: ["Router", "Power adapter", "Ethernet cable", "Documentation"], compatibility: ["Broadband/fiber modems", "2.4GHz & 5GHz devices"],
  upgradeOptions: ["Add a WiFi extender for larger homes"], recommendedAccessories: ["WiFi Extender", "Ethernet Cable"],
  seo: { slug: "tenda-ac10", keywords: ["tenda ac10", "budget router", "dual-band router"], metaTitle: "Tenda AC10 Router | DESKTO", metaDescription: "Buy Tenda AC10 AC1200 dual-band router at DESKTO with warranty.", tags: ["tenda ac10", "budget router", "dual-band router"] },
  warrantyMonths: 24,
});

// ── UPS ──
const APC_BX600C_PRODUCT = draftCatalogProduct({
  id: 112, name: "APC BX600C-IN", category: "ups", brand: "APC", model: "BX600C-IN",
  sku: "APC-BX600C-IN", price: 3290, orig: 3790, stock: 16,
  specs: ["600VA / 360W Capacity", "Line Interactive Topology", "4x Battery Backup Outlets", "Automatic Voltage Regulation", "USB Charging Port"],
  powerRequirement: "600VA / 360W output capacity",
  description: "The APC BX600C-IN is a compact line-interactive UPS providing reliable backup power and surge protection for home PCs and networking gear.",
  technicalDetails: "600VA/360W capacity, line-interactive topology, 4 battery backup outlets, automatic voltage regulation (AVR), USB charging port, LED status indicators.",
  useCase: "Ideal for protecting a home PC, monitor, and router/modem from power cuts and voltage fluctuations.",
  performanceNotes: "Automatic voltage regulation corrects minor fluctuations without switching to battery, extending battery life.",
  qualityNotes: "Genuine APC (Schneider Electric) product with 2-year manufacturer warranty.",
  features: ["Automatic voltage regulation", "4 backup outlets", "USB charging port", "LED status indicators"],
  boxContents: ["UPS unit", "Power cord", "USB cable (for monitoring)", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "PC, monitor, router loads"],
  upgradeOptions: ["Upgrade to higher VA rating for more connected devices"], recommendedAccessories: ["Surge Protector", "Extension Cord"],
  seo: { slug: "apc-bx600c-in", keywords: ["apc bx600c", "home ups", "600va ups"], metaTitle: "APC BX600C-IN UPS | DESKTO", metaDescription: "Buy APC BX600C-IN 600VA line-interactive UPS at DESKTO with warranty.", tags: ["apc bx600c", "home ups", "600va ups"] },
  warrantyMonths: 24,
});

const MICROTEK_LEGEND1000_PRODUCT = draftCatalogProduct({
  id: 113, name: "Microtek Legend 1000VA", category: "ups", brand: "Microtek", model: "Legend 1000",
  sku: "MICROTEK-LEGEND-1000", price: 3990, orig: 4590, stock: 14,
  specs: ["1000VA / 600W Capacity", "Line Interactive Topology", "Cold Start Function", "Overload & Short-Circuit Protection", "LED Indicators"],
  powerRequirement: "1000VA / 600W output capacity",
  description: "The Microtek Legend 1000VA is a widely trusted home UPS offering dependable backup power for PCs and essential home electronics.",
  technicalDetails: "1000VA/600W capacity, line-interactive topology, cold start function, overload and short-circuit protection, LED status indicators, intelligent battery management.",
  useCase: "A popular choice for Indian homes needing reliable backup during frequent power cuts.",
  performanceNotes: "Intelligent battery management extends battery lifespan through optimized charging cycles.",
  qualityNotes: "Genuine Microtek product with 2-year manufacturer warranty.",
  features: ["Cold start function", "Overload protection", "Intelligent battery management", "LED status indicators"],
  boxContents: ["UPS unit", "Power cord", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "PC and home electronics loads"],
  upgradeOptions: ["Add external battery for extended backup time"], recommendedAccessories: ["Surge Protector", "External Battery"],
  seo: { slug: "microtek-legend-1000", keywords: ["microtek legend 1000", "home ups", "1000va ups"], metaTitle: "Microtek Legend 1000VA UPS | DESKTO", metaDescription: "Buy Microtek Legend 1000VA UPS at DESKTO with warranty.", tags: ["microtek legend 1000", "home ups", "1000va ups"] },
  warrantyMonths: 24,
});

const CYBERPOWER_UT1500E_PRODUCT = draftCatalogProduct({
  id: 114, name: "CyberPower UT1500E", category: "ups", brand: "CyberPower", model: "UT1500E",
  sku: "CYBERPOWER-UT1500E", price: 6490, orig: 7290, stock: 10,
  specs: ["1500VA / 900W Capacity", "Line Interactive Topology", "6x Battery Backup Outlets", "Automatic Voltage Regulation", "LCD Status Display"],
  powerRequirement: "1500VA / 900W output capacity",
  description: "The CyberPower UT1500E offers higher-capacity backup power with an LCD status display, suited for multi-device home office setups.",
  technicalDetails: "1500VA/900W capacity, line-interactive topology, 6 battery backup outlets, automatic voltage regulation, LCD status display, GreenPower UPS energy-saving design.",
  useCase: "Well suited for home office setups running a PC, monitor, router, and other peripherals simultaneously.",
  performanceNotes: "Higher 900W capacity provides longer runtime for multiple connected devices during outages.",
  qualityNotes: "Genuine CyberPower product with 2-year manufacturer warranty.",
  features: ["LCD status display", "6 backup outlets", "Automatic voltage regulation", "GreenPower energy-saving design"],
  boxContents: ["UPS unit", "Power cord", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "Home office multi-device loads"],
  upgradeOptions: ["Add external battery for extended backup time"], recommendedAccessories: ["Surge Protector", "External Battery"],
  seo: { slug: "cyberpower-ut1500e", keywords: ["cyberpower ut1500e", "home office ups", "1500va ups"], metaTitle: "CyberPower UT1500E UPS | DESKTO", metaDescription: "Buy CyberPower UT1500E 1500VA UPS at DESKTO with warranty.", tags: ["cyberpower ut1500e", "home office ups", "1500va ups"] },
  warrantyMonths: 24,
});

const EATON_5E_1100VA_PRODUCT = draftCatalogProduct({
  id: 115, name: "Eaton 5E 1100VA", category: "ups", brand: "Eaton", model: "5E 1100VA",
  sku: "EATON-5E-1100VA", price: 4990, orig: 5690, stock: 12,
  specs: ["1100VA / 660W Capacity", "Line Interactive Topology", "4x Battery Backup Outlets", "Automatic Voltage Regulation", "Audible Alarms"],
  powerRequirement: "1100VA / 660W output capacity",
  description: "The Eaton 5E 1100VA is a reliable line-interactive UPS from a leading power management brand, built for consistent home and small-office backup power.",
  technicalDetails: "1100VA/660W capacity, line-interactive topology, 4 battery backup outlets, automatic voltage regulation, audible alarms, cold-start capability.",
  useCase: "Good for small offices and home setups needing trusted, industrial-grade power protection.",
  performanceNotes: "Automatic voltage regulation and reliable switchover protect connected equipment from power fluctuations.",
  qualityNotes: "Genuine Eaton product with 2-year manufacturer warranty.",
  features: ["Automatic voltage regulation", "Audible alarms", "Cold-start capability", "4 backup outlets"],
  boxContents: ["UPS unit", "Power cord", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "PC and small office loads"],
  upgradeOptions: ["Add external battery for extended backup time"], recommendedAccessories: ["Surge Protector", "External Battery"],
  seo: { slug: "eaton-5e-1100va", keywords: ["eaton 5e 1100va", "home ups", "line interactive ups"], metaTitle: "Eaton 5E 1100VA UPS | DESKTO", metaDescription: "Buy Eaton 5E 1100VA UPS at DESKTO with warranty.", tags: ["eaton 5e 1100va", "home ups", "line interactive ups"] },
  warrantyMonths: 24,
});

const ZEBRONICS_ZEBU725_PRODUCT = draftCatalogProduct({
  id: 116, name: "Zebronics Zeb-U725", category: "ups", brand: "Zebronics", model: "Zeb-U725",
  sku: "ZEBRONICS-ZEBU725", price: 1990, orig: 2290, stock: 20,
  specs: ["600VA / 360W Capacity", "Offline/Standby Topology", "2x Battery Backup Outlets", "Overload Protection", "LED Indicators"],
  powerRequirement: "600VA / 360W output capacity",
  description: "The Zebronics Zeb-U725 is a budget offline UPS providing basic backup power for a home PC during short outages.",
  technicalDetails: "600VA/360W capacity, offline/standby topology, 2 battery backup outlets, overload and short-circuit protection, LED status indicators.",
  useCase: "A cost-effective option for protecting a single PC from short power interruptions.",
  performanceNotes: "Offline topology provides basic protection suited for short outages and minor voltage dips.",
  qualityNotes: "Genuine Zebronics product with 1-year manufacturer warranty.",
  features: ["Overload protection", "LED status indicators", "Compact design", "Budget-friendly"],
  boxContents: ["UPS unit", "Power cord", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "Single PC loads"],
  upgradeOptions: ["Upgrade to a line-interactive UPS for better voltage regulation"], recommendedAccessories: ["Surge Protector"],
  seo: { slug: "zebronics-zeb-u725", keywords: ["zebronics zeb-u725", "budget ups", "offline ups"], metaTitle: "Zebronics Zeb-U725 UPS | DESKTO", metaDescription: "Buy Zebronics Zeb-U725 600VA offline UPS at DESKTO with warranty.", tags: ["zebronics zeb-u725", "budget ups", "offline ups"] },
});

// ── Printers ──
const HP_SMARTTANK_580_PRODUCT = draftCatalogProduct({
  id: 117, name: "HP Smart Tank 580", category: "printer", brand: "HP", model: "Smart Tank 580",
  sku: "HP-SMARTTANK-580", price: 15990, orig: 17990, stock: 8,
  specs: ["Print, Scan, Copy (All-in-One)", "Wireless & Wi-Fi Direct", "Ink Tank System", "Up to 12 ppm (black)", "USB Connectivity"],
  ports: "USB 2.0, Wi-Fi 802.11 b/g/n",
  description: "The HP Smart Tank 580 is a wireless all-in-one ink tank printer offering low running costs for high-volume home and small-office printing.",
  technicalDetails: "Print/scan/copy all-in-one, refillable ink tank system, wireless and Wi-Fi Direct connectivity, up to 12 ppm black / 5 ppm color print speed, HP Smart app support.",
  useCase: "Great for households and small offices with high print volumes wanting low per-page ink costs.",
  performanceNotes: "Ink tank system dramatically reduces cost per page compared to traditional cartridge printers.",
  qualityNotes: "Genuine HP product with 1-year manufacturer warranty.",
  features: ["Refillable ink tank system", "Wireless & Wi-Fi Direct", "HP Smart app support", "All-in-one print/scan/copy"],
  boxContents: ["Printer", "Ink bottles (initial fill)", "Power cable", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "Mobile printing (HP Smart app)"],
  upgradeOptions: ["Add extra ink bottle refills"], recommendedAccessories: ["Extra Ink Bottles", "A4 Paper Ream"],
  seo: { slug: "hp-smart-tank-580", keywords: ["hp smart tank 580", "ink tank printer", "wireless printer"], metaTitle: "HP Smart Tank 580 Printer | DESKTO", metaDescription: "Buy HP Smart Tank 580 wireless all-in-one ink tank printer at DESKTO with warranty.", tags: ["hp smart tank 580", "ink tank printer", "wireless printer"] },
});

const CANON_PIXMA_G3770_PRODUCT = draftCatalogProduct({
  id: 118, name: "Canon PIXMA G3770", category: "printer", brand: "Canon", model: "PIXMA G3770",
  sku: "CANON-PIXMA-G3770", price: 14490, orig: 16490, stock: 9,
  specs: ["Print, Scan, Copy (All-in-One)", "Wireless & Wi-Fi Direct", "MegaTank Ink System", "Up to 11 ipm (black)", "USB Connectivity"],
  ports: "USB 2.0, Wi-Fi 802.11 b/g/n",
  description: "The Canon PIXMA G3770 is a wireless MegaTank all-in-one printer designed for high-volume, low-cost home and small-office printing.",
  technicalDetails: "Print/scan/copy all-in-one, Canon MegaTank refillable ink system, wireless and Wi-Fi Direct connectivity, up to 11 ipm black / 6 ipm color print speed, Canon PRINT app support.",
  useCase: "Suited for homes and small offices needing frequent, cost-efficient printing.",
  performanceNotes: "MegaTank ink bottles can print thousands of pages before needing a refill, minimizing running costs.",
  qualityNotes: "Genuine Canon product with 1-year manufacturer warranty.",
  features: ["MegaTank refillable ink system", "Wireless & Wi-Fi Direct", "Canon PRINT app support", "All-in-one print/scan/copy"],
  boxContents: ["Printer", "Ink bottles (initial fill)", "Power cable", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "Mobile printing (Canon PRINT app)"],
  upgradeOptions: ["Add extra ink bottle refills"], recommendedAccessories: ["Extra Ink Bottles", "A4 Paper Ream"],
  seo: { slug: "canon-pixma-g3770", keywords: ["canon pixma g3770", "megatank printer", "wireless printer"], metaTitle: "Canon PIXMA G3770 Printer | DESKTO", metaDescription: "Buy Canon PIXMA G3770 wireless MegaTank all-in-one printer at DESKTO with warranty.", tags: ["canon pixma g3770", "megatank printer", "wireless printer"] },
});

const EPSON_ECOTANK_L3250_PRODUCT = draftCatalogProduct({
  id: 119, name: "Epson EcoTank L3250", category: "printer", brand: "Epson", model: "EcoTank L3250",
  sku: "EPSON-ECOTANK-L3250", price: 15490, orig: 17490, stock: 8,
  specs: ["Print, Scan, Copy (All-in-One)", "Wireless & Wi-Fi Direct", "EcoTank Ink System", "Up to 33 ppm (black draft)", "USB Connectivity"],
  ports: "USB 2.0, Wi-Fi 802.11 b/g/n",
  description: "The Epson EcoTank L3250 is a compact wireless all-in-one printer with Epson's EcoTank refillable ink system for economical everyday printing.",
  technicalDetails: "Print/scan/copy all-in-one, Epson EcoTank refillable ink system, wireless and Wi-Fi Direct connectivity, up to 33 ppm black draft print speed, Epson Smart Panel app support.",
  useCase: "A great fit for home and student use where frequent printing at low cost matters most.",
  performanceNotes: "EcoTank ink system offers one of the lowest cost-per-page ratios among home printers.",
  qualityNotes: "Genuine Epson product with 1-year manufacturer warranty.",
  features: ["EcoTank refillable ink system", "Wireless & Wi-Fi Direct", "Epson Smart Panel app support", "Compact all-in-one design"],
  boxContents: ["Printer", "Ink bottles (initial fill)", "Power cable", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "Mobile printing (Epson Smart Panel)"],
  upgradeOptions: ["Add extra ink bottle refills"], recommendedAccessories: ["Extra Ink Bottles", "A4 Paper Ream"],
  seo: { slug: "epson-ecotank-l3250", keywords: ["epson ecotank l3250", "ink tank printer", "wireless printer"], metaTitle: "Epson EcoTank L3250 Printer | DESKTO", metaDescription: "Buy Epson EcoTank L3250 wireless all-in-one ink tank printer at DESKTO with warranty.", tags: ["epson ecotank l3250", "ink tank printer", "wireless printer"] },
});

const BROTHER_DCPB7500D_PRODUCT = draftCatalogProduct({
  id: 120, name: "Brother DCP-B7500D", category: "printer", brand: "Brother", model: "DCP-B7500D",
  sku: "BROTHER-DCPB7500D", price: 16990, orig: 18990, stock: 6,
  specs: ["Monochrome Laser All-in-One", "Auto Duplex Printing", "Print, Scan, Copy", "Up to 34 ppm", "USB & Network Connectivity"],
  ports: "USB 2.0, Ethernet LAN",
  description: "The Brother DCP-B7500D is a fast monochrome laser all-in-one with automatic duplex printing, ideal for busy home offices.",
  technicalDetails: "Monochrome laser print/scan/copy all-in-one, automatic duplex printing, up to 34 ppm print speed, USB and Ethernet network connectivity, high-yield toner support.",
  useCase: "Well suited for home offices and small businesses with high-volume document printing needs.",
  performanceNotes: "Laser printing delivers crisp text output at high speed with lower per-page cost than inkjet for text documents.",
  qualityNotes: "Genuine Brother product with 1-year manufacturer warranty.",
  features: ["Automatic duplex printing", "Fast 34 ppm laser engine", "Network (Ethernet) connectivity", "High-yield toner compatible"],
  boxContents: ["Printer", "Starter toner cartridge", "Power cable", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "Network printing"],
  upgradeOptions: ["Add high-yield replacement toner"], recommendedAccessories: ["Replacement Toner Cartridge", "A4 Paper Ream"],
  seo: { slug: "brother-dcp-b7500d", keywords: ["brother dcp-b7500d", "laser printer", "duplex printer"], metaTitle: "Brother DCP-B7500D Laser Printer | DESKTO", metaDescription: "Buy Brother DCP-B7500D monochrome laser all-in-one printer at DESKTO with warranty.", tags: ["brother dcp-b7500d", "laser printer", "duplex printer"] },
});

const PANTUM_P2509W_PRODUCT = draftCatalogProduct({
  id: 121, name: "Pantum P2509W", category: "printer", brand: "Pantum", model: "P2509W",
  sku: "PANTUM-P2509W", price: 8990, orig: 9990, stock: 12,
  specs: ["Monochrome Laser Printer", "Wireless & USB Connectivity", "Up to 22 ppm", "150-Sheet Paper Tray", "Compact Design"],
  ports: "USB 2.0, Wi-Fi 802.11 b/g/n",
  description: "The Pantum P2509W is an affordable wireless monochrome laser printer, well suited for budget home and small-office document printing.",
  technicalDetails: "Monochrome laser printing, wireless and USB connectivity, up to 22 ppm print speed, 150-sheet input tray, compact footprint.",
  useCase: "A budget-friendly choice for home and small-office users needing simple, reliable document printing.",
  performanceNotes: "Laser printing delivers sharp text output well suited for documents and forms.",
  qualityNotes: "Genuine Pantum product with 1-year manufacturer warranty.",
  features: ["Wireless printing", "Compact laser design", "150-sheet paper tray", "Low-cost toner cartridges"],
  boxContents: ["Printer", "Starter toner cartridge", "Power cable", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "Wireless printing"],
  upgradeOptions: ["Add replacement toner cartridge"], recommendedAccessories: ["Replacement Toner Cartridge", "A4 Paper Ream"],
  seo: { slug: "pantum-p2509w", keywords: ["pantum p2509w", "budget laser printer", "wireless laser printer"], metaTitle: "Pantum P2509W Laser Printer | DESKTO", metaDescription: "Buy Pantum P2509W wireless monochrome laser printer at DESKTO with warranty.", tags: ["pantum p2509w", "budget laser printer", "wireless laser printer"] },
});

// ── Scanners ──
const CANON_CANOSCAN_LIDE400_PRODUCT = draftCatalogProduct({
  id: 122, name: "Canon CanoScan LiDE 400", category: "scanner", brand: "Canon", model: "CanoScan LiDE 400",
  sku: "CANON-CANOSCAN-LIDE400", price: 6990, orig: 7990, stock: 10,
  specs: ["Flatbed Scanner", "4800 x 4800 dpi Optical Resolution", "USB-Powered (No Adapter Needed)", "A4 Document & Photo Scanning", "Compact Slim Design"],
  ports: "USB-C (bus-powered, no external adapter needed)",
  description: "The Canon CanoScan LiDE 400 is a slim, USB-powered flatbed scanner delivering high-resolution scans for documents and photos.",
  technicalDetails: "Flatbed scanner, 4800 x 4800 dpi optical resolution, USB bus-powered (no separate power adapter needed), A4 scan bed, Canon IJ Scan Utility software.",
  useCase: "Great for home users and small offices needing occasional high-quality document and photo scanning.",
  performanceNotes: "High optical resolution captures fine detail suitable for archiving photos and important documents.",
  qualityNotes: "Genuine Canon product with 1-year manufacturer warranty.",
  features: ["USB bus-powered", "4800 dpi optical resolution", "Slim, compact design", "Canon IJ Scan Utility software"],
  boxContents: ["Scanner", "USB-C cable", "Documentation"], compatibility: ["Windows", "macOS", "USB-C port"],
  upgradeOptions: ["Pair with document management software"], recommendedAccessories: ["USB-C Extension Cable"],
  seo: { slug: "canon-canoscan-lide-400", keywords: ["canon canoscan lide 400", "flatbed scanner", "photo scanner"], metaTitle: "Canon CanoScan LiDE 400 Scanner | DESKTO", metaDescription: "Buy Canon CanoScan LiDE 400 flatbed scanner at DESKTO with warranty.", tags: ["canon canoscan lide 400", "flatbed scanner", "photo scanner"] },
});

const EPSON_PERFECTION_V39II_PRODUCT = draftCatalogProduct({
  id: 123, name: "Epson Perfection V39 II", category: "scanner", brand: "Epson", model: "Perfection V39 II",
  sku: "EPSON-PERFECTION-V39II", price: 9990, orig: 11290, stock: 8,
  specs: ["Flatbed Photo Scanner", "4800 x 4800 dpi Optical Resolution", "USB-Powered", "One-Touch Scan Buttons", "A4 Document & Photo Scanning"],
  ports: "USB 2.0 (bus-powered)",
  description: "The Epson Perfection V39 II is a compact photo-focused flatbed scanner with high optical resolution and convenient one-touch scan buttons.",
  technicalDetails: "Flatbed scanner, 4800 x 4800 dpi optical resolution, USB bus-powered, one-touch scan buttons for common tasks, Epson Scan software with restoration tools.",
  useCase: "Well suited for digitizing family photos, artwork, and documents at home.",
  performanceNotes: "High optical resolution and Epson's image restoration tools help revive faded or damaged photos during scanning.",
  qualityNotes: "Genuine Epson product with 1-year manufacturer warranty.",
  features: ["One-touch scan buttons", "4800 dpi optical resolution", "USB bus-powered", "Epson Scan restoration software"],
  boxContents: ["Scanner", "USB cable", "Documentation"], compatibility: ["Windows", "macOS", "USB port"],
  upgradeOptions: ["Pair with photo editing software"], recommendedAccessories: ["USB Extension Cable"],
  seo: { slug: "epson-perfection-v39-ii", keywords: ["epson perfection v39 ii", "photo scanner", "flatbed scanner"], metaTitle: "Epson Perfection V39 II Scanner | DESKTO", metaDescription: "Buy Epson Perfection V39 II flatbed photo scanner at DESKTO with warranty.", tags: ["epson perfection v39 ii", "photo scanner", "flatbed scanner"] },
});

const HP_SCANJET_PRO2600_PRODUCT = draftCatalogProduct({
  id: 124, name: "HP ScanJet Pro 2600 f1", category: "scanner", brand: "HP", model: "ScanJet Pro 2600 f1",
  sku: "HP-SCANJET-PRO2600", price: 18990, orig: 21290, stock: 6,
  specs: ["Flatbed + ADF Document Scanner", "1200 x 1200 dpi Optical Resolution", "Up to 25 ppm / 50 ipm Duplex", "USB Connectivity", "35-Sheet Auto Document Feeder"],
  ports: "USB 3.0",
  description: "The HP ScanJet Pro 2600 f1 is a fast flatbed-plus-ADF document scanner built for high-volume office scanning workflows.",
  technicalDetails: "Flatbed scanner with 35-sheet automatic document feeder, 1200 x 1200 dpi optical resolution, up to 25 ppm simplex / 50 ipm duplex scanning, USB 3.0 connectivity, HP Smart software.",
  useCase: "Built for offices needing to digitize large batches of documents quickly and reliably.",
  performanceNotes: "Auto document feeder with duplex scanning dramatically speeds up multi-page document digitization.",
  qualityNotes: "Genuine HP product with 1-year manufacturer warranty.",
  features: ["35-sheet auto document feeder", "Duplex scanning", "Fast USB 3.0 connectivity", "HP Smart software support"],
  boxContents: ["Scanner", "USB 3.0 cable", "Power cable", "Documentation"], compatibility: ["Windows", "macOS", "USB 3.0 port"],
  upgradeOptions: ["Pair with document management software"], recommendedAccessories: ["USB 3.0 Extension Cable"],
  seo: { slug: "hp-scanjet-pro-2600-f1", keywords: ["hp scanjet pro 2600", "document scanner", "adf scanner"], metaTitle: "HP ScanJet Pro 2600 f1 Scanner | DESKTO", metaDescription: "Buy HP ScanJet Pro 2600 f1 document scanner with ADF at DESKTO with warranty.", tags: ["hp scanjet pro 2600", "document scanner", "adf scanner"] },
});

const BROTHER_ADS1300_PRODUCT = draftCatalogProduct({
  id: 125, name: "Brother ADS-1300", category: "scanner", brand: "Brother", model: "ADS-1300",
  sku: "BROTHER-ADS1300", price: 15990, orig: 17990, stock: 7,
  specs: ["Compact Sheet-Fed Scanner", "600 x 600 dpi Optical Resolution", "Up to 30 ppm / 60 ipm Duplex", "20-Sheet Auto Document Feeder", "USB Connectivity"],
  ports: "USB 2.0",
  description: "The Brother ADS-1300 is a compact, portable sheet-fed document scanner designed for quick desktop digitization of documents and receipts.",
  technicalDetails: "Compact sheet-fed scanner, 600 x 600 dpi optical resolution, up to 30 ppm simplex / 60 ipm duplex scanning, 20-sheet automatic document feeder, USB connectivity.",
  useCase: "Ideal for home offices and small businesses needing a compact, fast desktop document scanner.",
  performanceNotes: "Fast duplex scanning and a compact footprint make it easy to keep on a desk for regular use.",
  qualityNotes: "Genuine Brother product with 1-year manufacturer warranty.",
  features: ["20-sheet auto document feeder", "Duplex scanning", "Compact portable design", "Brother iPrint&Scan app support"],
  boxContents: ["Scanner", "USB cable", "Power cable", "Documentation"], compatibility: ["Windows", "macOS", "USB port"],
  upgradeOptions: ["Pair with document management software"], recommendedAccessories: ["USB Extension Cable"],
  seo: { slug: "brother-ads-1300", keywords: ["brother ads-1300", "sheet-fed scanner", "document scanner"], metaTitle: "Brother ADS-1300 Scanner | DESKTO", metaDescription: "Buy Brother ADS-1300 compact sheet-fed document scanner at DESKTO with warranty.", tags: ["brother ads-1300", "sheet-fed scanner", "document scanner"] },
});

// ── HDDs ──
const SEAGATE_BARRACUDA_1TB_PRODUCT = draftCatalogProduct({
  id: 126, name: "Seagate Barracuda 1TB", category: "hdd", brand: "Seagate", model: "Barracuda 1TB",
  sku: "SEAGATE-BARRACUDA-1TB", price: 3290, orig: 3790, stock: 20,
  specs: ["1TB Capacity", "3.5-inch SATA III", "7200 RPM", "64MB Cache", "SATA 6Gb/s Interface"],
  storage: "1TB 3.5-inch SATA HDD, 7200 RPM, 64MB cache",
  description: "The Seagate Barracuda 1TB is a reliable, high-capacity SATA hard drive well suited for mass storage in desktop PCs.",
  technicalDetails: "1TB capacity, 3.5-inch form factor, 7200 RPM spindle speed, 64MB cache, SATA 6Gb/s interface.",
  useCase: "Great for bulk storage of games, media, and files alongside a smaller NVMe boot drive.",
  performanceNotes: "7200 RPM spindle speed offers solid sequential throughput for large file storage and transfers.",
  qualityNotes: "Genuine Seagate product with 2-year manufacturer warranty.",
  features: ["7200 RPM spindle speed", "64MB cache", "High storage capacity per rupee", "SATA 6Gb/s interface"],
  boxContents: ["Hard drive", "Documentation"], compatibility: ["SATA III motherboards/controllers", "3.5-inch drive bays"],
  upgradeOptions: ["Add a second drive for RAID or extra storage"], recommendedAccessories: ["SATA Cable", "3.5-inch Drive Bay Adapter"],
  seo: { slug: "seagate-barracuda-1tb", keywords: ["seagate barracuda 1tb", "sata hdd", "desktop hard drive"], metaTitle: "Seagate Barracuda 1TB HDD | DESKTO", metaDescription: "Buy Seagate Barracuda 1TB 3.5-inch SATA hard drive at DESKTO with warranty.", tags: ["seagate barracuda 1tb", "sata hdd", "desktop hard drive"] },
  warrantyMonths: 24,
});

const WD_BLUE_1TB_PRODUCT = draftCatalogProduct({
  id: 127, name: "WD Blue 1TB", category: "hdd", brand: "Western Digital", model: "Blue 1TB",
  sku: "WD-BLUE-1TB", price: 3390, orig: 3890, stock: 22,
  specs: ["1TB Capacity", "3.5-inch SATA III", "7200 RPM", "64MB Cache", "SATA 6Gb/s Interface"],
  storage: "1TB 3.5-inch SATA HDD, 7200 RPM, 64MB cache",
  description: "The WD Blue 1TB is a trusted mainstream SATA hard drive offering reliable performance for everyday desktop storage needs.",
  technicalDetails: "1TB capacity, 3.5-inch form factor, 7200 RPM spindle speed, 64MB cache, SATA 6Gb/s interface.",
  useCase: "A dependable choice for everyday desktop storage, backups, and media libraries.",
  performanceNotes: "Consistent 7200 RPM performance suited for general-purpose desktop storage workloads.",
  qualityNotes: "Genuine Western Digital product with 2-year manufacturer warranty.",
  features: ["7200 RPM spindle speed", "64MB cache", "Proven reliability", "SATA 6Gb/s interface"],
  boxContents: ["Hard drive", "Documentation"], compatibility: ["SATA III motherboards/controllers", "3.5-inch drive bays"],
  upgradeOptions: ["Add a second drive for RAID or extra storage"], recommendedAccessories: ["SATA Cable", "3.5-inch Drive Bay Adapter"],
  seo: { slug: "wd-blue-1tb", keywords: ["wd blue 1tb", "sata hdd", "desktop hard drive"], metaTitle: "WD Blue 1TB HDD | DESKTO", metaDescription: "Buy WD Blue 1TB 3.5-inch SATA hard drive at DESKTO with warranty.", tags: ["wd blue 1tb", "sata hdd", "desktop hard drive"] },
  warrantyMonths: 24,
});

const TOSHIBA_P300_1TB_PRODUCT = draftCatalogProduct({
  id: 128, name: "Toshiba P300 1TB", category: "hdd", brand: "Toshiba", model: "P300 1TB",
  sku: "TOSHIBA-P300-1TB", price: 3190, orig: 3690, stock: 18,
  specs: ["1TB Capacity", "3.5-inch SATA III", "7200 RPM", "64MB Cache", "SATA 6Gb/s Interface"],
  storage: "1TB 3.5-inch SATA HDD, 7200 RPM, 64MB cache",
  description: "The Toshiba P300 1TB is a budget-friendly desktop hard drive offering solid capacity and performance for everyday storage needs.",
  technicalDetails: "1TB capacity, 3.5-inch form factor, 7200 RPM spindle speed, 64MB cache, SATA 6Gb/s interface.",
  useCase: "A cost-effective option for bulk storage in budget desktop builds.",
  performanceNotes: "Solid sequential read/write performance for general file storage and everyday use.",
  qualityNotes: "Genuine Toshiba product with 2-year manufacturer warranty.",
  features: ["7200 RPM spindle speed", "64MB cache", "Budget-friendly pricing", "SATA 6Gb/s interface"],
  boxContents: ["Hard drive", "Documentation"], compatibility: ["SATA III motherboards/controllers", "3.5-inch drive bays"],
  upgradeOptions: ["Add a second drive for RAID or extra storage"], recommendedAccessories: ["SATA Cable", "3.5-inch Drive Bay Adapter"],
  seo: { slug: "toshiba-p300-1tb", keywords: ["toshiba p300 1tb", "sata hdd", "budget hard drive"], metaTitle: "Toshiba P300 1TB HDD | DESKTO", metaDescription: "Buy Toshiba P300 1TB 3.5-inch SATA hard drive at DESKTO with warranty.", tags: ["toshiba p300 1tb", "sata hdd", "budget hard drive"] },
  warrantyMonths: 24,
});

// ── SATA SSDs ──
const SAMSUNG_870EVO_PRODUCT = draftCatalogProduct({
  id: 129, name: "Samsung 870 EVO 1TB", category: "ssd", brand: "Samsung", model: "870 EVO 1TB",
  sku: "SAM-870EVO-1TB", price: 6990, orig: 7990, stock: 20,
  specs: ["1TB Capacity", "SATA III (6Gb/s)", "Sequential Read 560 MB/s", "Sequential Write 530 MB/s", "2.5-inch Form Factor"],
  storage: "1TB SATA III SSD, 560/530 MB/s read/write, 2.5-inch",
  description: "The Samsung 870 EVO 1TB is a top-tier SATA SSD offering near-maximum SATA interface performance and excellent reliability.",
  technicalDetails: "1TB capacity, SATA III (6Gb/s) interface, up to 560 MB/s sequential read and 530 MB/s sequential write, 2.5-inch form factor, Samsung V-NAND and MJX controller.",
  useCase: "Ideal for upgrading older PCs and laptops from HDD to SSD for a dramatic speed boost.",
  performanceNotes: "Consistently hits near the theoretical maximum of the SATA III interface for reliable, predictable performance.",
  qualityNotes: "Genuine Samsung product with 5-year manufacturer warranty.",
  features: ["Samsung V-NAND", "Samsung Magician software", "5-year warranty", "2.5-inch universal form factor"],
  boxContents: ["SSD", "Documentation"], compatibility: ["SATA III motherboards/laptops", "2.5-inch drive bays"],
  upgradeOptions: ["Add SATA-to-USB enclosure for external use"], recommendedAccessories: ["SATA Cable", "2.5-inch to 3.5-inch Bay Adapter"],
  seo: { slug: "samsung-870-evo-1tb", keywords: ["samsung 870 evo", "sata ssd", "2.5 inch ssd"], metaTitle: "Samsung 870 EVO 1TB SATA SSD | DESKTO", metaDescription: "Buy Samsung 870 EVO 1TB SATA SSD at DESKTO with warranty.", tags: ["samsung 870 evo", "sata ssd", "2.5 inch ssd"] },
  warrantyMonths: 60,
});

const CRUCIAL_MX500_PRODUCT = draftCatalogProduct({
  id: 130, name: "Crucial MX500 1TB", category: "ssd", brand: "Crucial", model: "MX500 1TB",
  sku: "CRUCIAL-MX500-1TB", price: 6490, orig: 7490, stock: 18,
  specs: ["1TB Capacity", "SATA III (6Gb/s)", "Sequential Read 560 MB/s", "Sequential Write 510 MB/s", "2.5-inch Form Factor"],
  storage: "1TB SATA III SSD, 560/510 MB/s read/write, 2.5-inch",
  description: "The Crucial MX500 1TB is a long-standing favorite SATA SSD known for reliable performance and strong endurance ratings.",
  technicalDetails: "1TB capacity, SATA III (6Gb/s) interface, up to 560 MB/s sequential read and 510 MB/s sequential write, 2.5-inch form factor, Micron 3D NAND with hardware encryption support.",
  useCase: "A proven choice for HDD-to-SSD upgrades in desktops and laptops alike.",
  performanceNotes: "Strong sustained write performance and high endurance rating for long-term reliability.",
  qualityNotes: "Genuine Crucial (Micron) product with 5-year manufacturer warranty.",
  features: ["Micron 3D NAND", "Hardware-based encryption support", "Crucial Storage Executive software", "5-year warranty"],
  boxContents: ["SSD", "Documentation"], compatibility: ["SATA III motherboards/laptops", "2.5-inch drive bays"],
  upgradeOptions: ["Add SATA-to-USB enclosure for external use"], recommendedAccessories: ["SATA Cable", "2.5-inch to 3.5-inch Bay Adapter"],
  seo: { slug: "crucial-mx500-1tb", keywords: ["crucial mx500", "sata ssd", "2.5 inch ssd"], metaTitle: "Crucial MX500 1TB SATA SSD | DESKTO", metaDescription: "Buy Crucial MX500 1TB SATA SSD at DESKTO with warranty.", tags: ["crucial mx500", "sata ssd", "2.5 inch ssd"] },
  warrantyMonths: 60,
});

const KINGSTON_A400_PRODUCT = draftCatalogProduct({
  id: 131, name: "Kingston A400 480GB", category: "ssd", brand: "Kingston", model: "A400 480GB",
  sku: "KING-A400-480GB", price: 2690, orig: 3190, stock: 25,
  specs: ["480GB Capacity", "SATA III (6Gb/s)", "Sequential Read 500 MB/s", "Sequential Write 450 MB/s", "2.5-inch Form Factor"],
  storage: "480GB SATA III SSD, 500/450 MB/s read/write, 2.5-inch",
  description: "The Kingston A400 480GB is an entry-level SATA SSD offering an affordable, reliable upgrade path from traditional hard drives.",
  technicalDetails: "480GB capacity, SATA III (6Gb/s) interface, up to 500 MB/s sequential read and 450 MB/s sequential write, 2.5-inch form factor.",
  useCase: "A budget-friendly way to breathe new life into older PCs and laptops still running on HDDs.",
  performanceNotes: "Delivers a dramatic speed improvement over mechanical drives for boot times and app loading.",
  qualityNotes: "Genuine Kingston product with 3-year manufacturer warranty.",
  features: ["Affordable entry-level pricing", "2.5-inch universal form factor", "Low power consumption", "Quiet, no moving parts"],
  boxContents: ["SSD", "Documentation"], compatibility: ["SATA III motherboards/laptops", "2.5-inch drive bays"],
  upgradeOptions: ["Add SATA-to-USB enclosure for external use"], recommendedAccessories: ["SATA Cable", "2.5-inch to 3.5-inch Bay Adapter"],
  seo: { slug: "kingston-a400-480gb", keywords: ["kingston a400", "budget sata ssd", "2.5 inch ssd"], metaTitle: "Kingston A400 480GB SATA SSD | DESKTO", metaDescription: "Buy Kingston A400 480GB SATA SSD at DESKTO with warranty.", tags: ["kingston a400", "budget sata ssd", "2.5 inch ssd"] },
  warrantyMonths: 36,
});

const WD_BLUE_SA510_PRODUCT = draftCatalogProduct({
  id: 132, name: "WD Blue SA510 1TB", category: "ssd", brand: "Western Digital", model: "Blue SA510 1TB",
  sku: "WD-BLUE-SA510-1TB", price: 6290, orig: 7190, stock: 16,
  specs: ["1TB Capacity", "SATA III (6Gb/s)", "Sequential Read 560 MB/s", "Sequential Write 520 MB/s", "2.5-inch Form Factor"],
  storage: "1TB SATA III SSD, 560/520 MB/s read/write, 2.5-inch",
  description: "The WD Blue SA510 1TB is Western Digital's latest-generation SATA SSD, offering strong everyday performance and reliability.",
  technicalDetails: "1TB capacity, SATA III (6Gb/s) interface, up to 560 MB/s sequential read and 520 MB/s sequential write, 2.5-inch form factor, WD in-house controller.",
  useCase: "A solid choice for upgrading desktops and laptops from HDD to SSD for faster everyday computing.",
  performanceNotes: "Near-maximum SATA III speeds with consistent performance across sustained workloads.",
  qualityNotes: "Genuine Western Digital product with 5-year manufacturer warranty.",
  features: ["WD in-house controller", "WD Dashboard software", "5-year warranty", "2.5-inch universal form factor"],
  boxContents: ["SSD", "Documentation"], compatibility: ["SATA III motherboards/laptops", "2.5-inch drive bays"],
  upgradeOptions: ["Add SATA-to-USB enclosure for external use"], recommendedAccessories: ["SATA Cable", "2.5-inch to 3.5-inch Bay Adapter"],
  seo: { slug: "wd-blue-sa510-1tb", keywords: ["wd blue sa510", "sata ssd", "2.5 inch ssd"], metaTitle: "WD Blue SA510 1TB SATA SSD | DESKTO", metaDescription: "Buy WD Blue SA510 1TB SATA SSD at DESKTO with warranty.", tags: ["wd blue sa510", "sata ssd", "2.5 inch ssd"] },
  warrantyMonths: 60,
});

const SANDISK_SSD_PLUS_PRODUCT = draftCatalogProduct({
  id: 133, name: "SanDisk SSD Plus 480GB", category: "ssd", brand: "SanDisk", model: "SSD Plus 480GB",
  sku: "SANDISK-SSDPLUS-480GB", price: 2590, orig: 2990, stock: 22,
  specs: ["480GB Capacity", "SATA III (6Gb/s)", "Sequential Read 535 MB/s", "Sequential Write 445 MB/s", "2.5-inch Form Factor"],
  storage: "480GB SATA III SSD, 535/445 MB/s read/write, 2.5-inch",
  description: "The SanDisk SSD Plus 480GB is a budget-friendly SATA SSD offering a simple, affordable path to faster storage.",
  technicalDetails: "480GB capacity, SATA III (6Gb/s) interface, up to 535 MB/s sequential read and 445 MB/s sequential write, 2.5-inch form factor.",
  useCase: "A practical, low-cost upgrade option for older HDD-equipped PCs and laptops.",
  performanceNotes: "Delivers a significant real-world speed boost over mechanical drives for everyday tasks.",
  qualityNotes: "Genuine SanDisk (Western Digital) product with 3-year manufacturer warranty.",
  features: ["Affordable entry-level pricing", "SanDisk Dashboard software", "2.5-inch universal form factor", "Low power consumption"],
  boxContents: ["SSD", "Documentation"], compatibility: ["SATA III motherboards/laptops", "2.5-inch drive bays"],
  upgradeOptions: ["Add SATA-to-USB enclosure for external use"], recommendedAccessories: ["SATA Cable", "2.5-inch to 3.5-inch Bay Adapter"],
  seo: { slug: "sandisk-ssd-plus-480gb", keywords: ["sandisk ssd plus", "budget sata ssd", "2.5 inch ssd"], metaTitle: "SanDisk SSD Plus 480GB SATA SSD | DESKTO", metaDescription: "Buy SanDisk SSD Plus 480GB SATA SSD at DESKTO with warranty.", tags: ["sandisk ssd plus", "budget sata ssd", "2.5 inch ssd"] },
  warrantyMonths: 36,
});

// ── Accessories ──
const LOGITECH_C270_WEBCAM_PRODUCT = draftCatalogProduct({
  id: 134, name: "Logitech C270 HD Webcam", category: "accessories", brand: "Logitech", model: "C270",
  sku: "LOGI-C270-WEBCAM", price: 1990, orig: 2290, stock: 25,
  specs: ["HD 720p Video", "Built-in Noise-Reducing Mic", "Fixed Focus Lens", "USB Plug-and-Play", "Universal Clip Mount"],
  ports: "Wired USB-A connection",
  description: "The Logitech C270 HD Webcam is a reliable plug-and-play webcam offering clear 720p video for calls and streaming.",
  technicalDetails: "HD 720p video resolution, built-in noise-reducing microphone, fixed focus lens, USB plug-and-play with no drivers required, universal clip mount.",
  useCase: "Great for video calls, online classes, and light streaming needs.",
  performanceNotes: "Automatic light correction keeps video clear in a range of typical indoor lighting conditions.",
  qualityNotes: "Genuine Logitech product with 1-year manufacturer warranty.",
  features: ["HD 720p video", "Built-in microphone", "Plug-and-play (no drivers)", "Universal clip mount"],
  boxContents: ["Webcam", "Documentation"], compatibility: ["Windows", "macOS", "Chrome OS", "USB-A port"],
  upgradeOptions: ["Pair with a ring light for better video quality"], recommendedAccessories: ["Ring Light", "Webcam Privacy Cover"],
  seo: { slug: "logitech-c270-webcam", keywords: ["logitech c270", "hd webcam", "budget webcam"], metaTitle: "Logitech C270 HD Webcam | DESKTO", metaDescription: "Buy Logitech C270 HD 720p webcam at DESKTO with warranty.", tags: ["logitech c270", "hd webcam", "budget webcam"] },
});

const UGREEN_USB_HUB_PRODUCT = draftCatalogProduct({
  id: 135, name: "UGREEN 4-Port USB 3.0 Hub", category: "accessories", brand: "UGREEN", model: "4-Port USB 3.0 Hub",
  sku: "UGREEN-USB3-4PORT-HUB", price: 1290, orig: 1590, stock: 30,
  specs: ["4x USB 3.0 Ports", "Up to 5Gbps Transfer Speed", "Compact Portable Design", "Plug-and-Play", "LED Power Indicator"],
  ports: "4x USB 3.0 Type-A ports, 1x USB-A host connector",
  description: "The UGREEN 4-Port USB 3.0 Hub expands a single USB port into four high-speed ports for connecting multiple peripherals.",
  technicalDetails: "4x USB 3.0 Type-A ports, up to 5Gbps transfer speed, compact portable design, plug-and-play with no drivers required, LED power indicator per port.",
  useCase: "Handy for laptops and PCs with limited USB ports needing to connect multiple peripherals simultaneously.",
  performanceNotes: "USB 3.0 speeds support fast external drive transfers alongside connected peripherals.",
  qualityNotes: "Genuine UGREEN product with 1-year manufacturer warranty.",
  features: ["4x USB 3.0 ports", "5Gbps transfer speed", "Compact portable design", "Plug-and-play"],
  boxContents: ["USB hub", "Documentation"], compatibility: ["Windows", "macOS", "Linux", "USB-A host port"],
  upgradeOptions: ["Add a powered hub for high-draw devices"], recommendedAccessories: ["USB-C to USB-A Adapter"],
  seo: { slug: "ugreen-4-port-usb3-hub", keywords: ["ugreen usb hub", "usb 3.0 hub", "4-port usb hub"], metaTitle: "UGREEN 4-Port USB 3.0 Hub | DESKTO", metaDescription: "Buy UGREEN 4-Port USB 3.0 Hub at DESKTO with warranty.", tags: ["ugreen usb hub", "usb 3.0 hub", "4-port usb hub"] },
});

const ANKER_735_CHARGER_PRODUCT = draftCatalogProduct({
  id: 136, name: "Anker 735 Charger (Nano II 65W)", category: "accessories", brand: "Anker", model: "735 Charger (Nano II 65W)",
  sku: "ANKER-735-NANOII-65W", price: 3990, orig: 4590, stock: 20,
  specs: ["65W GaN Fast Charging", "3-Port (2x USB-C, 1x USB-A)", "Compact Foldable Plug", "PowerIQ 4.0 & GaNPrime Tech", "Multi-Device Charging"],
  ports: "2x USB-C, 1x USB-A output ports", powerRequirement: "65W total output (GaN)",
  description: "The Anker 735 Charger (Nano II 65W) is a compact GaN fast charger capable of powering laptops, tablets, and phones simultaneously.",
  technicalDetails: "65W total output using GaN (Gallium Nitride) technology, 3 ports (2x USB-C, 1x USB-A), PowerIQ 4.0 and GaNPrime intelligent power distribution, compact foldable plug design.",
  useCase: "Great for travelers and desk setups needing one compact charger for a laptop, tablet, and phone.",
  performanceNotes: "GaNPrime technology intelligently distributes power across all three ports based on connected devices.",
  qualityNotes: "Genuine Anker product with 1.5-year manufacturer warranty.",
  features: ["65W GaN fast charging", "3-port simultaneous charging", "Compact foldable design", "PowerIQ 4.0 technology"],
  boxContents: ["Charger", "Documentation"], compatibility: ["USB-C laptops", "Phones", "Tablets"],
  upgradeOptions: ["Add USB-C cables for additional devices"], recommendedAccessories: ["USB-C to USB-C Cable", "USB-C to Lightning Cable"],
  seo: { slug: "anker-735-charger-nano-ii-65w", keywords: ["anker 735 charger", "gan charger", "65w usb-c charger"], metaTitle: "Anker 735 Charger (Nano II 65W) | DESKTO", metaDescription: "Buy Anker 735 Nano II 65W GaN charger at DESKTO with warranty.", tags: ["anker 735 charger", "gan charger", "65w usb-c charger"] },
  warrantyMonths: 18,
});

const BELKIN_SURGE_PROTECTOR_PRODUCT = draftCatalogProduct({
  id: 137, name: "Belkin 6-Outlet Surge Protector", category: "accessories", brand: "Belkin", model: "6-Outlet Surge Protector",
  sku: "BELKIN-SURGE-6OUTLET", price: 1990, orig: 2290, stock: 24,
  specs: ["6 AC Outlets", "2x USB Charging Ports", "1050 Joules Surge Protection", "2m Power Cord", "Overload Protection"],
  ports: "6x AC outlets, 2x USB-A charging ports", powerRequirement: "Rated for standard 230V AC input",
  description: "The Belkin 6-Outlet Surge Protector protects connected electronics from power surges while adding convenient USB charging ports.",
  technicalDetails: "6 AC outlets, 2 USB-A charging ports, 1050 joules of surge protection, 2-meter power cord, built-in overload protection with reset switch.",
  useCase: "Ideal for protecting a PC, monitor, and peripherals from power surges while keeping devices charged.",
  performanceNotes: "1050-joule surge rating provides solid protection against typical household power surges.",
  qualityNotes: "Genuine Belkin product with 2-year manufacturer warranty.",
  features: ["1050 joules surge protection", "2x USB charging ports", "Overload protection with reset switch", "2m power cord"],
  boxContents: ["Surge protector strip", "Documentation"], compatibility: ["Standard 5/15A Indian sockets", "PC, monitor, peripheral loads"],
  upgradeOptions: ["Pair with a UPS for backup power"], recommendedAccessories: ["UPS", "Extension Cord"],
  seo: { slug: "belkin-6-outlet-surge-protector", keywords: ["belkin surge protector", "power strip", "surge protector"], metaTitle: "Belkin 6-Outlet Surge Protector | DESKTO", metaDescription: "Buy Belkin 6-Outlet Surge Protector with USB charging at DESKTO with warranty.", tags: ["belkin surge protector", "power strip", "surge protector"] },
});

const ZEBRONICS_WEBCAM_PRODUCT = draftCatalogProduct({
  id: 138, name: "Zebronics Zeb-Crystal Pro Webcam", category: "accessories", brand: "Zebronics", model: "Zeb-Crystal Pro",
  sku: "ZEBRONICS-WEBCAM-CRYSTALPRO", price: 1690, orig: 1990, stock: 26,
  specs: ["Full HD 1080p Video", "Built-in Noise-Cancelling Mic", "Wide-Angle Lens", "USB Plug-and-Play", "Adjustable Clip Mount"],
  ports: "Wired USB-A connection",
  description: "The Zebronics Zeb-Crystal Pro Webcam is an affordable Full HD webcam offering clear video for calls, classes, and streaming.",
  technicalDetails: "Full HD 1080p video resolution, built-in noise-cancelling microphone, wide-angle lens, USB plug-and-play with no drivers required, adjustable clip mount.",
  useCase: "A budget-friendly upgrade for video calls, online classes, and casual streaming.",
  performanceNotes: "Wide-angle lens captures more of the frame, useful for group calls or small workspace setups.",
  qualityNotes: "Genuine Zebronics product with 1-year manufacturer warranty.",
  features: ["Full HD 1080p video", "Built-in noise-cancelling mic", "Wide-angle lens", "Plug-and-play (no drivers)"],
  boxContents: ["Webcam", "Documentation"], compatibility: ["Windows", "macOS", "USB-A port"],
  upgradeOptions: ["Pair with a ring light for better video quality"], recommendedAccessories: ["Ring Light", "Webcam Privacy Cover"],
  seo: { slug: "zebronics-zeb-crystal-pro-webcam", keywords: ["zebronics webcam", "1080p webcam", "budget webcam"], metaTitle: "Zebronics Zeb-Crystal Pro Webcam | DESKTO", metaDescription: "Buy Zebronics Zeb-Crystal Pro Full HD webcam at DESKTO with warranty.", tags: ["zebronics webcam", "1080p webcam", "budget webcam"] },
});

const SEEDED_BACKFILL_PRODUCTS: CatalogProduct[] = [
  MACBOOK_AIR_M4_PRODUCT,
  DELL_INSPIRON_15_PRODUCT,
  HP_15S_PRODUCT,
  LENOVO_IDEAPAD_SLIM3_PRODUCT,
  ASUS_VIVOBOOK_15_PRODUCT,
  MSI_KATANA_15_PRODUCT,
  ACER_PREDATOR_HELIOS_NEO_16_PRODUCT,
  LENOVO_LEGION_5_PRODUCT,
  ALIENWARE_M16_PRODUCT,
  DELL_OPTIPLEX_7010_PRODUCT,
  HP_PRODESK_400_PRODUCT,
  LENOVO_THINKCENTRE_M70_PRODUCT,
  ASUS_EXPERTCENTER_D5_PRODUCT,
  ACER_ASPIRE_TC_PRODUCT,
  CORSAIR_VENGEANCE_I7400_PRODUCT,
  ASUS_ROG_G22CH_PRODUCT,
  MSI_INFINITE_RS_PRODUCT,
  ALIENWARE_AURORA_R16_PRODUCT,
  NZXT_PLAYER_ONE_PRODUCT,
  LG_ULTRAGEAR_24GN650_PRODUCT,
  SAMSUNG_ODYSSEY_G5_PRODUCT,
  ASUS_TUF_VG249Q1A_PRODUCT,
  MSI_G274QPF_PRODUCT,
  ACER_NITRO_VG240Y_PRODUCT,
  INTEL_I3_12100F_PRODUCT,
  INTEL_I5_12400F_PRODUCT,
  INTEL_I5_14400F_PRODUCT,
  INTEL_I7_14700K_PRODUCT,
  AMD_RYZEN5_5600_PRODUCT,
  AMD_RYZEN5_7600_PRODUCT,
  AMD_RYZEN7_7800X3D_PRODUCT,
  AMD_RYZEN9_9950X_PRODUCT,
  RTX_3050_PRODUCT,
  RTX_4060_PRODUCT,
  RTX_4060TI_PRODUCT,
  RTX_4070SUPER_PRODUCT,
  RTX_5070_PRODUCT,
  RX_6600_PRODUCT,
  RX_7600_PRODUCT,
  RX_7700XT_PRODUCT,
  RX_7800XT_PRODUCT,
  RX_9070XT_PRODUCT,
  ARC_A580_PRODUCT,
  ARC_A750_PRODUCT,
  ARC_B580_PRODUCT,
  CORSAIR_VENGEANCE_LPX_16_PRODUCT,
  KINGSTON_FURY_BEAST_16_PRODUCT,
  GSKILL_RIPJAWS_V_16_PRODUCT,
  CRUCIAL_PRO_DDR5_16_PRODUCT,
  TEAMGROUP_TFORCE_VULCAN_PRODUCT,
  SAMSUNG_990PRO_PRODUCT,
  WD_SN850X_PRODUCT,
  CRUCIAL_T500_PRODUCT,
  KINGSTON_KC3000_PRODUCT,
  SEAGATE_FIRECUDA_530_PRODUCT,
  ASUS_TUF_B650PLUS_PRODUCT,
  MSI_MAG_B650_TOMAHAWK_PRODUCT,
  GIGABYTE_B650_AORUS_ELITE_PRODUCT,
  ASROCK_B650M_PRO_RS_PRODUCT,
  BIOSTAR_B760MX_PRODUCT,
  CORSAIR_RM750E_PRODUCT,
  CM_MWE_650_BRONZE_PRODUCT,
  DEEPCOOL_PK650D_PRODUCT,
  MSI_MAG_A650BN_PRODUCT,
  TT_TOUGHPOWER_GF_A3_PRODUCT,
  NZXT_H5_FLOW_PRODUCT,
  CORSAIR_4000D_AIRFLOW_PRODUCT,
  LIAN_LI_LANCOOL_216_PRODUCT,
  CM_TD500_MESH_PRODUCT,
  DEEPCOOL_CH560_PRODUCT,
  LOGITECH_G213_PRODUCT,
  RAZER_BLACKWIDOW_V4_PRODUCT,
  CORSAIR_K55_RGB_PRODUCT,
  REDRAGON_K552_PRODUCT,
  HYPERX_ALLOY_ORIGINS_PRODUCT,
  LOGITECH_G102_PRODUCT,
  RAZER_DEATHADDER_V3_PRODUCT,
  STEELSERIES_RIVAL_3_PRODUCT,
  CORSAIR_HARPOON_RGB_PRODUCT,
  HYPERX_PULSEFIRE_HASTE2_PRODUCT,
  HYPERX_CLOUD_II_PRODUCT,
  LOGITECH_G435_PRODUCT,
  STEELSERIES_ARCTIS_NOVA5_PRODUCT,
  RAZER_BLACKSHARK_V2_PRODUCT,
  CORSAIR_HS55_PRODUCT,
  TPLINK_ARCHER_C6_PRODUCT,
  ASUS_RT_AX58U_PRODUCT,
  DLINK_DIRX1560_PRODUCT,
  NETGEAR_NIGHTHAWK_AX4_PRODUCT,
  TENDA_AC10_PRODUCT,
  APC_BX600C_PRODUCT,
  MICROTEK_LEGEND1000_PRODUCT,
  CYBERPOWER_UT1500E_PRODUCT,
  EATON_5E_1100VA_PRODUCT,
  ZEBRONICS_ZEBU725_PRODUCT,
  HP_SMARTTANK_580_PRODUCT,
  CANON_PIXMA_G3770_PRODUCT,
  EPSON_ECOTANK_L3250_PRODUCT,
  BROTHER_DCPB7500D_PRODUCT,
  PANTUM_P2509W_PRODUCT,
  CANON_CANOSCAN_LIDE400_PRODUCT,
  EPSON_PERFECTION_V39II_PRODUCT,
  HP_SCANJET_PRO2600_PRODUCT,
  BROTHER_ADS1300_PRODUCT,
  SEAGATE_BARRACUDA_1TB_PRODUCT,
  WD_BLUE_1TB_PRODUCT,
  TOSHIBA_P300_1TB_PRODUCT,
  SAMSUNG_870EVO_PRODUCT,
  CRUCIAL_MX500_PRODUCT,
  KINGSTON_A400_PRODUCT,
  WD_BLUE_SA510_PRODUCT,
  SANDISK_SSD_PLUS_PRODUCT,
  LOGITECH_C270_WEBCAM_PRODUCT,
  UGREEN_USB_HUB_PRODUCT,
  ANKER_735_CHARGER_PRODUCT,
  BELKIN_SURGE_PROTECTOR_PRODUCT,
  ZEBRONICS_WEBCAM_PRODUCT,
];

function seedStore(): DashboardStore {
  const store = emptyStore();
  store.gamingHub = defaultGamingHubItems();

  // Products — pulled from the static catalogue (truncated for brevity)
  store.products = [...SEEDED_BACKFILL_PRODUCTS];

  // Addresses for the demo customer
  store.addresses = [
    { id: rid("adr"), label: "Home", line1: "12 Park Avenue", city: "Mumbai", state: "MH", pincode: "400001", isDefault: true },
    { id: rid("adr"), label: "Office", line1: "Tower B, BKC", line2: "5th Floor", city: "Mumbai", state: "MH", pincode: "400051" },
    { id: rid("adr"), label: "Workshop", line1: "Plot 4, MIDC", city: "Pune", state: "MH", pincode: "411019" },
  ];

  // Orders — item name/price are denormalized snapshots at time of purchase, independent of
  // whether the referenced catalog product still exists (matches real e-commerce order history).
  const sampleItem = (id: number, name: string, price: number, qty = 1): OrderItem => ({ productId: id, name, price, qty, img: "" });
  store.orders = [
    {
      id: rid("ord"),
      customerId: uid,
      items: [sampleItem(1, "DESKTO Phantom X", 285000), sampleItem(20, "Razer DeathAdder V3", 6500, 2)],
      total: 285000 + 6500 * 2,
      status: "delivered",
      createdAt: daysAgo(28),
      addressId: store.addresses[0].id,
      trackingSteps: [
        { label: "Order placed", at: daysAgo(28), done: true },
        { label: "Verified", at: daysAgo(27), done: true },
        { label: "Shipped", at: daysAgo(25), done: true },
        { label: "Delivered", at: daysAgo(22), done: true },
      ],
      invoiceId: rid("inv"),
      warrantyEndsAt: daysFromNow(700),
    },
    {
      id: rid("ord"),
      customerId: uid,
      items: [sampleItem(11, "Intel Core i9-14900K", 54000), sampleItem(15, "Samsung 990 PRO 2TB", 18900)],
      total: 54000 + 18900,
      status: "shipped",
      createdAt: daysAgo(3),
      addressId: store.addresses[0].id,
      trackingSteps: [
        { label: "Order placed", at: daysAgo(3), done: true },
        { label: "Verified", at: daysAgo(2), done: true },
        { label: "Shipped", at: daysAgo(1), done: true },
        { label: "Out for delivery", at: daysAgo(0), done: false },
      ],
      invoiceId: rid("inv"),
      warrantyEndsAt: daysFromNow,
    },
    {
      id: rid("ord"),
      customerId: uid,
      items: [sampleItem(7, "ASUS ROG Strix G16", 185000)],
      total: 185000,
      status: "packing",
      createdAt: daysAgo(1),
      addressId: store.addresses[1].id,
      trackingSteps: [
        { label: "Order placed", at: daysAgo(1), done: true },
        { label: "Verified", at: daysAgo(0), done: true },
        { label: "Packing", at: Date.now(), done: true },
        { label: "Shipped", at: 0, done: false },
      ],
      invoiceId: rid("inv"),
      warrantyEndsAt: daysFromNow(700),
    },
  ];

  // Repairs
  store.repairs = [
    {
      id: rid("rep"),
      customerId: uid,
      customerName: "Demo Customer",
      contactPhone: "+91 98765 43210",
      contactEmail: "demo@deskto.in",
      serviceCategory: "laptop-repair",
      deviceType: "Laptop",
      brand: "Dell",
      model: "XPS 15",
      serialNumber: "DXPS-15-2023-4451",
      device: "Dell XPS 15",
      issue: "Thermal throttling under sustained load; replaced paste last year.",
      serviceType: "Pickup & Delivery",
      preferredSlot: "Tomorrow, 11:00 AM",
      estimatedCharge: 499,
      uploadedFiles: ["thermal-log.png", "fan-noise-front.jpg", "heat-sink-dust.webp"],
      status: "repair-progress",
      technicianId: sid(1),
      adminVerified: true,
      diagnosisReport: "Dust-clogged heat sink, degraded thermal paste, CPU fan bearing noise. SSD health 96%.",
      partsRequired: [{ name: "Dell XPS CPU fan", cost: 2100 }, { name: "Thermal compound", cost: 450 }],
      laborCost: 1950,
      quotation: 4500,
      quotationNote: "Fan replacement, thermal service, 6-hour stress test.",
      advancePaid: 1000,
      paidAmount: 1000,
      qualityChecks: [
        { label: "Stress Testing", done: false },
        { label: "Temperature Test", done: false },
        { label: "Performance Benchmark", done: false },
        { label: "Hardware Verification", done: false },
        { label: "Software Verification", done: false },
      ],
      deliveryMode: "Home Delivery",
      timeline: repairTimelineThrough("repair-progress", daysAgo(5)),
      createdAt: daysAgo(5),
      updatedAt: daysAgo(0),
    },
    {
      id: rid("rep"),
      customerId: uid,
      customerName: "Demo Customer",
      contactPhone: "+91 98765 43210",
      contactEmail: "demo@deskto.in",
      serviceCategory: "pc-repair",
      deviceType: "Gaming PC",
      brand: "DESKTO",
      model: "Phantom X",
      serialNumber: "DT-PHX-4090-1088",
      device: "DESKTO Phantom X",
      issue: "Random shutdowns while gaming; customer suspects PSU or GPU power cable.",
      serviceType: "Shop Visit",
      preferredSlot: "Friday, 04:00 PM",
      estimatedCharge: 499,
      uploadedFiles: ["shutdown-event-viewer.png"],
      status: "quotation",
      technicianId: sid(1),
      adminVerified: true,
      diagnosisReport: "GPU power transient spikes found. PSU passes basic test, but 12V rail drops under combined CPU/GPU load.",
      partsRequired: [{ name: "850W Gold PSU", cost: 9800 }],
      laborCost: 1200,
      quotation: 1800,
      quotationNote: "Customer may choose PSU replacement or cable-only test first.",
      qualityChecks: [
        { label: "Stress Testing", done: false },
        { label: "Temperature Test", done: false },
        { label: "Performance Benchmark", done: false },
        { label: "Hardware Verification", done: false },
        { label: "Software Verification", done: false },
      ],
      deliveryMode: "Pickup",
      timeline: repairTimelineThrough("quotation", daysAgo(2)),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(0),
    },
  ];

  // Rentals
  store.rentals = [
    {
      id: rid("rnt"),
      customerId: uid,
      productId: 9,
      productName: "Lenovo Legion Pro 5",
      startDate: daysAgo(2),
      endDate: daysFromNow(2),
      status: "active",
      deposit: 15000,
      monthlyRate: 8500,
      createdAt: daysAgo(2),
    },
    {
      id: rid("rnt"),
      customerId: uid,
      productId: 2,
      productName: "DESKTO Titan Pro",
      startDate: daysAgo(60),
      endDate: daysAgo(30),
      status: "returned",
      deposit: 30000,
      monthlyRate: 18000,
      createdAt: daysAgo(60),
    },
  ];

  // PC Builds
  store.pcBuilds = [
    {
      id: rid("pcb"),
      customerId: uid,
      customerName: "Demo Customer",
      contactPhone: "+91 98765 43210",
      contactEmail: "demo@deskto.in",
      name: "Content Creator Beast",
      purpose: "Editing",
      budgetRange: "₹2,00,000 - ₹3,00,000",
      preferredBrand: "Intel / NVIDIA",
      performanceLevel: "High",
      components: [
        { type: "CPU", name: "i9-14900K", price: 54000 },
        { type: "GPU", name: "RTX 4080 Super", price: 98000 },
        { type: "RAM", name: "64GB DDR5", price: 28000 },
        { type: "Storage", name: "4TB NVMe", price: 38000 },
        { type: "Case", name: "Lian Li O11 Dynamic", price: 17900 },
      ],
      validationReport: [
        { label: "CPU Socket Compatibility", pass: true, detail: "LGA1700 board supports i9-14900K" },
        { label: "PSU Wattage", pass: true, detail: "Estimated draw 690W; 1000W recommended" },
        { label: "GPU Clearance", pass: true, detail: "O11 Dynamic supports selected GPU length" },
        { label: "Upgrade Path", pass: true, detail: "Spare M.2 slots and PSU headroom available" },
      ],
      assemblyChecklist: ["Install CPU", "Install Cooler", "Install RAM", "Install SSD", "Install Motherboard", "Install PSU", "Install GPU", "Cable Management", "RGB Setup", "BIOS Configuration"].map(label => ({ label, done: ["Install CPU", "Install Cooler", "Install RAM", "Install SSD"].includes(label), at: daysAgo(1) })),
      testResults: ["Boot Test", "Temperature Test", "Stress Test", "Benchmark Test", "GPU Test", "RAM Test", "SSD Health Test", "Power Stability Test", "RGB Test", "Final Quality Check"].map(label => ({ label, done: label === "Boot Test", value: label === "Boot Test" ? "Pass" : undefined })),
      assemblyCharge: 8000,
      gst: 42462,
      shipping: 0,
      estimatedDelivery: "5-7 working days",
      quotation: 286362,
      quotationNote: "Professional build quotation with parts, assembly, GST, testing, warranty and delivery.",
      total: 235900,
      status: "stress-test",
      technicianId: sid(2),
      invoiceId: rid("inv"),
      warrantyId: rid("war"),
      timeline: pcBuildTimelineThrough("stress-test", daysAgo(7)),
      createdAt: daysAgo(7),
      warrantyEndsAt: daysFromNow(1095),
      updatedAt: daysAgo(0),
    },
  ];

  // Assemblies
  store.assemblies = [
    {
      id: rid("asm"),
      customerId: uid,
      productName: "Bring-your-own-parts assembly",
      status: "building",
      technicianId: sid(2),
      components: ["CPU", "GPU", "RAM", "Storage", "PSU"],
      createdAt: daysAgo(3),
    },
  ];

  // Support tickets
  store.tickets = [
    {
      id: rid("tkt"),
      customerId: uid,
      subject: "GPU driver crash in Cyberpunk",
      messages: [
        { from: "customer", text: "Game crashes after 30 min of gameplay. Clean install didn't help.", at: daysAgo(1) },
        { from: "agent", text: "Thanks for reaching out. Can you share your DxDiag and a screenshot of temps?", at: daysAgo(1) },
        { from: "customer", text: "Sending now. Idle 45°C, load 88°C.", at: daysAgo(0) },
        { from: "agent", text: "Driver 551.23 has known issues. Let's roll back to 546.33 and re-test.", at: daysAgo(0) },
      ],
      status: "in-progress",
      staffId: sid(3),
      meetingLink: "https://meet.deskto.demo/abc-defg-hij",
      createdAt: daysAgo(1),
    },
    {
      id: rid("tkt"),
      customerId: uid,
      subject: "Wifi drops on gaming laptop",
      messages: [
        { from: "customer", text: "Wifi drops every 5-10 min on my ROG Strix. Only happens at home.", at: daysAgo(4) },
        { from: "agent", text: "Could be a power-saving setting. Let's hop on a remote session to fix.", at: daysAgo(3) },
      ],
      status: "resolved",
      staffId: sid(3),
      createdAt: daysAgo(4),
    },
  ];

  // Reviews
  store.reviews = [
    { id: rid("rvw"), customerId: uid, productId: 1, rating: 5, text: "Blazing fast, whisper quiet. The build quality is insane.", createdAt: daysAgo(20) },
    { id: rid("rvw"), customerId: uid, serviceId: "repair", rating: 4, text: "Laptop overheating fix worked great. Turnaround was a bit long.", createdAt: daysAgo(10) },
    { id: rid("rvw"), customerId: uid, productId: 20, rating: 5, text: "Best mouse I've owned, period.", createdAt: daysAgo(35) },
  ];

  // Rewards
  store.rewards = [
    {
      customerId: uid,
      points: 1240,
      history: [
        { label: "Order #1 delivered", delta: +500, at: daysAgo(22) },
        { label: "Review submitted", delta: +50, at: daysAgo(20) },
        { label: "Repair completed", delta: +200, at: daysAgo(8) },
        { label: "Birthday bonus", delta: +500, at: daysAgo(60) },
        { label: "Coupon redeemed", delta: -10, at: daysAgo(15) },
      ],
    },
  ];

  // Coupons
  store.coupons = [
    { id: rid("cpn"), code: "WELCOME10", description: "10% off first order", discountPercent: 10, minSpend: 50000, expiresAt: daysFromNow(45), redeemed: false },
    { id: rid("cpn"), code: "REPAIR500", description: "₹500 off any repair", discountPercent: 0, minSpend: 1500, expiresAt: daysFromNow(20), redeemed: false },
    { id: rid("cpn"), code: "GAMING25", description: "25% off gaming peripherals", discountPercent: 25, minSpend: 5000, expiresAt: daysFromNow(60), redeemed: false },
  ];

  // Notifications for the customer
  store.notifications = [
    { id: rid("ntf"), customerId: uid, title: "Order shipped", detail: "Your order #DSP-22 is on the way.", type: "order", read: false, archived: false, createdAt: daysAgo(1) },
    { id: rid("ntf"), customerId: uid, title: "Technician assigned", detail: "Rohit will handle your Dell XPS repair.", type: "repair", read: false, archived: false, createdAt: daysAgo(1) },
    { id: rid("ntf"), customerId: uid, title: "Rental ending soon", detail: "Lenovo Legion returns in 2 days.", type: "rental", read: true, archived: false, createdAt: daysAgo(0) },
    { id: rid("ntf"), customerId: uid, title: "Warranty expiring", detail: "Phantom X warranty expires in 60 days.", type: "warranty", read: false, archived: false, createdAt: daysAgo(0) },
    { id: rid("ntf"), customerId: uid, title: "Offer available", detail: "20% off all gaming laptops — GAMING25.", type: "offer", read: true, archived: false, createdAt: daysAgo(2) },
  ];

  // Staff
  store.staff = [
    { id: sid(1), name: "Rohit Sharma", email: "rohit@deskto.in", role: "technician", department: "Repairs", joinedAt: daysAgo(420), performance: { jobs: 142, rating: 4.8, attendancePct: 96 } },
    { id: sid(2), name: "Anita Verma", email: "anita@deskto.in", role: "technician", department: "PC Assembly", joinedAt: daysAgo(310), performance: { jobs: 98, rating: 4.9, attendancePct: 98 } },
    { id: sid(3), name: "Vikram Singh", email: "vikram@deskto.in", role: "support", department: "Remote Support", joinedAt: daysAgo(180), performance: { jobs: 320, rating: 4.7, attendancePct: 94 } },
    { id: sid(4), name: "Neha Iyer", email: "neha@deskto.in", role: "sales", department: "Sales Floor", joinedAt: daysAgo(95), performance: { jobs: 67, rating: 4.6, attendancePct: 92 } },
    { id: sid(5), name: "Karan Patel", email: "karan@deskto.in", role: "delivery", department: "Logistics", joinedAt: daysAgo(240), performance: { jobs: 215, rating: 4.5, attendancePct: 91 } },
  ];

  // Tasks (today's assignments)
  store.tasks = [
    { id: rid("tsk"), staffId: sid(1), title: "Diagnose Dell XPS overheating", detail: "Customer reports thermal throttling", status: "in-progress", dueAt: daysFromNow(0), createdAt: daysAgo(5) },
    { id: rid("tsk"), staffId: sid(1), title: "Quote for Razer mouse", detail: "Estimate switch replacement", status: "done", dueAt: daysAgo(0), createdAt: daysAgo(2) },
    { id: rid("tsk"), staffId: sid(1), title: "Receive replacement parts", detail: "Order #PO-1142 arrived", status: "todo", dueAt: daysFromNow(1), createdAt: daysAgo(0) },
    { id: rid("tsk"), staffId: sid(2), title: "Continue PC build #PCB-1", detail: "Stress-test 12h remaining", status: "in-progress", dueAt: daysFromNow(0), createdAt: daysAgo(7) },
    { id: rid("tsk"), staffId: sid(3), title: "Join remote session", detail: "Customer on Cyberpunk crash", status: "in-progress", dueAt: daysFromNow(0), createdAt: daysAgo(1) },
  ];

  // Attendance (today + last week sample)
  store.attendance = Array.from({ length: 7 }).map((_, i) => ({
    staffId: sid(1),
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    clockIn: Date.now() - i * 86400000 - 28800000,
    breakStart: Date.now() - i * 86400000 - 21600000,
    breakEnd: Date.now() - i * 86400000 - 19800000,
    clockOut: Date.now() - i * 86400000 - 3600000,
    hours: 8.5,
  }));

  // Inventory requests
  store.inventoryRequests = [
    { id: rid("inv"), staffId: sid(2), component: "Thermal paste", qty: 10, reason: "Restock for assembly queue", status: "approved", createdAt: daysAgo(2) },
    { id: rid("inv"), staffId: sid(1), component: "Mouse switches (Omron)", qty: 20, reason: "Repair backlog", status: "pending", createdAt: daysAgo(0) },
  ];

  // Deliveries
  store.deliveries = [
    { id: rid("dlv"), staffId: sid(5), orderId: "DSP-22", customerName: "Demo Customer", address: "12 Park Avenue, Mumbai", status: "dispatched", createdAt: daysAgo(1) },
    { id: rid("dlv"), staffId: sid(5), orderId: "DSP-23", customerName: "Demo Customer", address: "Tower B, BKC, Mumbai", status: "ready", createdAt: daysAgo(0) },
  ];

  // Suppliers
  store.suppliers = [
    { id: rid("sup"), name: "Intel India", contact: "+91-22-5555-1100", email: "b2b@intel.in", components: ["CPU"] },
    { id: rid("sup"), name: "NVIDIA Distributors", contact: "+91-80-4444-9988", email: "orders@nvindi.in", components: ["GPU"] },
    { id: rid("sup"), name: "Samsung Memory", contact: "+91-44-3333-7766", email: "b2b@samsung.in", components: ["RAM", "NVMe"] },
    { id: rid("sup"), name: "Cooler Master", contact: "+91-22-2222-3344", email: "sales@cm.in", components: ["Cooler", "Case"] },
  ];

  // Purchase Orders
  store.purchaseOrders = [
    { id: "PO-1142", supplierId: store.suppliers[0].id, items: [{ component: "i9-14900K", qty: 10, cost: 50000 }], total: 500000, status: "received", createdAt: daysAgo(14) },
    { id: "PO-1143", supplierId: store.suppliers[1].id, items: [{ component: "RTX 4080 Super", qty: 6, cost: 92000 }], total: 552000, status: "sent", createdAt: daysAgo(2) },
  ];

  // Marketplace
  store.marketplace = [
    { id: rid("mkt"), sellerName: "Aakash Mehta", productName: "RTX 3080 Founders Edition", condition: "Used — 18 months", askingPrice: 38000, status: "inspecting", createdAt: daysAgo(3) },
    { id: rid("mkt"), sellerName: "Priya Nair", productName: "Logitech G502", condition: "Used — 6 months", askingPrice: 2200, status: "submitted", createdAt: daysAgo(1) },
  ];

  // CRM Notes
  store.crmNotes = [
    { id: rid("crm"), customerId: uid, text: "Customer prefers WhatsApp for status updates.", by: "Admin", at: daysAgo(20) },
    { id: rid("crm"), customerId: uid, text: "Repeat buyer — 3 orders, 1 repair. Eligible for VIP tier.", by: "Admin", at: daysAgo(5) },
  ];

  // Audit logs
  store.auditLogs = [
    { id: rid("log"), event: "order_placed", detail: "Order #DSP-22 placed by demo customer", actor: uid, at: daysAgo(28) },
    { id: rid("log"), event: "repair_received", detail: "Dell XPS 15 received for repair", actor: uid, at: daysAgo(5) },
    { id: rid("log"), event: "staff_assigned", detail: "Rohit Sharma assigned to repair REP-1", actor: "admin", at: daysAgo(4) },
    { id: rid("log"), event: "settings_updated", detail: "GST rate changed from 18% to 18%", actor: "admin", at: daysAgo(10) },
    { id: rid("log"), event: "coupon_created", detail: "Coupon WELCOME10 created", actor: "admin", at: daysAgo(15) },
  ];

  // Offers
  store.offers = [
    { id: rid("ofr"), title: "Gaming Laptop Festival", detail: "Up to 25% off on ROG, Alienware, MSI gaming laptops.", expiresAt: daysFromNow(30), code: "GAMING25" },
    { id: rid("ofr"), title: "Free Assembly", detail: "Free professional assembly on any PC build above ₹80,000.", expiresAt: daysFromNow(60), code: "FREEBUILD" },
  ];

  return store;
}

// ── PERSISTENCE ───────────────────────────────────────────────────────────

function loadStore(): DashboardStore {
  if (typeof window === "undefined") return emptyStore();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = migrateStore(seedStore());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = migrateStore(JSON.parse(raw) as DashboardStore);
    saveStore(parsed);
    return parsed;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: DashboardStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function readAuthStaff(): StaffMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    return users
      .filter((u: any) => String(u?.role || "").toLowerCase() === "staff")
      .map((u: any) => ({
        id: String(u.id || u.email),
        name: String(u.name || u.email || "Staff"),
        email: String(u.email || ""),
        role: "technician" as const,
        department: String(u.department || "Repairs"),
        joinedAt: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
        performance: { jobs: 0, rating: 5, attendancePct: 100 },
      }));
  } catch {
    return [];
  }
}

function migrateStore(store: DashboardStore): DashboardStore {
  store.enquiries = store.enquiries || [];
  let changed = false;
  const orders = (store.orders || []).map(order => {
    const hasCanonicalTimeline = order.trackingSteps?.length === ORDER_TIMELINE_LABELS.length
      && order.trackingSteps.every(step => ORDER_TIMELINE_LABELS.includes(step.label));
    const hasValidWarranty = !order.warrantyEndsAt || typeof order.warrantyEndsAt === "number";
    if (hasCanonicalTimeline && order.updatedAt && hasValidWarranty) return order;
    changed = true;
    return {
      ...order,
      trackingSteps: order.trackingSteps?.length ? mergeOrderTimeline(order, order.status) : orderTimelineThrough(order.status || "placed", order.createdAt),
      updatedAt: order.updatedAt || order.createdAt,
      invoiceId: order.invoiceId || (["shipped", "delivered"].includes(order.status) ? `INV-${order.id.slice(-6).toUpperCase()}` : undefined),
      warrantyEndsAt: typeof order.warrantyEndsAt === "number" ? order.warrantyEndsAt : (order.status === "delivered" ? order.createdAt + 365 * 24 * 60 * 60 * 1000 : undefined),
    };
  });
  const staffByEmail = new Map((store.staff || []).map(staff => [staff.email.toLowerCase(), staff]));
  readAuthStaff().forEach(staff => {
    const key = staff.email.toLowerCase() || staff.id;
    if (!staffByEmail.has(key)) {
      staffByEmail.set(key, staff);
      changed = true;
    }
  });
  const staff = Array.from(staffByEmail.values());
  const repairs = (store.repairs || []).map(repair => {
    if (repair.timeline?.length >= REPAIR_TIMELINE_LABELS.length && repair.serviceCategory) return repair;
    changed = true;
    return {
      ...repair,
      serviceCategory: repair.serviceCategory || "repair",
      deviceType: repair.deviceType || (repair.device.toLowerCase().includes("laptop") || repair.device.toLowerCase().includes("xps") ? "Laptop" : "Desktop"),
      brand: repair.brand || repair.device.split(" ")[0],
      model: repair.model || repair.device.split(" ").slice(1).join(" "),
      serviceType: repair.serviceType || "Shop Visit",
      preferredSlot: repair.preferredSlot || "Schedule pending",
      estimatedCharge: repair.estimatedCharge || 499,
      qualityChecks: repair.qualityChecks || ["Stress Testing", "Temperature Test", "Performance Benchmark", "Hardware Verification", "Software Verification"].map(label => ({ label, done: false })),
      timeline: repairTimelineThrough(repair.status as RepairStatus, repair.createdAt),
      updatedAt: repair.updatedAt || repair.createdAt,
    };
  });
  const pcBuilds = (store.pcBuilds || []).map(build => {
    if (build.timeline?.length && build.purpose) return build;
    changed = true;
    return {
      ...build,
      purpose: build.purpose || "Gaming",
      budgetRange: build.budgetRange || "Budget pending",
      preferredBrand: build.preferredBrand || "Any",
      performanceLevel: build.performanceLevel || "Mid",
      validationReport: build.validationReport || [
        { label: "CPU Socket Compatibility", pass: true, detail: "Validated by DESKTO" },
        { label: "PSU Wattage", pass: true, detail: "Estimated power within safe range" },
        { label: "GPU Clearance", pass: true, detail: "Cabinet clearance checked" },
      ],
      assemblyChecklist: build.assemblyChecklist || ["Install CPU", "Install Cooler", "Install RAM", "Install SSD", "Install Motherboard", "Install PSU", "Install GPU", "Cable Management", "RGB Setup", "BIOS Configuration"].map(label => ({ label, done: false })),
      testResults: build.testResults || ["Boot Test", "Temperature Test", "Stress Test", "Benchmark Test", "GPU Test", "RAM Test", "SSD Health Test", "Power Stability Test", "RGB Test", "Final Quality Check"].map(label => ({ label, done: false })),
      assemblyCharge: build.assemblyCharge || 8000,
      gst: build.gst || Math.round(build.total * 0.18),
      shipping: build.shipping || 0,
      estimatedDelivery: build.estimatedDelivery || "5-7 working days",
      quotation: build.quotation || build.total,
      timeline: pcBuildTimelineThrough(build.status as PCBuildStatus, build.createdAt),
      updatedAt: build.updatedAt || build.createdAt,
    };
  });
  const serviceRequests = (store.serviceRequests || []).map(request => {
    if (request.timeline?.length) return request;
    changed = true;
    return {
      ...request,
      title: request.title || (request.kind === "upgrade" ? "Upgrade & Optimization" : request.kind === "assembly" ? "Assembly Service" : "Software & Data Service"),
      checklist: request.checklist || defaultServiceChecklist(request.kind),
      qaChecks: request.qaChecks || defaultServiceQa(request.kind),
      timeline: serviceTimelineThrough(request.kind, request.status || "submitted", request.createdAt || Date.now()),
      updatedAt: request.updatedAt || request.createdAt,
    };
  });
  const gamingHub = (store.gamingHub || []).length ? store.gamingHub : defaultGamingHubItems();
  if (!(store.gamingHub || []).length) changed = true;

  // Backfill catalog products that were added to the seed after this browser's store was first created
  const rawProducts = store.products || [];
  const afterRemoval = rawProducts.filter(p => !REMOVED_SEED_PRODUCT_IDS.has(p.id));
  const missingSeedProducts = SEEDED_BACKFILL_PRODUCTS.filter(seedProduct =>
    !afterRemoval.some(p => p.sku === seedProduct.sku || p.id === seedProduct.id));
  const products = missingSeedProducts.length ? [...afterRemoval, ...missingSeedProducts] : afterRemoval;
  if (missingSeedProducts.length || afterRemoval.length !== rawProducts.length) changed = true;

  // Migrate customBuilderConfig — inject seeded components if all categories are empty
  const defaultConfig = createDefaultBuilderConfig();
  const storedConfig = store.customBuilderConfig || defaultConfig;
  const hasSeededComponents = Object.values(storedConfig.components || {}).flat().length > 0;
  const migratedConfig: CustomBuilderConfig = hasSeededComponents ? storedConfig : {
    ...defaultConfig,
    ...storedConfig,
    components: defaultConfig.components,
    defaultPresets: storedConfig.defaultPresets?.every(p => Object.keys(p.components).length > 0)
      ? storedConfig.defaultPresets
      : defaultConfig.defaultPresets,
    lastModifiedAt: storedConfig.lastModifiedAt || defaultConfig.lastModifiedAt,
  };
  if (!hasSeededComponents) changed = true;

  return changed
    ? { ...store, orders, staff, repairs, pcBuilds, serviceRequests, gamingHub, customBuilderConfig: migratedConfig, products }
    : { ...store, orders, serviceRequests, gamingHub, customBuilderConfig: migratedConfig, products };
}

const ORDER_TIMELINE_LABELS = ["Order Placed", "Admin Verified", "Packing", "Shipped", "Delivered"];
const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  verified: "Admin Verified",
  packing: "Packing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Order Placed",
};

function orderTimelineThrough(status: OrderStatus, at: number) {
  const targetIndex = ORDER_TIMELINE_LABELS.indexOf(ORDER_STATUS_LABEL[status]);
  return ORDER_TIMELINE_LABELS.map((label, i) => ({
    label,
    done: status !== "cancelled" && i <= targetIndex,
    at: status !== "cancelled" && i <= targetIndex ? at : 0,
  }));
}

function mergeOrderTimeline(order: Order, status: OrderStatus) {
  const existing = order.trackingSteps?.length ? order.trackingSteps : orderTimelineThrough("placed", order.createdAt);
  const labelAliases: Record<string, string> = {
    "Order placed": "Order Placed",
    "Verified": "Admin Verified",
    "Out for delivery": "Shipped",
  };
  if (status === "cancelled") {
    return ORDER_TIMELINE_LABELS.map(label => {
      const current = existing.find(step => (labelAliases[step.label] || step.label) === label);
      return { label, done: label === "Order Placed" && Boolean(current?.done), at: label === "Order Placed" ? (current?.at || order.createdAt) : 0 };
    });
  }
  const targetIndex = ORDER_TIMELINE_LABELS.indexOf(ORDER_STATUS_LABEL[status]);
  return ORDER_TIMELINE_LABELS.map((label, i) => {
    const current = existing.find(step => (labelAliases[step.label] || step.label) === label);
    const done = i <= targetIndex || Boolean(current?.done);
    return { label, done, at: done ? (current?.at || Date.now()) : 0 };
  });
}

function mergeRepairTimeline(repair: Repair, status: RepairStatus) {
  const existing = repair.timeline?.length ? repair.timeline : repairTimelineThrough("submitted", repair.createdAt);
  const target = REPAIR_STATUS_LABEL[status];
  if (!target) return existing;
  const targetIndex = REPAIR_TIMELINE_LABELS.indexOf(target);
  return REPAIR_TIMELINE_LABELS.map((label, i) => {
    const current = existing.find(step => step.label === label);
    const done = i <= targetIndex || Boolean(current?.done);
    return {
      label,
      done,
      at: done ? (current?.at || Date.now()) : 0,
    };
  });
}

function mergePCBuildTimeline(build: PCBuild, status: PCBuildStatus) {
  const existing = build.timeline?.length ? build.timeline : pcBuildTimelineThrough("submitted", build.createdAt);
  const target = PC_BUILD_STATUS_LABEL[status];
  if (!target) return existing;
  const targetIndex = PC_BUILD_TIMELINE_LABELS.indexOf(target);
  return PC_BUILD_TIMELINE_LABELS.map((label, i) => {
    const current = existing.find(step => step.label === label);
    const done = i <= targetIndex || Boolean(current?.done);
    return { label, done, at: done ? (current?.at || Date.now()) : 0 };
  });
}

function mergeServiceTimeline(request: ServiceRequest, status: ServiceRequestStatus) {
  const existing = request.timeline?.length ? request.timeline : serviceTimelineThrough(request.kind, "submitted", request.createdAt);
  const labels = request.kind === "upgrade" ? UPGRADE_TIMELINE_LABELS : request.kind === "software" ? SOFTWARE_TIMELINE_LABELS : request.kind === "rental" ? RENTAL_TIMELINE_LABELS : request.kind === "sell" ? SELL_TIMELINE_LABELS : request.kind === "assembly" ? ASSEMBLY_TIMELINE_LABELS : SUPPORT_TIMELINE_LABELS;
  const rawLabel = SERVICE_STATUS_LABEL[status] || labels[0];
  const remap: Record<ServiceRequestKind, Record<string, string>> = {
    upgrade: {},
    software: { "Upgrade Request Submitted": "Service Request Submitted" },
    rental: { "Customer Approved": "Rental Approved", "Components Reserved": "Product Reserved", "Quality Testing": "Inspection Completed", "Invoice Generated": "Final Invoice Generated" },
    sell: { "Upgrade Request Submitted": "Sell Request Submitted", "Request Received": "Admin Review", "Technician Assigned": "Inspection Scheduled", "System Inspection": "Product Inspected", "Customer Approved": "Offer Accepted", "Payment Successful": "Payment Completed", "Review Requested": "Request Closed" },
    support: { "Upgrade Request Submitted": "Ticket Submitted", "Technician Assigned": "Ticket Assigned", "Customer Approved": "Issue Resolved", "Payment Successful": "Payment Completed", "Review Requested": "Ticket Closed" },
    assembly: ASSEMBLY_LABEL_REMAP,
  };
  const targetLabel = remap[request.kind][rawLabel] || rawLabel;
  const targetIndex = Math.max(0, labels.indexOf(targetLabel));
  return labels.map((label, i) => {
    const current = existing.find(step => step.label === label);
    const done = i <= targetIndex || Boolean(current?.done);
    return { label, done, at: done ? (current?.at || Date.now()) : 0 };
  });
}

function defaultServiceChecklist(kind: ServiceRequestKind) {
  const labels = kind === "upgrade"
    ? ["Inspect Existing PC", "Run Hardware Diagnostics", "Run Performance Benchmark", "Check Upgrade Compatibility", "Check BIOS Compatibility", "Estimate Power Consumption", "Reserve Components", "Backup Important Data", "Install Components", "Cable Management", "Driver Installation", "BIOS Update", "OS Optimization", "RGB Configuration"]
    : kind === "software"
      ? ["Run System Diagnostics", "Check Operating System", "Check Storage Health", "Check Driver Status", "Check Virus/Malware", "Backup Existing Data", "Install Operating System", "Install Drivers", "Install Requested Software", "Activate Licensed Software", "Restore User Data", "Create Restore Point"]
      : kind === "rental"
        ? ["Verify Identity Proof", "Verify Address Proof", "Generate Rental Agreement", "Reserve Product", "Assign Serial Number", "Inspect Product", "Clean Product", "Install Required Software", "Package Product", "Dispatch Product", "Return Inspection", "Refund Deposit"]
        : kind === "sell"
          ? ["Verify Photos & Bill", "Schedule Inspection", "Verify Serial Number", "Check Physical Condition", "Run Hardware Test", "Check Battery/Display/Ports", "Upload Inspection Report", "Prepare for Resale", "Add to Inventory", "Publish Listing"]
          : kind === "assembly"
            ? ["Verify Provided Equipment", "Record Missing / Damaged Items", "Cabinet Preparation", "Motherboard Installation", "CPU & Cooler Installation", "RAM Installation", "SSD / HDD Installation", "GPU Installation", "PSU Installation", "Internal Wiring", "Cable Management", "Peripheral / Device Setup", "BIOS Configuration", "Boot Order & RAID Setup", "Driver Installation", "OS & Software Installation", "Network Configuration", "Capture Before/After Photos"]
            : ["Review Issue", "Classify Severity", "Prepare Remote Software", "Generate Session Link", "Create Restore Point", "Run Diagnostics", "Resolve Issue", "Final Health Check", "Upload Work Summary", "Close Ticket"];
  return labels.map(label => ({ label, done: false }));
}

function defaultServiceQa(kind: ServiceRequestKind) {
  const labels = kind === "upgrade"
    ? ["Boot Test", "Temperature Test", "Stress Test", "Before vs After Benchmark", "Gaming FPS Test", "Storage Speed Test", "RAM Stability Test", "Quality Control Approval"]
    : kind === "software"
      ? ["System Boot Test", "Software Functionality Test", "License Verification", "Internet Test", "Printer Test", "Application Test", "Performance Benchmark", "Final Quality Check"]
      : kind === "rental"
        ? ["Document Verification", "Product Availability", "Hardware Test", "Accessories Check", "Delivery Confirmation", "Return Condition", "Damage Check", "Refund Approval"]
        : kind === "sell"
          ? ["Serial Verified", "Physical Condition", "Hardware Test", "Battery/Display/Ports", "Cleaning Notes", "Inventory Ready", "Certified Used", "Resale Published"]
          : kind === "assembly"
            ? ["Power Test", "POST Test", "BIOS Detection", "CPU Temperature", "RAM Detection", "SSD / HDD Detection", "GPU Detection", "Fan Test", "USB Ports", "LAN / Wi-Fi", "Display Test", "Audio Test", "Network Connectivity", "Quality Control Approval"]
            : ["Identity Verification", "Remote Access Granted", "Issue Resolved", "Customer Confirmation", "Service Report", "Invoice", "Payment", "Feedback"];
  return labels.map(label => ({ label, done: false }));
}

// ── HOOK ──────────────────────────────────────────────────────────────────

export function useDashboardData() {
  const [store, setStore] = useState<DashboardStore>(() => loadStore());

  const addLog = useCallback((event: string, detail: string, actor?: string) => {
    setStore(prev => {
      const log: AuditLog = { id: rid("log"), event, detail, actor, at: Date.now() };
      const next = { ...prev, auditLogs: [log, ...prev.auditLogs].slice(0, 200) };
      saveStore(next);
      return next;
    });
  }, []);

  const persist = useCallback((next: DashboardStore) => {
    saveStore(next);
    setStore(next);
  }, []);

  const addQuickEnquiry = useCallback((input: Omit<QuickEnquiry, "id" | "status" | "createdAt">) => {
    const enquiry: QuickEnquiry = { ...input, id: rid("enq"), status: "new", createdAt: Date.now() };
    setStore(prev => {
      const next = {
        ...prev,
        enquiries: [enquiry, ...(prev.enquiries || [])],
        notifications: [
          { id: rid("ntf"), audience: "admins" as const, title: "New quick enquiry", detail: `${enquiry.name} asked about ${enquiry.serviceNeeded}.`, type: "system" as const, read: false, archived: false, createdAt: enquiry.createdAt },
          ...prev.notifications,
        ],
      };
      saveStore(next);
      return next;
    });
    addLog("quick_enquiry", `${enquiry.name} submitted quick enquiry for ${enquiry.serviceNeeded}`);
    return enquiry;
  }, [addLog]);

  const updateQuickEnquiryStatus = useCallback((id: string, status: QuickEnquiry["status"]) => {
    setStore(prev => {
      const next = { ...prev, enquiries: (prev.enquiries || []).map(e => e.id === id ? { ...e, status } : e) };
      saveStore(next);
      return next;
    });
    addLog("quick_enquiry_status", `Quick enquiry ${id.slice(-8).toUpperCase()} → ${status}`);
  }, [addLog]);
  
  const autoNotifyStatusChange = useCallback((
    type: "order" | "repair" | "rental" | "support" | "system",
    id: string,
    customerId: string,
    oldStatus: string | undefined,
    newStatus: string
  ) => {
    if (oldStatus === newStatus || !newStatus) return;
    
    setStore(prev => {
      const notification: NotificationItem = {
        id: rid("ntf"),
        customerId,
        title: `Status Update: ${type.toUpperCase()}`,
        detail: `Your ${type === "system" ? "service" : type} #${id.slice(-6).toUpperCase()} is now ${newStatus.replace(/-/g, ' ').toUpperCase()}`,
        type,
        read: false,
        archived: false,
        createdAt: Date.now()
      };
      const next = { ...prev, notifications: [notification, ...prev.notifications] };
      saveStore(next);
      return next;
    });
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    let customerId = "";
    let oldStatus = "";

    setStore(prev => {
      const order = prev.orders.find(o => o.id === orderId);
      if (order) {
        customerId = order.customerId;
        oldStatus = order.status;
      }

      const next = {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? {
          ...o,
          status,
          trackingSteps: mergeOrderTimeline(o, status),
          updatedAt: Date.now(),
          invoiceId: ["shipped", "delivered"].includes(status) ? (o.invoiceId || `INV-${o.id.slice(-6).toUpperCase()}`) : o.invoiceId,
          warrantyEndsAt: status === "delivered" ? (o.warrantyEndsAt || Date.now() + 365 * 24 * 60 * 60 * 1000) : o.warrantyEndsAt,
        } : o),
      };
      saveStore(next);
      return next;
    });

    if (customerId && oldStatus !== status) {
      autoNotifyStatusChange("order", orderId, customerId, oldStatus, status);
    }
    addLog("order_status", `Order ${orderId} → ${status}`);

    // Sync to backend if we have an API token. Fire-and-forget so the UI
    // stays responsive; on failure we keep the local change (the next
    // hydration from the backend will reconcile).
    if (isApiAuthenticated()) {
      // The orderId in the local store may be the human-friendly order number
      // (e.g. ORD-1717000000000). Backend updateStatus uses the primary key.
      // We rely on the backend's `id::text = $1 OR order_number = $1` lookup,
      // so passing the order number is safe.
      ordersApi.updateStatus(orderId, status)
        .catch((err) => {
          console.warn("[dashboard] failed to sync order status to backend:", err);
        });
    }
  }, [addLog, autoNotifyStatusChange]);

  const patchOrder = useCallback((orderId: string, patch: Partial<Order>) => {
    setStore(prev => {
      const next = {
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? { ...o, ...patch, updatedAt: Date.now() } : o),
      };
      saveStore(next);
      return next;
    });
    addLog("order_update", `Order ${orderId} updated`);
  }, [addLog]);

  const addOrder = useCallback((input: AddOrderInput) => {
    const createdAt = input.createdAt || Date.now();
    const orderId = input.id || rid("ord");
    const order: Order = {
      ...input,
      id: orderId,
      createdAt,
      updatedAt: createdAt,
      deliveryStatus: input.deliveryMethod === "ship" ? "pending" as const : undefined,
      trackingSteps: input.trackingSteps?.length ? input.trackingSteps : orderTimelineThrough(input.status, createdAt),
    };

    // Auto-create delivery record for ship orders
    const delivery: Delivery | null = input.deliveryMethod === "ship" && input.shippingAddress ? {
      id: rid("del"),
      orderId,
      order,
      customerName: input.customerName || input.shippingAddress.name,
      customerPhone: input.shippingAddress.phone,
      address: [input.shippingAddress.line1, input.shippingAddress.line2].filter(Boolean).join(", "),
      city: input.shippingAddress.city,
      state: input.shippingAddress.state,
      pincode: input.shippingAddress.pincode,
      status: "pending",
      createdAt,
    } : null;

    if (delivery) {
      order.deliveryId = delivery.id;
    }

    setStore(prev => {
      const exists = prev.orders.some(o => o.id === order.id);
      const next = {
        ...prev,
        orders: exists ? prev.orders.map(o => o.id === order.id ? order : o) : [order, ...prev.orders],
        deliveries: delivery ? [delivery, ...prev.deliveries] : prev.deliveries,
        notifications: [
          {
            id: rid("ntf"),
            customerId: order.customerId,
            title: "🛒 New Order Received",
            detail: `Order ${order.id} — ${order.items.length} item${order.items.length !== 1 ? "s" : ""} · ₹${(order.total || 0).toLocaleString()} · ${order.deliveryMethod === "ship" ? "🚚 Delivery" : "📦 Pickup"}`,
            type: "order" as const,
            createdAt,
            read: false,
            archived: false,
          },
          ...prev.notifications,
        ],
      };
      saveStore(next);
      return next;
    });
    addLog("order_created", `Order ${order.id} created — ${order.deliveryMethod === "ship" ? "delivery" : "pickup"}`, order.customerName || order.customerEmail || "customer");
    return order;
  }, [addLog]);

  const updateRepairStatus = useCallback((repairId: string, status: RepairStatus) => {
    let customerId = "";
    let oldStatus = "";
    
    setStore(prev => {
      const repair = prev.repairs.find(r => r.id === repairId);
      if (repair) {
        customerId = repair.customerId;
        oldStatus = repair.status;
      }
      
      const next = {
        ...prev,
        repairs: prev.repairs.map(r => r.id === repairId ? { ...r, status, timeline: mergeRepairTimeline(r, status), updatedAt: Date.now() } : r),
      };
      saveStore(next);
      return next;
    });
    
    if (customerId && oldStatus !== status) {
      autoNotifyStatusChange("repair", repairId, customerId, oldStatus, status);
    }
    addLog("repair_status", `Repair ${repairId} → ${status}`);
  }, [addLog, autoNotifyStatusChange]);

  const addRepairRequest = useCallback((input: Omit<Repair, "status" | "timeline" | "createdAt" | "updatedAt"> & { id?: string; status?: RepairStatus }) => {
    const status = input.status || "submitted";
    const repair: Repair = {
      ...input,
      id: input.id || rid("rep"),
      status,
      timeline: repairTimelineThrough(status, Date.now()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStore(prev => {
      const next = {
        ...prev,
        repairs: [repair, ...prev.repairs],
        notifications: [
          {
            id: rid("ntf"),
            customerId: repair.customerId,
            title: "Repair request submitted",
            detail: `${repair.device} repair request ${repair.id.slice(-8).toUpperCase()} was created.`,
            type: "repair",
            read: false,
            archived: false,
            createdAt: Date.now(),
          },
          ...prev.notifications,
        ],
      };
      saveStore(next);
      return next;
    });
    addLog("repair_submitted", `${repair.device} repair request created`, repair.customerId);
    return repair;
  }, [addLog]);

  const patchRepair = useCallback((repairId: string, patch: Partial<Repair>) => {
    let customerId = "";
    let oldStatus = "";
    let newStatus = patch.status;
    
    setStore(prev => {
      const before = prev.repairs.find(r => r.id === repairId);
      if (before) {
        customerId = before.customerId;
        oldStatus = before.status;
      }
      
      const assignedStaff = patch.technicianId && patch.technicianId !== before?.technicianId
        ? prev.staff.find(s => s.id === patch.technicianId)
        : undefined;
      const next = {
        ...prev,
        repairs: prev.repairs.map(r => {
          if (r.id !== repairId) return r;
          const status = patch.status || r.status;
          return {
            ...r,
            ...patch,
            status,
            timeline: patch.status ? mergeRepairTimeline({ ...r, ...patch }, patch.status) : r.timeline,
            technicianLastStatusAt: patch.status ? Date.now() : r.technicianLastStatusAt,
            updatedAt: Date.now(),
          };
        }),
        notifications: assignedStaff ? [
          {
            id: rid("ntf"),
            staffId: assignedStaff.id,
            title: "Repair assigned",
            detail: `${before?.device || "Repair"} ticket ${repairId.slice(-8).toUpperCase()} assigned by admin.`,
            type: "repair" as const,
            read: false,
            archived: false,
            createdAt: Date.now(),
          },
          ...prev.notifications,
        ] : prev.notifications,
      };
      saveStore(next);
      return next;
    });
    
    if (newStatus && customerId && oldStatus !== newStatus) {
      autoNotifyStatusChange("repair", repairId, customerId, oldStatus, newStatus);
    }
    addLog("repair_updated", `Repair ${repairId} updated`);
  }, [addLog, autoNotifyStatusChange]);

  const addPCBuildRequest = useCallback((input: Omit<PCBuild, "status" | "timeline" | "createdAt" | "updatedAt"> & { id?: string; status?: PCBuildStatus }) => {
    const status = input.status || "submitted";
    const build: PCBuild = {
      ...input,
      id: input.id || rid("pcb"),
      status,
      timeline: pcBuildTimelineThrough(status, Date.now()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStore(prev => {
      const next = {
        ...prev,
        pcBuilds: [build, ...prev.pcBuilds],
        notifications: [
          { id: rid("ntf"), customerId: build.customerId, title: "Custom PC request submitted", detail: `${build.name} request ${build.id.slice(-8).toUpperCase()} was created.`, type: "system", read: false, archived: false, createdAt: Date.now() },
          ...prev.notifications,
        ],
      };
      saveStore(next);
      return next;
    });
    addLog("pc_build_submitted", `${build.name} custom PC request created`, build.customerId);
    return build;
  }, [addLog]);

  const patchPCBuild = useCallback((buildId: string, patch: Partial<PCBuild>) => {
    let customerId = "";
    let oldStatus = "";
    let newStatus = patch.status;
    
    setStore(prev => {
      const before = prev.pcBuilds.find(build => build.id === buildId);
      if (before) {
        customerId = before.customerId;
        oldStatus = before.status;
      }
      
      const assignedStaff = patch.technicianId && patch.technicianId !== before?.technicianId
        ? prev.staff.find(staff => staff.id === patch.technicianId)
        : undefined;
      const next = {
        ...prev,
        pcBuilds: prev.pcBuilds.map(b => {
          if (b.id !== buildId) return b;
          const status = patch.status || b.status;
          return {
            ...b,
            ...patch,
            status,
            timeline: patch.status ? mergePCBuildTimeline({ ...b, ...patch }, patch.status) : b.timeline,
            technicianLastStatusAt: patch.status ? Date.now() : b.technicianLastStatusAt,
            updatedAt: Date.now(),
          };
        }),
        notifications: assignedStaff ? [
          {
            id: rid("ntf"),
            staffId: assignedStaff.id,
            title: "Custom PC assigned",
            detail: `${before?.name || "Custom PC build"} ${buildId.slice(-8).toUpperCase()} assigned by admin.`,
            type: "system" as const,
            read: false,
            archived: false,
            createdAt: Date.now(),
          },
          ...prev.notifications,
        ] : prev.notifications,
      };
      saveStore(next);
      return next;
    });
    
    if (newStatus && customerId && oldStatus !== newStatus) {
      autoNotifyStatusChange("system", buildId, customerId, oldStatus, newStatus);
    }
    addLog("pc_build_updated", `PC build ${buildId} updated`);
  }, [addLog, autoNotifyStatusChange]);

  const addServiceRequest = useCallback((input: Omit<ServiceRequest, "status" | "timeline" | "createdAt" | "updatedAt" | "checklist" | "qaChecks"> & { id?: string; status?: ServiceRequestStatus; checklist?: ServiceRequest["checklist"]; qaChecks?: ServiceRequest["qaChecks"] }) => {
    const status = input.status || "submitted";
    const request: ServiceRequest = {
      ...input,
      id: input.id || rid(input.kind === "upgrade" ? "upg" : input.kind === "assembly" ? "asm" : "sft"),
      status,
      paymentStatus: input.paymentStatus || "pending",
      checklist: input.checklist || defaultServiceChecklist(input.kind),
      qaChecks: input.qaChecks || defaultServiceQa(input.kind),
      timeline: serviceTimelineThrough(input.kind, status, Date.now()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setStore(prev => {
      const next = {
        ...prev,
        serviceRequests: [request, ...(prev.serviceRequests || [])],
        notifications: [
          {
            id: rid("ntf"),
            customerId: request.customerId,
            title: `${request.kind === "upgrade" ? "Upgrade" : request.kind === "assembly" ? "Assembly" : "Software"} request submitted`,
            detail: `${request.title} request ${request.id.slice(-8).toUpperCase()} was created.`,
            type: "system",
            read: false,
            archived: false,
            createdAt: Date.now(),
          },
          ...prev.notifications,
        ],
      };
      saveStore(next);
      return next;
    });
    addLog(`${request.kind}_submitted`, `${request.title} request created`, request.customerId);
    return request;
  }, [addLog]);

  const patchServiceRequest = useCallback((requestId: string, patch: Partial<ServiceRequest>) => {
    let customerId = "";
    let oldStatus = "";
    let newStatus = patch.status;
    let kind = "";
    
    setStore(prev => {
      const before = (prev.serviceRequests || []).find(request => request.id === requestId);
      if (before) {
        customerId = before.customerId;
        oldStatus = before.status;
        kind = before.kind;
      }
      
      const assignedStaff = patch.technicianId && patch.technicianId !== before?.technicianId
        ? prev.staff.find(staff => staff.id === patch.technicianId)
        : undefined;
      const next = {
        ...prev,
        serviceRequests: (prev.serviceRequests || []).map(request => {
          if (request.id !== requestId) return request;
          const status = patch.status || request.status;
          const merged = { ...request, ...patch, status };
          return {
            ...merged,
            timeline: patch.status ? mergeServiceTimeline(merged, patch.status) : request.timeline,
            technicianLastStatusAt: patch.status ? Date.now() : request.technicianLastStatusAt,
            updatedAt: Date.now(),
          };
        }),
        notifications: assignedStaff ? [
          {
            id: rid("ntf"),
            staffId: assignedStaff.id,
            title: `${before?.kind === "upgrade" ? "Upgrade" : before?.kind === "software" ? "Software" : before?.kind === "rental" ? "Rental" : before?.kind === "sell" ? "Sell Used" : before?.kind === "assembly" ? "Assembly" : "Support"} assigned`,
            detail: `${before?.title || "Service request"} ${requestId.slice(-8).toUpperCase()} assigned by admin.`,
            type: "system" as const,
            read: false,
            archived: false,
            createdAt: Date.now(),
          },
          ...prev.notifications,
        ] : prev.notifications,
      };
      saveStore(next);
      return next;
    });
    
    if (newStatus && customerId && oldStatus !== newStatus) {
      const notifyType = kind === "rental" ? "rental" : kind === "support" ? "support" : "system";
      autoNotifyStatusChange(notifyType, requestId, customerId, oldStatus, newStatus);
    }
    addLog("service_request_updated", `Service request ${requestId} updated`);
  }, [addLog, autoNotifyStatusChange]);

  const updateRental = useCallback((rentalId: string, patch: Partial<Rental>) => {
    setStore(prev => {
      const next = { ...prev, rentals: prev.rentals.map(r => r.id === rentalId ? { ...r, ...patch } : r) };
      saveStore(next);
      return next;
    });
  }, []);

  const addAddress = useCallback((addr: Omit<Address, "id">) => {
    const a: Address = { ...addr, id: rid("adr") };
    setStore(prev => {
      const next = { ...prev, addresses: [a, ...prev.addresses] };
      saveStore(next);
      return next;
    });
    addLog("address_added", `Address "${a.label}" added`);
  }, [addLog]);

  const deleteAddress = useCallback((id: string) => {
    setStore(prev => {
      const next = { ...prev, addresses: prev.addresses.filter(a => a.id !== id) };
      saveStore(next);
      return next;
    });
  }, []);

  const fileReview = useCallback((r: Omit<Review, "id" | "createdAt">) => {
    const review: Review = { ...r, id: rid("rvw"), createdAt: Date.now() };
    setStore(prev => {
      const next = { ...prev, reviews: [review, ...prev.reviews] };
      saveStore(next);
      return next;
    });
    addLog("review_filed", `${r.rating}★ review filed`);
  }, [addLog]);

  const markNotificationRead = useCallback((id: string) => {
    setStore(prev => {
      const next = { ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) };
      saveStore(next);
      return next;
    });
  }, []);

  const archiveNotification = useCallback((id: string) => {
    setStore(prev => {
      const next = { ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, archived: true } : n) };
      saveStore(next);
      return next;
    });
  }, []);

  const advanceTask = useCallback((taskId: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        tasks: prev.tasks.map(t => {
          if (t.id !== taskId) return t;
          const order: TaskItem["status"][] = ["todo", "in-progress", "done"];
          const idx = order.indexOf(t.status);
          return { ...t, status: order[Math.min(idx + 1, 2)] };
        }),
      };
      saveStore(next);
      return next;
    });
    addLog("task_advanced", `Task ${taskId} advanced`);
  }, [addLog]);

  const clockIn = useCallback((staffId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setStore(prev => {
      const existing = prev.attendance.find(a => a.staffId === staffId && a.date === today);
      const next = {
        ...prev,
        attendance: existing
          ? prev.attendance.map(a => a === existing ? { ...a, clockIn: Date.now() } : a)
          : [...prev.attendance, { staffId, date: today, clockIn: Date.now(), hours: 0 }],
      };
      saveStore(next);
      return next;
    });
    addLog("clock_in", `Staff ${staffId} clocked in`, staffId);
  }, [addLog]);

  const clockOut = useCallback((staffId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setStore(prev => {
      const next = {
        ...prev,
        attendance: prev.attendance.map(a => {
          if (a.staffId !== staffId || a.date !== today || !a.clockIn) return a;
          const hours = (Date.now() - a.clockIn) / 3600000;
          return { ...a, clockOut: Date.now(), hours: Math.round(hours * 10) / 10 };
        }),
      };
      saveStore(next);
      return next;
    });
    addLog("clock_out", `Staff ${staffId} clocked out`, staffId);
  }, [addLog]);

  const submitInventoryRequest = useCallback((req: Omit<InventoryRequest, "id" | "createdAt" | "status">) => {
    const r: InventoryRequest = { ...req, id: rid("inv"), status: "pending", createdAt: Date.now() };
    setStore(prev => {
      const next = { ...prev, inventoryRequests: [r, ...prev.inventoryRequests] };
      saveStore(next);
      return next;
    });
    addLog("inventory_requested", `${req.qty}× ${req.component}`, req.staffId);
  }, [addLog]);

  const approveInventoryRequest = useCallback((id: string, actor?: string) => {
    setStore(prev => {
      const next = { ...prev, inventoryRequests: prev.inventoryRequests.map(r => r.id === id ? { ...r, status: "approved" as const } : r) };
      saveStore(next);
      return next;
    });
    addLog("inventory_approved", `Inventory request ${id} approved`, actor);
  }, [addLog]);

  const rejectInventoryRequest = useCallback((id: string, actor?: string) => {
    setStore(prev => {
      const next = { ...prev, inventoryRequests: prev.inventoryRequests.map(r => r.id === id ? { ...r, status: "rejected" as const } : r) };
      saveStore(next);
      return next;
    });
    addLog("inventory_rejected", `Inventory request ${id} rejected`, actor);
  }, [addLog]);

  const markInventoryReceived = useCallback((id: string, actor?: string) => {
    setStore(prev => {
      const next = { ...prev, inventoryRequests: prev.inventoryRequests.map(r => r.id === id ? { ...r, status: "received" as const } : r) };
      saveStore(next);
      return next;
    });
    addLog("inventory_received", `Inventory request ${id} marked received`, actor);
  }, [addLog]);

  const approveGamingHubComment = useCallback((itemId: string, commentId: string, actor?: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        gamingHub: (prev.gamingHub || []).map(item =>
          item.id === itemId
            ? { ...item, comments: item.comments.map(c => c.id === commentId ? { ...c, status: "approved" as const } : c) }
            : item
        ),
      };
      saveStore(next);
      return next;
    });
    addLog("gaming_comment_approved", `Comment ${commentId} on ${itemId} approved`, actor);
  }, [addLog]);

  const rejectGamingHubComment = useCallback((itemId: string, commentId: string, actor?: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        gamingHub: (prev.gamingHub || []).map(item =>
          item.id === itemId
            ? { ...item, comments: item.comments.map(c => c.id === commentId ? { ...c, status: "rejected" as const } : c) }
            : item
        ),
      };
      saveStore(next);
      return next;
    });
    addLog("gaming_comment_rejected", `Comment ${commentId} on ${itemId} rejected`, actor);
  }, [addLog]);

  const updateDeliveryStatus = useCallback((id: string, status: Delivery["status"], actor?: string) => {
    setStore(prev => {
      const delivery = prev.deliveries.find(d => d.id === id);
      const updates: Partial<Delivery> = { status, updatedAt: Date.now() };
      if (status === "dispatched") updates.dispatchedAt = Date.now();
      if (status === "delivered") updates.deliveredAt = Date.now();
      const next = {
        ...prev,
        deliveries: prev.deliveries.map(d => d.id === id ? { ...d, ...updates } : d),
        // Sync deliveryStatus back to the linked order
        orders: delivery?.orderId
          ? prev.orders.map(o => o.id === delivery.orderId ? { ...o, deliveryStatus: status, updatedAt: Date.now() } : o)
          : prev.orders,
      };
      saveStore(next);
      return next;
    });
    addLog("delivery_status", `Delivery ${id} → ${status}`, actor);
  }, [addLog]);

  const assignDeliveryStaff = useCallback((deliveryId: string, staffId: string, staffName: string, staffPhone: string, actor?: string) => {
    setStore(prev => {
      const delivery = prev.deliveries.find(d => d.id === deliveryId);
      const next = {
        ...prev,
        deliveries: prev.deliveries.map(d => d.id === deliveryId ? { ...d, staffId, staffName, staffPhone, status: "ready" as Delivery["status"], updatedAt: Date.now() } : d),
        // Sync assigned staff back to the linked order
        orders: delivery?.orderId
          ? prev.orders.map(o => o.id === delivery.orderId ? { ...o, assignedStaffId: staffId, assignedStaffName: staffName, deliveryStatus: "ready", updatedAt: Date.now() } : o)
          : prev.orders,
      };
      saveStore(next);
      return next;
    });
    addLog("delivery_staff_assigned", `Delivery ${deliveryId} assigned to ${staffName}`, actor);
  }, [addLog]);

  const updateDelivery = useCallback((id: string, patch: Partial<Delivery>, actor?: string) => {
    setStore(prev => {
      const delivery = prev.deliveries.find(d => d.id === id);
      const updated = { ...delivery, ...patch, updatedAt: Date.now() };
      const next = {
        ...prev,
        deliveries: prev.deliveries.map(d => d.id === id ? updated : d),
        orders: delivery?.orderId
          ? prev.orders.map(o => o.id === delivery.orderId ? { ...o, ...patch, updatedAt: Date.now() } : o)
          : prev.orders,
      };
      saveStore(next);
      return next;
    });
    addLog("delivery_updated", `Delivery ${id} updated`, actor);
  }, [addLog]);

  const addReplyToTicket = useCallback((ticketId: string, text: string, from: "customer" | "agent") => {
    setStore(prev => {
      const next = {
        ...prev,
        tickets: prev.tickets.map(t => t.id === ticketId
          ? { ...t, messages: [...t.messages, { from, text, at: Date.now() }] }
          : t),
      };
      saveStore(next);
      return next;
    });
  }, []);

  const closeTicket = useCallback((ticketId: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        tickets: prev.tickets.map(t => t.id === ticketId ? { ...t, status: "closed" as TicketStatus } : t),
      };
      saveStore(next);
      return next;
    });
    addLog("ticket_closed", `Ticket ${ticketId} closed`);
  }, [addLog]);

  const redeemCoupon = useCallback((couponId: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        coupons: prev.coupons.map(c => c.id === couponId ? { ...c, redeemed: true } : c),
      };
      saveStore(next);
      return next;
    });
    addLog("coupon_redeemed", `Coupon ${couponId} redeemed`);
  }, [addLog]);

  const addCRMNote = useCallback((note: Omit<CRMNote, "id" | "at"> & { at?: number }) => {
    const item: CRMNote = { ...note, id: rid("crm"), at: note.at || Date.now() };
    setStore(prev => {
      const next = { ...prev, crmNotes: [item, ...prev.crmNotes] };
      saveStore(next);
      return next;
    });
    addLog("crm_note_added", `CRM note added for ${item.customerId}`, item.by);
    return item;
  }, [addLog]);

  const addStaffMember = useCallback((input: Omit<StaffMember, "id" | "joinedAt" | "performance"> & { id?: string; joinedAt?: number; performance?: StaffMember["performance"] }) => {
    const staff: StaffMember = {
      ...input,
      id: input.id || rid("stf"),
      joinedAt: input.joinedAt || Date.now(),
      performance: input.performance || { jobs: 0, rating: 5, attendancePct: 100 },
    };
    setStore(prev => {
      const next = { ...prev, staff: [staff, ...prev.staff.filter(s => s.id !== staff.id)] };
      saveStore(next);
      return next;
    });
    addLog("staff_created", `Staff ${staff.name} created`, "admin");
    return staff;
  }, [addLog]);

  const addSupplier = useCallback((input: Omit<Supplier, "id"> & { id?: string }) => {
    const supplier: Supplier = { ...input, id: input.id || rid("sup") };
    setStore(prev => {
      const next = { ...prev, suppliers: [supplier, ...prev.suppliers.filter(s => s.id !== supplier.id)] };
      saveStore(next);
      return next;
    });
    addLog("supplier_created", `Supplier ${supplier.name} created`, "admin");
    return supplier;
  }, [addLog]);

  const addPurchaseOrder = useCallback((input: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: number }) => {
    const order: PurchaseOrder = {
      ...input,
      id: input.id || `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: input.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    setStore(prev => {
      const next = { ...prev, purchaseOrders: [order, ...prev.purchaseOrders.filter(po => po.id !== order.id)] };
      saveStore(next);
      return next;
    });
    addLog("purchase_order_created", `Purchase order ${order.id} created`, "admin");
    return order;
  }, [addLog]);

  const patchPurchaseOrder = useCallback((poId: string, patch: Partial<PurchaseOrder>) => {
    setStore(prev => {
      const before = prev.purchaseOrders.find(po => po.id === poId);
      const becomingReceived = before?.status !== "received" && patch.status === "received";
      const nextProducts = becomingReceived && before
        ? prev.products.map(product => {
            const matched = before.items.find(item => product.name.toLowerCase().includes(item.component.toLowerCase()) || product.category.toLowerCase() === item.component.toLowerCase());
            return matched ? { ...product, stock: Number(product.stock || 0) + Number(matched.qty || 0), inStock: true, updatedAt: Date.now() } : product;
          })
        : prev.products;
      const next = {
        ...prev,
        products: nextProducts,
        purchaseOrders: prev.purchaseOrders.map(po => po.id === poId ? { ...po, ...patch, updatedAt: Date.now() } : po),
      };
      saveStore(next);
      return next;
    });
    addLog("purchase_order_updated", `Purchase order ${poId} updated`, "admin");
  }, [addLog]);

  const addCoupon = useCallback((input: Omit<Coupon, "id" | "redeemed"> & { id?: string; redeemed?: boolean }) => {
    const coupon: Coupon = { ...input, id: input.id || rid("cpn"), redeemed: Boolean(input.redeemed), active: input.active ?? true, usedCount: input.usedCount || 0 };
    setStore(prev => {
      const next = { ...prev, coupons: [coupon, ...prev.coupons.filter(c => c.id !== coupon.id)] };
      saveStore(next);
      return next;
    });
    addLog("coupon_created", `Coupon ${coupon.code} created`, "admin");
    return coupon;
  }, [addLog]);

  const patchCoupon = useCallback((couponId: string, patch: Partial<Coupon>) => {
    setStore(prev => {
      const next = { ...prev, coupons: prev.coupons.map(c => c.id === couponId ? { ...c, ...patch } : c) };
      saveStore(next);
      return next;
    });
    addLog("coupon_updated", `Coupon ${couponId} updated`, "admin");
  }, [addLog]);

  const addOffer = useCallback((input: Omit<DashboardStore["offers"][number], "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
    const offer = { ...input, id: input.id || rid("ofr"), active: input.active ?? true, createdAt: Date.now(), updatedAt: Date.now() };
    setStore(prev => {
      const next = { ...prev, offers: [offer, ...prev.offers.filter(o => o.id !== offer.id)] };
      saveStore(next);
      return next;
    });
    addLog("offer_created", `Offer ${offer.title} created`, "admin");
    return offer;
  }, [addLog]);

  const patchOffer = useCallback((offerId: string, patch: Partial<DashboardStore["offers"][number]>) => {
    setStore(prev => {
      const next = { ...prev, offers: prev.offers.map(o => o.id === offerId ? { ...o, ...patch, updatedAt: Date.now() } : o) };
      saveStore(next);
      return next;
    });
    addLog("offer_updated", `Offer ${offerId} updated`, "admin");
  }, [addLog]);

  const updateSettings = useCallback((patch: Partial<DashboardSettings>) => {
    setStore(prev => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      saveStore(next);
      return next;
    });
    addLog("settings_updated", `Settings: ${Object.keys(patch).join(", ")}`, "admin");
  }, [addLog]);

  const addCatalogProduct = useCallback((input: Omit<CatalogProduct, "id" | "createdAt" | "updatedAt"> & { id?: number; createdAt?: number }) => {
    const now = Date.now();
    const product: CatalogProduct = {
      ...input,
      id: input.id || Math.max(0, ...store.products.map(p => p.id), 1000) + 1,
      createdAt: input.createdAt || Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")),
      updatedAt: now,
    };
    setStore(prev => {
      const next = { ...prev, products: [product, ...prev.products.filter(p => p.id !== product.id)] };
      saveStore(next);
      return next;
    });
    addLog("catalog_product_added", `Catalog product ${product.name} saved`, "admin");
    return product;
  }, [addLog, store.products]);

  const patchCatalogProduct = useCallback((productId: number, patch: Partial<CatalogProduct>) => {
    setStore(prev => {
      const next = {
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, ...patch, updatedAt: Date.now() } : p),
      };
      saveStore(next);
      return next;
    });
    addLog("catalog_product_updated", `Catalog product #${productId} updated`, "admin");
  }, [addLog]);

  const deleteCatalogProduct = useCallback((productId: number) => {
    setStore(prev => {
      const next = { ...prev, products: prev.products.filter(p => p.id !== productId) };
      saveStore(next);
      return next;
    });
    addLog("catalog_product_deleted", `Catalog product #${productId} deleted`, "admin");
  }, [addLog]);

  const addGamingHubItem = useCallback((input: Omit<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments"> & Partial<Pick<GamingHubItem, "id" | "createdAt" | "updatedAt" | "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks" | "comments">>) => {
    const now = Date.now();
    const maxOrder = Math.max(0, ...(store.gamingHub || []).map(h => h.order || 0));
    const item: GamingHubItem = {
      ...input,
      id: input.id || rid("gh"),
      createdAt: input.createdAt || now,
      updatedAt: now,
      views: input.views || 0,
      reads: input.reads || 0,
      shares: input.shares || 0,
      whatsappClicks: input.whatsappClicks || 0,
      callClicks: input.callClicks || 0,
      offerClicks: input.offerClicks || 0,
      ctaClicks: input.ctaClicks || 0,
      comments: input.comments || [],
      order: input.order ?? maxOrder + 1,
    };
    setStore(prev => {
      const next = { ...prev, gamingHub: [item, ...(prev.gamingHub || []).filter(existing => existing.id !== item.id)] };
      saveStore(next);
      return next;
    });
    addLog("gaming_hub_created", `Gaming Hub content "${item.title}" saved`, "admin");
    return item;
  }, [addLog, store.gamingHub]);

  const patchGamingHubItem = useCallback((itemId: string, patch: Partial<GamingHubItem>) => {
    setStore(prev => {
      const next = {
        ...prev,
        gamingHub: (prev.gamingHub || []).map(item => item.id === itemId ? { ...item, ...patch, updatedAt: Date.now() } : item),
      };
      saveStore(next);
      return next;
    });
    addLog("gaming_hub_updated", `Gaming Hub content ${itemId} updated`, "admin");
  }, [addLog]);

  const deleteGamingHubItem = useCallback((itemId: string) => {
    setStore(prev => {
      const next = { ...prev, gamingHub: (prev.gamingHub || []).filter(item => item.id !== itemId) };
      saveStore(next);
      return next;
    });
    addLog("gaming_hub_deleted", `Gaming Hub content ${itemId} deleted`, "admin");
  }, [addLog]);

  const trackGamingHubMetric = useCallback((itemId: string, metric: "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks") => {
    setStore(prev => {
      const next = {
        ...prev,
        gamingHub: (prev.gamingHub || []).map(item => item.id === itemId ? { ...item, [metric]: Number(item[metric] || 0) + 1, updatedAt: Date.now() } : item),
      };
      saveStore(next);
      return next;
    });
  }, []);

  const addNotification = useCallback((n: Omit<NotificationItem, "id" | "createdAt" | "read" | "archived">) => {
    const item: NotificationItem = { ...n, id: rid("ntf"), createdAt: Date.now(), read: false, archived: false };
    setStore(prev => {
      const next = { ...prev, notifications: [item, ...prev.notifications] };
      saveStore(next);
      return next;
    });
    addLog("notification_sent", `Notification "${item.title}" sent to ${item.audience || "customer"}`, "admin");
  }, []);

  const resetStore = useCallback(() => {
    const fresh = seedStore();
    saveStore(fresh);
    setStore(fresh);
  }, []);

  const patchCustomBuilderConfig = useCallback((patch: Partial<CustomBuilderConfig>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          ...patch,
          version: (prev.customBuilderConfig.version || 1) + 1,
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_config_updated", "Custom PC Builder configuration updated", "admin");
  }, [addLog]);

  const publishBuilderConfig = useCallback(() => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          status: "published" as const,
          publishedAt: Date.now(),
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_published", "Custom PC Builder configuration published to customer-facing page", "admin");
  }, [addLog]);

  const addBuilderComponent = useCallback((categoryId: ComponentCategory, component: Omit<BuilderComponent, "id" | "order">) => {
    setStore(prev => {
      const existing = prev.customBuilderConfig.components[categoryId] || [];
      const newComponent: BuilderComponent = {
        ...component,
        id: `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        order: existing.length,
      };
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          components: {
            ...prev.customBuilderConfig.components,
            [categoryId]: [...existing, newComponent],
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_component_added", `Component "${component.name}" added to ${categoryId}`, "admin");
  }, [addLog]);

  const updateBuilderComponent = useCallback((categoryId: ComponentCategory, componentId: string, patch: Partial<BuilderComponent>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          components: {
            ...prev.customBuilderConfig.components,
            [categoryId]: (prev.customBuilderConfig.components[categoryId] || []).map(c =>
              c.id === componentId ? { ...c, ...patch } : c
            ),
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_component_updated", `Component ${componentId} in ${categoryId} updated`, "admin");
  }, [addLog]);

  const removeBuilderComponent = useCallback((categoryId: ComponentCategory, componentId: string) => {
    setStore(prev => {
      const component = (prev.customBuilderConfig.components[categoryId] || []).find(c => c.id === componentId);
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          components: {
            ...prev.customBuilderConfig.components,
            [categoryId]: (prev.customBuilderConfig.components[categoryId] || [])
              .filter(c => c.id !== componentId)
              .map((c, i) => ({ ...c, order: i })),
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_component_removed", `Component ${componentId} removed from ${categoryId}`, "admin");
  }, [addLog]);

  const reorderBuilderComponents = useCallback((categoryId: ComponentCategory, componentId: string, newOrder: number) => {
    setStore(prev => {
      const components = [...(prev.customBuilderConfig.components[categoryId] || [])];
      const currentIndex = components.findIndex(c => c.id === componentId);
      if (currentIndex === -1) return prev;
      const [moved] = components.splice(currentIndex, 1);
      components.splice(newOrder, 0, moved);
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          components: {
            ...prev.customBuilderConfig.components,
            [categoryId]: components.map((c, i) => ({ ...c, order: i })),
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_component_reordered", `Component ${componentId} reordered in ${categoryId}`, "admin");
  }, [addLog]);

  const updateBuildPurpose = useCallback((purposeId: string, patch: Partial<BuildPurposeButton>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          buildPurposes: prev.customBuilderConfig.buildPurposes.map(p =>
            p.id === purposeId ? { ...p, ...patch } : p
          ),
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("build_purpose_updated", `Build purpose ${purposeId} updated`, "admin");
  }, [addLog]);

  const addBuildPurpose = useCallback((purpose: Omit<BuildPurposeButton, "id">) => {
    setStore(prev => {
      const newPurpose: BuildPurposeButton = {
        ...purpose,
        id: `purpose_${Date.now().toString(36)}`,
      };
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          buildPurposes: [...prev.customBuilderConfig.buildPurposes, newPurpose].sort((a, b) => a.order - b.order),
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("build_purpose_added", `Build purpose "${purpose.purpose}" added`, "admin");
  }, [addLog]);

  const removeBuildPurpose = useCallback((purposeId: string) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          buildPurposes: prev.customBuilderConfig.buildPurposes.filter(p => p.id !== purposeId),
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("build_purpose_removed", `Build purpose ${purposeId} removed`, "admin");
  }, [addLog]);

  const updatePricingRules = useCallback((patch: Partial<CustomBuilderConfig["pricingRules"]>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          pricingRules: {
            ...prev.customBuilderConfig.pricingRules,
            ...patch,
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("pricing_rules_updated", "Custom PC Builder pricing rules updated", "admin");
  }, [addLog]);

  const updateContentConfig = useCallback((patch: Partial<BuilderContentConfig>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          contentConfig: {
            ...prev.customBuilderConfig.contentConfig,
            ...patch,
          },
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("builder_content_updated", "Custom PC Builder page content updated", "admin");
  }, [addLog]);

  const updateDefaultPreset = useCallback((tier: PerformanceTier, components: Record<string, string>) => {
    setStore(prev => {
      const next = {
        ...prev,
        customBuilderConfig: {
          ...prev.customBuilderConfig,
          defaultPresets: prev.customBuilderConfig.defaultPresets.map(p =>
            p.tier === tier ? { ...p, components } : p
          ),
          lastModifiedAt: Date.now(),
        },
      };
      saveStore(next);
      return next;
    });
    addLog("default_preset_updated", `Default ${tier} preset updated`, "admin");
  }, [addLog]);

  const getBuilderMetrics = useCallback((): BuilderMetrics => {
    const config = store.customBuilderConfig;
    const allComponents = Object.values(config.components).flat();
    const hiddenCount = allComponents.filter(c => !c.isActive).length;
    const totalCategories = Object.keys(config.components).length;
    const activeOptions = allComponents.filter(c => c.isActive).length;
    const hiddenOptions = hiddenCount;

    // Compute popular selections from submitted build requests
    const selectionCounts: Record<string, { name: string; count: number; componentId: string }> = {};
    store.pcBuilds.forEach(build => {
      if (build.selectedBuilderComponents) {
        Object.values(build.selectedBuilderComponents).forEach(componentId => {
          const comp = allComponents.find(c => c.id === componentId);
          if (comp) {
            if (!selectionCounts[componentId]) {
              selectionCounts[componentId] = { name: `${comp.brand} ${comp.model}`, count: 0, componentId };
            }
            selectionCounts[componentId].count++;
          }
        });
      }
    });
    const popularSelections = Object.values(selectionCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({ componentId: s.componentId, name: s.name, count: s.count }));

    return {
      totalCategories,
      activeOptions,
      hiddenOptions,
      popularSelections,
      latestPriceUpdate: config.lastModifiedAt || config.publishedAt || Date.now(),
      buildRequestsGenerated: store.pcBuilds.length,
    };
  }, [store]);

  // Cross-tab sync
  useEffect(() => {
    const refreshStore = () => {
      const next = loadStore();
      saveStore(next);
      setStore(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const next = migrateStore(JSON.parse(e.newValue || "{}"));
          saveStore(next);
          setStore(next);
        } catch {}
      } else if (e.key === AUTH_STORAGE_KEY) {
        refreshStore();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refreshStore);
    window.addEventListener("deskto-auth-state-changed", refreshStore);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refreshStore);
      window.removeEventListener("deskto-auth-state-changed", refreshStore);
    };
  }, []);

  // Hydrate from backend when the user has an API session.
  // For customers: pull /api/orders/my and /api/services/my so their dashboard
  // reflects the real PostgreSQL store. For admin/staff: pull all orders.
  // Local mock orders are preserved as a fallback when the API is unavailable
  // (demo / offline mode).
  useEffect(() => {
    let cancelled = false;

    async function hydrateFromBackend() {
      if (typeof window === "undefined") return;
      if (!isApiAuthenticated() || !getAccessToken()) return;

      try {
        // Detect role from local auth state first. API logins may not always
        // mirror the full user payload into demo storage, so fall back to
        // /auth/me before deciding whether to load customer-only or admin data.
        const authRaw = window.localStorage.getItem("deskto-auth-demo-state");
        let role: "customer" | "admin" | "staff" = "customer";
        let roleFound = false;
        if (authRaw) {
          try {
            const parsed = JSON.parse(authRaw);
            const uid = parsed?.currentUserId;
            const user = (parsed?.users || []).find((u: any) => u.id === uid);
            if (user?.role === "admin" || user?.role === "staff" || user?.role === "customer") {
              role = user.role;
              roleFound = true;
            }
          } catch { /* ignore */ }
        }
        if (!roleFound) {
          try {
            const me = await authApi.getMe();
            if (me?.role === "admin" || me?.role === "staff" || me?.role === "customer") {
              role = me.role;
            }
          } catch { /* keep customer default */ }
        }

        const ordersPromise = role === "customer"
          ? ordersApi.getMy({ limit: 50 })
          : ordersApi.getAll({ limit: 50 });
        const servicesPromise = role === "customer"
          ? servicesApi.getMy({ limit: 50 })
          : servicesApi.getAll({ limit: 100 }).catch(() => servicesApi.getMy({ limit: 50 }));

        const [ordersRes, servicesRes] = await Promise.all([ordersPromise, servicesPromise]);
        if (cancelled) return;

        const apiOrders = (ordersRes?.orders || []).map(apiOrderToFrontend);
        const apiServices = (servicesRes?.services || []).map(apiServiceToFrontend);

        setStore(prev => {
          // Merge strategy: API orders take precedence when their orderNumber
          // matches a local order; everything else from the API is added.
          // We keep local-only mock orders (so the demo dataset still appears)
          // for admin/staff only — customers see exactly what the backend has.
          const next = { ...prev };

          if (role === "customer") {
            next.orders = apiOrders;
            next.serviceRequests = apiServices;
          } else {
            // Admin/staff: keep local mock + add API orders not already in the
            // local store.
            const localOrderNumbers = new Set(prev.orders.map((o: Order) => o.id));
            const merged = [
              ...apiOrders.filter((o: Order) => !localOrderNumbers.has(o.id)),
              ...prev.orders,
            ];
            next.orders = merged;

            const localServiceNumbers = new Set((prev.serviceRequests || []).map((s: ServiceRequest) => s.id));
            const mergedServices = [
              ...apiServices.filter((s: ServiceRequest) => !localServiceNumbers.has(s.id)),
              ...(prev.serviceRequests || []),
            ];
            next.serviceRequests = mergedServices;
          }
          saveStore(next);
          return next;
        });
      } catch (err) {
        // Silent: dashboard still works with the local mock data.
        console.warn("[dashboard] backend hydration failed (falling back to local data):", err);
      }
    }

    hydrateFromBackend();
    // Also hydrate the gamingHub (admin homepage CMS) from the real backend
    // so the admin list always reflects MySQL, not the localStorage seed.
    if (isApiAuthenticated() && getAccessToken()) {
      Promise.all([
        homepageContentApi.adminList({}).catch(() => []),
      ]).then(([cmsRows]) => {
        if (cancelled || !Array.isArray(cmsRows)) return;
        setStore(prev => {
          const apiById = new Map(cmsRows.map(r => [r.id, r]));
          // Keep local-only rows (no real UUID id) and overlay API rows.
          const merged = (prev.gamingHub || []).map(local => {
            const api = apiById.get(local.id);
            return api ? { ...local, ...api, id: api.id || local.id, updatedAt: Date.now() } : local;
          });
          // Add any new API rows that aren't in local store yet.
          const localIds = new Set(merged.map(r => r.id));
          for (const r of cmsRows) {
            if (!localIds.has(r.id)) {
              merged.unshift({
                id: r.id,
                type: r.type,
                title: r.title || '',
                slug: r.slug || '',
                category: r.category || '',
                shortDescription: r.shortDescription || '',
                body: r.body || '',
                status: (r.status || 'draft') as GamingHubStatus,
                coverImage: r.coverImage || '',
                thumbnailImage: r.thumbnailImage || '',
                bannerImage: r.bannerImage || '',
                gallery: r.gallery || [],
                tags: r.tags || [],
                pros: r.pros || [],
                cons: r.cons || [],
                tips: r.tips || [],
                order: r.displayOrder || 0,
                publishDate: r.publishDate ? new Date(r.publishDate).getTime() : Date.now(),
                updatedAt: Date.now(),
                views: 0, reads: 0, shares: 0,
                whatsappClicks: 0, callClicks: 0, offerClicks: 0, ctaClicks: 0,
                comments: [],
              });
            }
          }
          const next = { ...prev, gamingHub: merged };
          saveStore(next);
          return next;
        });
      }).catch(() => { /* silent */ });
    }
    const onAuth = () => hydrateFromBackend();
    const onFocus = () => hydrateFromBackend();
    const interval = window.setInterval(() => hydrateFromBackend(), 30000);
    window.addEventListener("deskto-auth-state-changed", onAuth);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("deskto-auth-state-changed", onAuth);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Backfill `liveId` (backend product UUID) onto every CatalogProduct whose
  // SKU matches a row in the live API. Without this, the checkout flow sends
  // the numeric CatalogProduct.id and the backend rejects the order with
  // "Invalid product ID". Public-API products already carry liveId via
  // `publicProductToProduct` in App.tsx; this covers admin catalog entries.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isApiAuthenticated() || !getAccessToken()) return;
    let cancelled = false;

    (async () => {
      try {
        const { products } = await productsApi.getAll({ limit: 100 });
        if (cancelled || !Array.isArray(products)) return;
        const bySku: Record<string, string> = {};
        for (const p of products) {
          if (p && typeof p.sku === "string" && p.sku && typeof p.id === "string" && p.id) {
            bySku[p.sku] = p.id;
          }
        }
        if (Object.keys(bySku).length === 0) return;
        setStore(prev => {
          let changed = false;
          const nextProducts = prev.products.map(cp => {
            const sku = (cp as { sku?: string }).sku;
            const existingLiveId = (cp as { liveId?: string }).liveId;
            if (sku && bySku[sku] && bySku[sku] !== existingLiveId) {
              changed = true;
              return { ...cp, liveId: bySku[sku] } as typeof cp;
            }
            return cp;
          });
          if (!changed) return prev;
          const next = { ...prev, products: nextProducts };
          saveStore(next);
          return next;
        });
      } catch {
        // Offline / API down: silently keep existing data.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return {
    store,
    addLog,
    addOrder,
    updateOrderStatus,
    patchOrder,
    updateRepairStatus,
    addRepairRequest,
    patchRepair,
    addPCBuildRequest,
    patchPCBuild,
    addServiceRequest,
    patchServiceRequest,
    addQuickEnquiry,
    updateQuickEnquiryStatus,
    addCatalogProduct,
    patchCatalogProduct,
    deleteCatalogProduct,
    addGamingHubItem,
    patchGamingHubItem,
    deleteGamingHubItem,
    trackGamingHubMetric,
    updateRental,
    addAddress,
    deleteAddress,
    fileReview,
    markNotificationRead,
    archiveNotification,
    advanceTask,
    clockIn,
    clockOut,
    submitInventoryRequest,
    approveInventoryRequest,
    rejectInventoryRequest,
    markInventoryReceived,
    approveGamingHubComment,
    rejectGamingHubComment,
    updateDeliveryStatus,
    assignDeliveryStaff,
    updateDelivery,
    addReplyToTicket,
    closeTicket,
    redeemCoupon,
    addCRMNote,
    addStaffMember,
    addSupplier,
    addPurchaseOrder,
    patchPurchaseOrder,
    addCoupon,
    patchCoupon,
    addOffer,
    patchOffer,
    updateSettings,
    addNotification,
    resetStore,
    patchCustomBuilderConfig,
    publishBuilderConfig,
    addBuilderComponent,
    updateBuilderComponent,
    removeBuilderComponent,
    reorderBuilderComponents,
    updateBuildPurpose,
    addBuildPurpose,
    removeBuildPurpose,
    updatePricingRules,
    updateContentConfig,
    updateDefaultPreset,
    getBuilderMetrics,
  };
}
