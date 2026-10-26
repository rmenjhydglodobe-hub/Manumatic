import { Request } from "express";

// ============================================================
// DATABASE MODELS
// ============================================================

export interface User {
  user_id: number;
  username: string;
  password: string;
  role: "admin" | "manager";
  name: string;
  email: string;
  created_at: Date;
  last_login: Date | null;
  is_active: number;
}

export interface UserPublic {
  user_id: number;
  username: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

export interface Part {
  part_id: number;
  part_number: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  cost_price: number; // Added
  markup_percent: number; // Added
  reorder_level: number;
  quantity: number;
  location: string | null;
  supplier: string | null; // Added
  image: string | null;
  created_at: Date;
}

export interface Sale {
  sale_id: number;
  user_id: number;
  part_id: number;
  quantity: number;
  total_price: number;
  sale_date: Date;
  payment_type: string;
  receipt_no: string;
}

export interface SaleWithDetails extends Sale {
  part_name: string;
  user_name: string;
}

// ============================================================
// AUTH / REQUEST HELPERS
// ============================================================

export interface AuthRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    role: "admin" | "manager";
  };
}

export interface JwtPayload {
  user_id: number;
  username: string;
  role: "admin" | "manager";
}

// ============================================================
// REQUEST BODIES
// ============================================================

export interface LoginBody {
  username: string;
  password: string;
}

export interface CreatePartBody {
  part_number: string;
  name: string;
  category: string;
  description?: string;
  price: number | string;
  cost_price?: number | string; // Added
  markup_percent?: number | string; // Added
  reorder_level?: number | string;
  quantity?: number | string;
  location?: string;
  supplier?: string; // Added
  image?: string;
}

export type UpdatePartBody = Partial<CreatePartBody>;

export interface CreateSaleBody {
  part_id: number;
  quantity: number;
  payment_type: string;
}

// ============================================================
// DASHBOARD RESPONSE SHAPES
// ============================================================

export interface DashboardStats {
  todaySales: {
    total_sales: number;
    transaction_count: number;
  };
  totalTransactions: number;
  lowStockItems: number;
  partsInCatalog: number;
  unitsOnHand: number;
}

export interface ActivityLog {
  time: string;
  text: string;
}

export interface TopSellingPart {
  part_id: number;
  name: string;
  sold: number;
  revenue: number;
}

export interface SalesTrendPoint {
  day: string;
  sales: number;
}
