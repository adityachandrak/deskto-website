// ─────────────────────────────────────────────────────────────────────────────
// API Type Definitions - Matching Backend Database Schema
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName?: string;
  role: 'customer' | 'staff' | 'admin';
  status: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  category: string;
  brand: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  imageUrl?: string;
  images?: string[];
  specifications?: Record<string, any>;
  tags?: string[];
  marketTag?: string;
  isActive: boolean;
  isFeatured: boolean;
  weight?: number;
  dimensions?: Record<string, any>;
  averageRating?: number;
  reviewCount?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: 'placed' | 'verified' | 'packing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId?: string;
  productId: string;
  productName?: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, any>;
}

export interface Service {
  id: string;
  serviceNumber: string;
  userId?: string;
  serviceType: 'repair' | 'upgrade' | 'rental' | 'assembly' | 'support';
  status: string;
  title: string;
  description?: string;
  deviceInfo?: Record<string, any>;
  estimatedCost?: number;
  finalCost?: number;
  technicianId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Wishlist {
  id: string;
  userId?: string;
  productId: string;
  product?: Product;
  createdAt: string;
}

export interface Review {
  id: string;
  userId?: string;
  productId: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  user?: User;
}

export interface PCBuild {
  id: string;
  buildNumber: string;
  userId?: string;
  status: string;
  title?: string;
  useCase?: string;
  budgetRange?: string;
  components: PCComponent[];
  totalPrice?: number;
  quotationDetails?: string;
  technicianId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PCComponent {
  category: string;
  name: string;
  brand?: string;
  model?: string;
  price?: number;
  specifications?: Record<string, any>;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface OrderInput {
  items: { productId: string; quantity: number }[];
  shippingAddress: Address;
  billingAddress?: Address;
  notes?: string;
}

export interface ServiceInput {
  serviceType: 'repair' | 'upgrade' | 'rental' | 'assembly' | 'support';
  title: string;
  description?: string;
  deviceInfo?: Record<string, any>;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price' | 'name' | 'created_at' | 'stock_quantity';
  sortOrder?: 'ASC' | 'DESC';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalServices: number;
  totalRevenue: number;
  pendingOrders: number;
  activeServices: number;
  lowStockProducts: number;
  newCustomers: number;
}

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  activeServices: number;
  wishlistCount: number;
  memberSince: string;
}

export interface StaffStats {
  assignedOrders: number;
  assignedServices: number;
  completedToday: number;
  pendingQuotations: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginForm {
  identifier: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export interface CheckoutForm {
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod?: string;
  notes?: string;
}

export interface ServiceRequestForm {
  serviceType: 'repair' | 'upgrade' | 'rental' | 'assembly' | 'support';
  title: string;
  description: string;
  deviceInfo?: {
    brand?: string;
    model?: string;
    issue?: string;
    [key: string]: any;
  };
}
