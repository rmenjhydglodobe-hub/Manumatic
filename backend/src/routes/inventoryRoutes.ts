import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware";
import { requireFields } from "../middleware/validateMiddleware";

const router = Router();

router.use(authenticateToken);

// ============================================================
// SPECIFIC ROUTES FIRST (before /:id)
// ============================================================

router.get("/search", inventoryController.searchParts);
router.get("/low-stock", inventoryController.getLowStock);

router.post(
  "/adjust",
  authorizeRole("admin", "manager"),
  requireFields("part_id", "type", "quantity"),
  inventoryController.adjustStock,
);

router.post(
  "/checkout",
  authorizeRole("admin", "manager"),
  inventoryController.checkout,
);

router.post(
  "/receive",
  authorizeRole("admin", "manager"),
  requireFields("part_id", "quantity", "cost_per_unit", "markup_percent"),
  inventoryController.receiveStock,
);

// ============================================================
// GENERIC CRUD
// ============================================================

router.get("/", inventoryController.getAllParts);
router.get("/:id", inventoryController.getPartById);

router.post(
  "/",
  authorizeRole("admin", "manager"),
  requireFields("part_number", "name", "category", "price"),
  inventoryController.createPart,
);

router.put(
  "/:id",
  authorizeRole("admin", "manager"),
  inventoryController.updatePart,
);

router.delete("/:id", authorizeRole("admin"), inventoryController.deletePart);

export default router;
