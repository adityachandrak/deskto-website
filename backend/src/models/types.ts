import { Request, Response, NextFunction } from 'express';

export interface User {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name?: string;
  role: 'customer' | 'staff' | 'admin';
  status: string;
  created_at: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compare_price?: number;
  category: string;
  brand: string;
  stock_quantity: number;
  image_url?: string;
  images?: string[];
  specifications?: Record<string, any>;
  tags?: string[];
  market_tag?: string;
  is_active: boolean;
  is_featured: boolean;
  weight?: number;
  dimensions?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method?: string;
  payment_status: string;
  shipping_address: Record<string, any>;
  billing_address?: Record<string, any>;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  service_number: string;
  user_id?: string;
  service_type: string;
  status: string;
  title: string;
  description?: string;
  device_info?: Record<string, any>;
  estimated_cost?: number;
  final_cost?: number;
  technician_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
