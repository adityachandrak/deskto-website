// ──────────────────────────────────────────────────────────────────────────
//  DESKTO Dashboard Data Layer
//  Shared types, seeder, and mutators for the Customer / Staff / Admin
//  dashboards. State persists to localStorage under "deskto-dashboard-v1".
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";

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
export type ServiceRequestKind = "upgrade" | "software" | "rental" | "sell" | "support";
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
  };
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
  addressId: string;
  trackingSteps: { label: string; at: number; done: boolean }[];
  invoiceId?: string;
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
  minSpend: number;
  expiresAt: number;
  redeemed: boolean;
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
  staffId: string;
  orderId: string;
  customerName: string;
  address: string;
  status: "ready" | "dispatched" | "delivered";
  createdAt: number;
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
  items: { component: string; qty: number; cost: number }[];
  total: number;
  status: "draft" | "sent" | "received" | "paid";
  createdAt: number;
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
  offers: { id: string; title: string; detail: string; expiresAt: number; code: string }[];
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
  offers: [],
});

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
  const labels = kind === "upgrade" ? UPGRADE_TIMELINE_LABELS : kind === "software" ? SOFTWARE_TIMELINE_LABELS : kind === "rental" ? RENTAL_TIMELINE_LABELS : kind === "sell" ? SELL_TIMELINE_LABELS : SUPPORT_TIMELINE_LABELS;
  const defaultLabel = labels[0];
  const rawLabel = SERVICE_STATUS_LABEL[status] || defaultLabel;
  const remap: Record<ServiceRequestKind, Record<string, string>> = {
    upgrade: {},
    software: { "Upgrade Request Submitted": "Service Request Submitted", "Technician Assigned": "Technician Assigned", "Quality Testing": "Quality Testing" },
    rental: { "Customer Approved": "Rental Approved", "Components Reserved": "Product Reserved", "Quality Testing": "Inspection Completed", "Invoice Generated": "Final Invoice Generated", "Review Requested": "Review Requested" },
    sell: { "Upgrade Request Submitted": "Sell Request Submitted", "Request Received": "Admin Review", "Technician Assigned": "Inspection Scheduled", "System Inspection": "Product Inspected", "Customer Approved": "Offer Accepted", "Payment Successful": "Payment Completed", "Review Requested": "Request Closed" },
    support: { "Upgrade Request Submitted": "Ticket Submitted", "Technician Assigned": "Ticket Assigned", "Customer Approved": "Issue Resolved", "Payment Successful": "Payment Completed", "Review Requested": "Ticket Closed" },
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

function seedStore(): DashboardStore {
  const store = emptyStore();
  store.gamingHub = defaultGamingHubItems();

  // Products — pulled from the static catalogue (truncated for brevity)
  store.products = [
    { id: 1, name: "DESKTO Phantom X", price: 285000, stock: 8, category: "gaming-pc", brand: "DESKTO" },
    { id: 2, name: "DESKTO Titan Pro", price: 195000, stock: 12, category: "gaming-pc", brand: "DESKTO" },
    { id: 3, name: "DESKTO Reaper XT", price: 135000, stock: 5, category: "gaming-pc", brand: "DESKTO" },
    { id: 7, name: "ASUS ROG Strix G16", price: 185000, stock: 6, category: "gaming-laptop", brand: "ASUS" },
    { id: 8, name: "Dell XPS 15", price: 142000, stock: 4, category: "laptop", brand: "Dell" },
    { id: 11, name: "Intel Core i9-14900K", price: 54000, stock: 18, category: "cpu", brand: "Intel" },
    { id: 12, name: "NVIDIA RTX 4080 Super", price: 98000, stock: 9, category: "gpu", brand: "NVIDIA" },
    { id: 15, name: "Samsung 990 PRO 2TB", price: 18900, stock: 22, category: "nvme", brand: "Samsung" },
    { id: 20, name: "Razer DeathAdder V3", price: 6500, stock: 2, category: "mouse", brand: "Razer" },
    { id: 19, name: "Logitech G Pro X Keyboard", price: 9800, stock: 15, category: "keyboard", brand: "Logitech" },
    { id: 21, name: "HyperX Cloud III", price: 8900, stock: 11, category: "headset", brand: "HyperX" },
  ];

  // Addresses for the demo customer
  store.addresses = [
    { id: rid("adr"), label: "Home", line1: "12 Park Avenue", city: "Mumbai", state: "MH", pincode: "400001", isDefault: true },
    { id: rid("adr"), label: "Office", line1: "Tower B, BKC", line2: "5th Floor", city: "Mumbai", state: "MH", pincode: "400051" },
    { id: rid("adr"), label: "Workshop", line1: "Plot 4, MIDC", city: "Pune", state: "MH", pincode: "411019" },
  ];

  // Orders
  const sampleItem = (id: number, qty = 1): OrderItem => {
    const p = store.products.find(x => x.id === id)!;
    return { productId: id, name: p.name, qty, price: p.price, img: "" };
  };
  store.orders = [
    {
      id: rid("ord"),
      customerId: uid,
      items: [sampleItem(1), sampleItem(20, 2)],
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
      items: [sampleItem(11), sampleItem(15)],
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
      items: [sampleItem(7)],
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
      title: request.title || (request.kind === "upgrade" ? "Upgrade & Optimization" : "Software & Data Service"),
      checklist: request.checklist || defaultServiceChecklist(request.kind),
      qaChecks: request.qaChecks || defaultServiceQa(request.kind),
      timeline: serviceTimelineThrough(request.kind, request.status || "submitted", request.createdAt || Date.now()),
      updatedAt: request.updatedAt || request.createdAt,
    };
  });
  const gamingHub = (store.gamingHub || []).length ? store.gamingHub : defaultGamingHubItems();
  if (!(store.gamingHub || []).length) changed = true;
  return changed ? { ...store, orders, staff, repairs, pcBuilds, serviceRequests, gamingHub } : { ...store, orders, serviceRequests, gamingHub };
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
  const labels = request.kind === "upgrade" ? UPGRADE_TIMELINE_LABELS : request.kind === "software" ? SOFTWARE_TIMELINE_LABELS : request.kind === "rental" ? RENTAL_TIMELINE_LABELS : request.kind === "sell" ? SELL_TIMELINE_LABELS : SUPPORT_TIMELINE_LABELS;
  const rawLabel = SERVICE_STATUS_LABEL[status] || labels[0];
  const remap: Record<ServiceRequestKind, Record<string, string>> = {
    upgrade: {},
    software: { "Upgrade Request Submitted": "Service Request Submitted" },
    rental: { "Customer Approved": "Rental Approved", "Components Reserved": "Product Reserved", "Quality Testing": "Inspection Completed", "Invoice Generated": "Final Invoice Generated" },
    sell: { "Upgrade Request Submitted": "Sell Request Submitted", "Request Received": "Admin Review", "Technician Assigned": "Inspection Scheduled", "System Inspection": "Product Inspected", "Customer Approved": "Offer Accepted", "Payment Successful": "Payment Completed", "Review Requested": "Request Closed" },
    support: { "Upgrade Request Submitted": "Ticket Submitted", "Technician Assigned": "Ticket Assigned", "Customer Approved": "Issue Resolved", "Payment Successful": "Payment Completed", "Review Requested": "Ticket Closed" },
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
          : ["Identity Verification", "Remote Access Granted", "Issue Resolved", "Customer Confirmation", "Service Report", "Invoice", "Payment", "Feedback"];
  return labels.map(label => ({ label, done: false }));
}

// ── HOOK ──────────────────────────────────────────────────────────────────

export function useDashboardData() {
  const [store, setStore] = useState<DashboardStore>(() => loadStore());

  const persist = useCallback((next: DashboardStore) => {
    saveStore(next);
    setStore(next);
  }, []);

  const addLog = useCallback((event: string, detail: string, actor?: string) => {
    setStore(prev => {
      const log: AuditLog = { id: rid("log"), event, detail, actor, at: Date.now() };
      const next = { ...prev, auditLogs: [log, ...prev.auditLogs].slice(0, 200) };
      saveStore(next);
      return next;
    });
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setStore(prev => {
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
    addLog("order_status", `Order ${orderId} → ${status}`);
  }, [addLog]);

  const addOrder = useCallback((input: AddOrderInput) => {
    const createdAt = input.createdAt || Date.now();
    const order: Order = {
      ...input,
      id: input.id || rid("ord"),
      createdAt,
      updatedAt: createdAt,
      trackingSteps: input.trackingSteps?.length ? input.trackingSteps : orderTimelineThrough(input.status, createdAt),
    };
    setStore(prev => {
      const exists = prev.orders.some(o => o.id === order.id);
      const next = {
        ...prev,
        orders: exists ? prev.orders.map(o => o.id === order.id ? order : o) : [order, ...prev.orders],
        notifications: [
          {
            id: rid("ntf"),
            customerId: order.customerId,
            title: "Order placed",
            detail: `${order.items.length} item${order.items.length > 1 ? "s" : ""} order ${order.id} is now synced to your dashboard.`,
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
    addLog("order_created", `Order ${order.id} created`, order.customerName || order.customerEmail || "customer");
    return order;
  }, [addLog]);

  const updateRepairStatus = useCallback((repairId: string, status: RepairStatus) => {
    setStore(prev => {
      const next = {
        ...prev,
        repairs: prev.repairs.map(r => r.id === repairId ? { ...r, status, timeline: mergeRepairTimeline(r, status), updatedAt: Date.now() } : r),
      };
      saveStore(next);
      return next;
    });
    addLog("repair_status", `Repair ${repairId} → ${status}`);
  }, [addLog]);

  const addRepairRequest = useCallback((input: Omit<Repair, "id" | "status" | "timeline" | "createdAt" | "updatedAt"> & { status?: RepairStatus }) => {
    const status = input.status || "submitted";
    const repair: Repair = {
      ...input,
      id: rid("rep"),
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
    setStore(prev => {
      const before = prev.repairs.find(r => r.id === repairId);
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
    addLog("repair_updated", `Repair ${repairId} updated`);
  }, [addLog]);

  const addPCBuildRequest = useCallback((input: Omit<PCBuild, "id" | "status" | "timeline" | "createdAt" | "updatedAt"> & { status?: PCBuildStatus }) => {
    const status = input.status || "submitted";
    const build: PCBuild = {
      ...input,
      id: rid("pcb"),
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
    setStore(prev => {
      const before = prev.pcBuilds.find(build => build.id === buildId);
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
    addLog("pc_build_updated", `PC build ${buildId} updated`);
  }, [addLog]);

  const addServiceRequest = useCallback((input: Omit<ServiceRequest, "id" | "status" | "timeline" | "createdAt" | "updatedAt" | "checklist" | "qaChecks"> & { status?: ServiceRequestStatus; checklist?: ServiceRequest["checklist"]; qaChecks?: ServiceRequest["qaChecks"] }) => {
    const status = input.status || "submitted";
    const request: ServiceRequest = {
      ...input,
      id: rid(input.kind === "upgrade" ? "upg" : "sft"),
      status,
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
            title: `${request.kind === "upgrade" ? "Upgrade" : "Software"} request submitted`,
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
    setStore(prev => {
      const before = (prev.serviceRequests || []).find(request => request.id === requestId);
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
            title: `${before?.kind === "upgrade" ? "Upgrade" : before?.kind === "software" ? "Software" : before?.kind === "rental" ? "Rental" : before?.kind === "sell" ? "Sell Used" : "Support"} assigned`,
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
    addLog("service_request_updated", `Service request ${requestId} updated`);
  }, [addLog]);

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
    };
    setStore(prev => {
      const next = { ...prev, gamingHub: [item, ...(prev.gamingHub || []).filter(existing => existing.id !== item.id)] };
      saveStore(next);
      return next;
    });
    addLog("gaming_hub_created", `Gaming Hub content "${item.title}" saved`, "admin");
    return item;
  }, [addLog]);

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
  }, []);

  const resetStore = useCallback(() => {
    const fresh = seedStore();
    saveStore(fresh);
    setStore(fresh);
  }, []);

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

  return {
    store,
    addLog,
    addOrder,
    updateOrderStatus,
    updateRepairStatus,
    addRepairRequest,
    patchRepair,
    addPCBuildRequest,
    patchPCBuild,
    addServiceRequest,
    patchServiceRequest,
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
    addReplyToTicket,
    closeTicket,
    redeemCoupon,
    updateSettings,
    addNotification,
    resetStore,
  };
}
