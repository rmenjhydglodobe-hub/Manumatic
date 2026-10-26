import * as partModel from "../models/partModel";
import * as saleModel from "../models/saleModel";
import pool from "../config/database";
import { Part, CreatePartBody, UpdatePartBody } from "../types";

// ============================================================
// GET ALL PARTS
// ============================================================

export const getAllParts = async (): Promise<Part[]> => {
  return partModel.findAll();
};

// ============================================================
// GET PART BY ID
// ============================================================

export const getPartById = async (id: number): Promise<Part> => {
  const part = await partModel.findById(id);

  if (!part) {
    throw { status: 404, message: "Part not found." };
  }

  return part;
};

// ============================================================
// CREATE PART
// ============================================================

export const createPart = async (
  body: CreatePartBody,
): Promise<{ part_id: number }> => {
  const part_number = body.part_number?.trim();
  const name = body.name?.trim();
  const category = body.category?.trim();

  if (!part_number) {
    throw { status: 400, message: "Part number is required." };
  }
  if (!name) {
    throw { status: 400, message: "Name is required." };
  }
  if (!category) {
    throw { status: 400, message: "Category is required." };
  }

  const price = Number(body.price);
  if (isNaN(price) || price < 0) {
    throw { status: 400, message: "Price must be a positive number." };
  }

  const reorder_level = Number(body.reorder_level ?? 10);
  if (isNaN(reorder_level) || reorder_level < 0) {
    throw { status: 400, message: "Reorder level must be a positive number." };
  }

  const quantity = Number(body.quantity ?? 0);
  if (isNaN(quantity) || quantity < 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  const cost_price = Number(body.cost_price ?? 0);
  const markup_percent = Number(body.markup_percent ?? 20);

  const existing = await partModel.findByPartNumber(part_number);
  if (existing) {
    throw { status: 400, message: "Part number already exists." };
  }

  const part_id = await partModel.create({
    part_number,
    name,
    category,
    description: body.description?.trim() || null,
    price,
    cost_price,
    markup_percent,
    reorder_level,
    quantity,
    location: body.location?.trim() || null,
    supplier: body.supplier?.trim() || null,
    image: body.image || null,
  });

  return { part_id };
};

// ============================================================
// UPDATE PART
// ============================================================

export const updatePart = async (
  id: number,
  body: UpdatePartBody,
): Promise<void> => {
  const current = await partModel.findById(id);
  if (!current) {
    throw { status: 404, message: "Part not found." };
  }

  const part_number = body.part_number?.trim() ?? current.part_number;
  const name = body.name?.trim() ?? current.name;
  const category = body.category?.trim() ?? current.category;
  const description =
    body.description !== undefined
      ? body.description?.trim() || null
      : current.description;

  const price = body.price !== undefined ? Number(body.price) : current.price;
  if (isNaN(price) || price < 0) {
    throw { status: 400, message: "Price must be a positive number." };
  }

  const cost_price =
    body.cost_price !== undefined
      ? Number(body.cost_price)
      : current.cost_price;
  const markup_percent =
    body.markup_percent !== undefined
      ? Number(body.markup_percent)
      : current.markup_percent;

  const reorder_level =
    body.reorder_level !== undefined
      ? Number(body.reorder_level)
      : current.reorder_level;
  if (isNaN(reorder_level) || reorder_level < 0) {
    throw { status: 400, message: "Reorder level must be a positive number." };
  }

  const quantity =
    body.quantity !== undefined ? Number(body.quantity) : current.quantity;
  if (isNaN(quantity) || quantity < 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  const location =
    body.location !== undefined
      ? body.location?.trim() || null
      : current.location;

  const supplier =
    body.supplier !== undefined
      ? body.supplier?.trim() || null
      : current.supplier;

  const image = body.image !== undefined ? body.image : current.image;

  if (part_number !== current.part_number) {
    const duplicate = await partModel.findByPartNumber(part_number);
    if (duplicate) {
      throw { status: 400, message: "Part number already exists." };
    }
  }

  await partModel.update({
    part_id: id,
    part_number,
    name,
    category,
    description,
    price,
    cost_price,
    markup_percent,
    reorder_level,
    quantity,
    location,
    supplier,
    image,
  });
};

// ============================================================
// DELETE PART
// ============================================================

export const deletePart = async (id: number): Promise<void> => {
  const affected = await partModel.remove(id);

  if (affected === 0) {
    throw { status: 404, message: "Part not found." };
  }
};

// ============================================================
// SEARCH PARTS
// ============================================================

export const searchParts = async (
  q?: string,
  category?: string,
): Promise<Part[]> => {
  return partModel.search(q, category);
};

// ============================================================
// GET LOW STOCK PARTS
// ============================================================

export const getLowStockParts = async (): Promise<Part[]> => {
  return partModel.findLowStock();
};

// ============================================================
// ADJUST STOCK
// ============================================================

export interface AdjustStockBody {
  part_id: number;
  type: "in" | "out";
  quantity: number;
  reason?: string;
  notes?: string;
}

export const adjustStock = async (
  body: AdjustStockBody,
): Promise<{ old_quantity: number; new_quantity: number }> => {
  if (!body.part_id || isNaN(body.part_id)) {
    throw { status: 400, message: "Valid part ID is required." };
  }

  if (body.type !== "in" && body.type !== "out") {
    throw { status: 400, message: "Type must be 'in' or 'out'." };
  }

  const qty = Number(body.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw { status: 400, message: "Quantity must be a positive number." };
  }

  const part = await partModel.findById(body.part_id);
  if (!part) {
    throw { status: 404, message: "Part not found." };
  }

  const oldQty = part.quantity;
  let newQty: number;

  if (body.type === "in") {
    newQty = oldQty + qty;
  } else {
    if (qty > oldQty) {
      throw {
        status: 400,
        message: `Cannot remove ${qty} units. Only ${oldQty} in stock.`,
      };
    }
    newQty = oldQty - qty;
  }

  await partModel.update({
    part_id: part.part_id,
    part_number: part.part_number,
    name: part.name,
    category: part.category,
    description: part.description,
    price: part.price,
    cost_price: part.cost_price,
    markup_percent: part.markup_percent,
    reorder_level: part.reorder_level,
    quantity: newQty,
    location: part.location,
    supplier: part.supplier,
    image: part.image,
  });

  return { old_quantity: oldQty, new_quantity: newQty };
};

// ============================================================
// RECEIVE STOCK (Updates cost, price, and quantity)
// ============================================================

export interface ReceiveStockBody {
  part_id: number;
  quantity: number;
  cost_per_unit: number;
  markup_percent: number;
  manual_price?: number;
  supplier?: string;
}

export const receiveStock = async (
  userId: number,
  body: ReceiveStockBody,
): Promise<{ new_price: number; new_quantity: number }> => {
  const {
    part_id,
    quantity,
    cost_per_unit,
    markup_percent,
    manual_price,
    supplier,
  } = body;

  if (!part_id || isNaN(part_id)) {
    throw { status: 400, message: "Valid part ID is required." };
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    throw { status: 400, message: "Quantity must be greater than zero." };
  }

  const cost = Number(cost_per_unit);
  if (isNaN(cost) || cost < 0) {
    throw { status: 400, message: "Cost must be a valid number." };
  }

  const markup = Number(markup_percent);
  if (isNaN(markup) || markup < 0) {
    throw { status: 400, message: "Markup must be a valid number." };
  }

  const part = await partModel.findById(part_id);
  if (!part) {
    throw { status: 404, message: "Part not found." };
  }

  // ---- Calculate new selling price ----
  // If manual_price is provided, use that. Otherwise, calculate based on markup.
  const new_price =
    manual_price !== undefined && !isNaN(manual_price)
      ? Number(manual_price)
      : cost * (1 + markup / 100);

  const new_quantity = part.quantity + qty;

  // ---- Save receipt record (audit trail) ----
  await pool.execute(
    `INSERT INTO stock_receipts 
      (part_id, user_id, quantity, cost_per_unit, total_cost)
     VALUES (?, ?, ?, ?, ?)`,
    [part_id, userId, qty, cost, qty * cost],
  );

  // ---- Update the part ----
  await partModel.update({
    part_id: part.part_id,
    part_number: part.part_number,
    name: part.name,
    category: part.category,
    description: part.description,
    price: new_price,
    cost_price: cost,
    markup_percent: markup,
    reorder_level: part.reorder_level,
    quantity: new_quantity,
    location: part.location,
    supplier: supplier?.trim() || part.supplier,
    image: part.image,
  });

  return { new_price, new_quantity };
};

// ============================================================
// CHECKOUT (POS — Cash Only)
// ============================================================

export interface CheckoutItem {
  part_id: number;
  quantity: number;
}

export interface CheckoutBody {
  items: CheckoutItem[];
  payment_type?: string;
}

export const checkout = async (
  userId: number,
  body: CheckoutBody,
): Promise<{
  receipt_no: string;
  total: number;
  item_count: number;
}> => {
  if (!body.items || body.items.length === 0) {
    throw { status: 400, message: "Cart is empty." };
  }

  const payment_type = "Cash";

  const itemsWithPrices: Array<{
    part_id: number;
    quantity: number;
    unit_price: number;
  }> = [];

  for (const item of body.items) {
    if (!item.part_id || isNaN(item.part_id)) {
      throw { status: 400, message: "Invalid part ID in cart." };
    }

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw { status: 400, message: "Quantity must be greater than zero." };
    }

    const part = await partModel.findById(item.part_id);
    if (!part) {
      throw { status: 404, message: `Part ID ${item.part_id} not found.` };
    }

    if (part.quantity < qty) {
      throw {
        status: 400,
        message: `Insufficient stock for "${part.name}". Only ${part.quantity} available.`,
      };
    }

    itemsWithPrices.push({
      part_id: item.part_id,
      quantity: qty,
      unit_price: Number(part.price),
    });
  }

  const receipt_no = await saleModel.generateReceiptNo();

  const result = await saleModel.createSaleWithItems({
    user_id: userId,
    items: itemsWithPrices,
    payment_type,
    receipt_no,
  });

  return {
    receipt_no,
    total: result.total,
    item_count: itemsWithPrices.reduce((sum, i) => sum + i.quantity, 0),
  };
};
