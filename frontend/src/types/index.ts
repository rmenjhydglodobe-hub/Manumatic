// ============================================================
// USER
// ============================================================

export interface User {
  user_id: number;
  username: string;
  role: "admin" | "manager";
  name: string;
  email: string;
}

// ============================================================
// PART
// ============================================================

export interface Part {
  part_id: number;
  part_number: string;
  name: string;
  category: string;
  description: string;
  price: number;
  cost_price: number;
  markup_percent: number;
  supplier: string | null;
  reorder_level: number;
  quantity: number;
  location: string;
  image: string | null;
  created_at: string;
}

// ============================================================
// SALE
// ============================================================

export interface Sale {
  sale_id: number;
  user_id: number;
  part_id: number;
  quantity: number;
  total_price: number;
  sale_date: string;
  payment_type: string;
  receipt_no: string;
  part_name: string;
  user_name: string;
}

// ============================================================
// DASHBOARD
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

// ============================================================
// AUTH
// ============================================================

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}