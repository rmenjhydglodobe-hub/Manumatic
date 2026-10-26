import pool from "../config/database";
import { Part } from "../types";

// ============================================================
// GET ALL PARTS
// ============================================================

export const findAll = async (): Promise<Part[]> => {
  const [rows] = await pool.execute(
    "SELECT * FROM parts ORDER BY created_at DESC"
  );
  return rows as Part[];
};

// ============================================================
// FIND PART BY ID
// ============================================================

export const findById = async (partId: number): Promise<Part | null> => {
  const [rows] = await pool.execute(
    "SELECT * FROM parts WHERE part_id = ? LIMIT 1",
    [partId]
  );

  const parts = rows as Part[];
  return parts.length > 0 ? parts[0] : null;
};

// ============================================================
// FIND PART BY PART NUMBER
// ============================================================

export const findByPartNumber = async (
  partNumber: string
): Promise<Part | null> => {
  const [rows] = await pool.execute(
    "SELECT * FROM parts WHERE part_number = ? LIMIT 1",
    [partNumber]
  );

  const parts = rows as Part[];
  return parts.length > 0 ? parts[0] : null;
};

// ============================================================
// CREATE PART
// ============================================================

export interface CreatePartInput {
  part_number: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  cost_price: number;
  markup_percent: number;
  reorder_level: number;
  quantity: number;
  location: string | null;
  supplier: string | null;
  image: string | null;
}

export const create = async (data: CreatePartInput): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO parts
      (part_number, name, category, description, price, cost_price, markup_percent, reorder_level, quantity, location, supplier, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.part_number,
      data.name,
      data.category,
      data.description,
      data.price,
      data.cost_price,
      data.markup_percent,
      data.reorder_level,
      data.quantity,
      data.location,
      data.supplier,
      data.image,
    ]
  );

  return (result as any).insertId;
};

// ============================================================
// UPDATE PART
// ============================================================

export interface UpdatePartInput extends CreatePartInput {
  part_id: number;
}

export const update = async (data: UpdatePartInput): Promise<number> => {
  const [result] = await pool.execute(
    `UPDATE parts SET
      part_number = ?,
      name = ?,
      category = ?,
      description = ?,
      price = ?,
      cost_price = ?,
      markup_percent = ?,
      reorder_level = ?,
      quantity = ?,
      location = ?,
      supplier = ?,
      image = ?
     WHERE part_id = ?`,
    [
      data.part_number,
      data.name,
      data.category,
      data.description,
      data.price,
      data.cost_price,
      data.markup_percent,
      data.reorder_level,
      data.quantity,
      data.location,
      data.supplier,
      data.image,
      data.part_id,
    ]
  );

  return (result as any).affectedRows;
};

// ============================================================
// DELETE PART
// ============================================================

export const remove = async (partId: number): Promise<number> => {
  const [result] = await pool.execute(
    "DELETE FROM parts WHERE part_id = ?",
    [partId]
  );

  return (result as any).affectedRows;
};

// ============================================================
// SEARCH PARTS
// ============================================================

export const search = async (
  q?: string,
  category?: string
): Promise<Part[]> => {
  let query = "SELECT * FROM parts WHERE 1=1";
  const params: any[] = [];

  if (q) {
    query += " AND (name LIKE ? OR part_number LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  if (category && category !== "all") {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY name ASC";

  const [rows] = await pool.execute(query, params);
  return rows as Part[];
};

// ============================================================
// GET LOW STOCK PARTS
// ============================================================

export const findLowStock = async (): Promise<Part[]> => {
  const [rows] = await pool.execute(
    `SELECT * FROM parts
     WHERE quantity <= reorder_level
     ORDER BY quantity ASC`
  );
  return rows as Part[];
};

// ============================================================
// DASHBOARD HELPERS
// ============================================================

export const countParts = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM parts"
  );
  return (rows as any[])[0].total;
};

export const countLowStock = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM parts WHERE quantity <= reorder_level"
  );
  return (rows as any[])[0].total;
};

export const sumQuantity = async (): Promise<number> => {
  const [rows] = await pool.execute(
    "SELECT COALESCE(SUM(quantity), 0) AS total FROM parts"
  );
  return Number((rows as any[])[0].total);
};