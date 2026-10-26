import { Request, Response, NextFunction } from "express";
import * as inventoryService from "../services/inventoryService";
import { CreatePartBody, UpdatePartBody, AuthRequest } from "../types";

// ============================================================
// GET /api/inventory
// ============================================================

export const getAllParts = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parts = await inventoryService.getAllParts();
    res.json(parts);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/inventory/:id
// ============================================================

export const getPartById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid part ID." });
      return;
    }

    const part = await inventoryService.getPartById(id);
    res.json(part);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/inventory
// ============================================================

export const createPart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as CreatePartBody;
    const result = await inventoryService.createPart(body);

    res.status(201).json({
      message: "Part created successfully.",
      part_id: result.part_id,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PUT /api/inventory/:id
// ============================================================

export const updatePart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid part ID." });
      return;
    }

    const body = req.body as UpdatePartBody;
    await inventoryService.updatePart(id, body);

    res.json({ message: "Part updated successfully." });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE /api/inventory/:id
// ============================================================

export const deletePart = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid part ID." });
      return;
    }

    await inventoryService.deletePart(id);

    res.json({ message: "Part deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/inventory/search
// ============================================================

export const searchParts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;
    const category = req.query.category as string | undefined;

    const parts = await inventoryService.searchParts(q, category);
    res.json(parts);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET /api/inventory/low-stock
// ============================================================

export const getLowStock = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parts = await inventoryService.getLowStockParts();
    res.json(parts);
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/inventory/adjust
// ============================================================

export const adjustStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const result = await inventoryService.adjustStock(req.body);

    res.json({
      message: "Stock adjusted successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/inventory/checkout
// ============================================================

export const checkout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const result = await inventoryService.checkout(req.user.user_id, req.body);

    res.status(201).json({
      message: "Sale completed successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// POST /api/inventory/receive
// ============================================================

export const receiveStock = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const result = await inventoryService.receiveStock(
      req.user.user_id,
      req.body,
    );

    res.json({
      message: "Stock received successfully.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
