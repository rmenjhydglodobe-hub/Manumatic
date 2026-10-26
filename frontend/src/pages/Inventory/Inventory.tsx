import { useState, useEffect, useMemo, FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  PackagePlus,
  PackageMinus,
  Sliders,
  Store,
  Users as UsersIcon,
  Key,
  Power,
  Eye,
  EyeOff,
  ArrowDownToLine,
} from "lucide-react";
import {
  getAllParts,
  createPart,
  updatePart,
  deletePart,
  adjustStock,
  listUsers,
  createUser,
  resetUserPassword,
  toggleUserActive,
  receiveStock,
} from "../../services/api";
import { Part } from "../../types";
import "./Inventory.css";

// ============================================================
// TYPES
// ============================================================

type Tab = "catalog" | "adjustments" | "availability" | "settings";

// Split sort types for individual columns
type NameSort = "name-asc" | "name-desc";
type PriceSort = "price-asc" | "price-desc" | "none";
type StockSort = "qty-asc" | "qty-desc" | "low-first" | "none";

// Combined type for Availability tab (keeps the old behavior)
type SortOption =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "qty-asc"
  | "qty-desc"
  | "low-first";

type StockFilter = "all" | "in" | "low" | "out";

interface ToastState {
  message: string;
  type: ToastType;
}

interface AppUser {
  user_id: number;
  username: string;
  role: "admin" | "manager";
  name: string;
  email: string;
  created_at: string;
  last_login: string | null;
  is_active: number;
}

const REASONS_IN = [
  "Restock from supplier",
  "Customer return",
  "Found in storage",
  "Correction",
];
const REASONS_OUT = [
  "Damaged",
  "Lost",
  "Internal use",
  "Correction",
  "Returned to supplier",
];

// ============================================================
// COMPONENT
// ============================================================

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ---- Tabs ----
  const [activeTab, setActiveTab] = useState<Tab>("catalog");

  // ---- Catalog ----
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ✅ Split sort states
  const [nameSort, setNameSort] = useState<NameSort>("name-asc");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [stockSort, setStockSort] = useState<StockSort>("none");

  // ---- Part Modal ----
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // ---- Receive Supply Modal ----
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<Part | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    quantity: "",
    cost_per_unit: "",
    markup_percent: "",
    manual_price: "",
    supplier: "",
  });
  const [receiveSaving, setReceiveSaving] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  // ---- Delete ----
  const [confirmTarget, setConfirmTarget] = useState<Part | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Toast ----
  const [toast, setToast] = useState<ToastState | null>(null);

  // ---- Part Form ----
  const [form, setForm] = useState({
    part_number: "",
    name: "",
    category: "",
    description: "",
    price: "",
    cost_price: "",
    markup_percent: "20",
    reorder_level: "10",
    quantity: "0",
    location: "",
    supplier: "",
  });

  // ---- Stock Adjustment ----
  const [adjMode, setAdjMode] = useState<"existing" | "new">("existing");
  const [adjPart, setAdjPart] = useState<number | "">("");
  const [adjType, setAdjType] = useState<"in" | "out">("in");
  const [adjQty, setAdjQty] = useState("1");
  const [adjReason, setAdjReason] = useState(REASONS_IN[0]);
  const [adjNotes, setAdjNotes] = useState("");

  // Pricing fields for Stock In (now includes Name, Category, Supplier)
  const [adjName, setAdjName] = useState("");
  const [adjCategory, setAdjCategory] = useState("");
  const [adjCost, setAdjCost] = useState("");
  const [adjMarkup, setAdjMarkup] = useState("");
  const [adjSupplier, setAdjSupplier] = useState("");

  // New Part fields (for Create New mode)
  const [newPartNumber, setNewPartNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSupplier, setNewSupplier] = useState("");

  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");

  // ---- Check Availability ----
  const [availSearch, setAvailSearch] = useState("");
  const [availSort, setAvailSort] = useState<SortOption>("name-asc");
  const [availFilter, setAvailFilter] = useState<StockFilter>("all");
  const [availCategory, setAvailCategory] = useState<string>("all");

  // ---- Settings ----
  const [storeSettings, setStoreSettings] = useState({
    store_name: "Manumatik Auto Parts Center",
    tax_rate: "12",
    reorder_default: "10",
  });

  // ---- Users ----
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ---- Add User Modal ----
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userModalError, setUserModalError] = useState("");
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "manager" as "admin" | "manager",
  });

  // ---- Reset Password Modal ----
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetAdminPw, setShowResetAdminPw] = useState(false);
  const [showResetNewPw, setShowResetNewPw] = useState(false);
  const [showResetConfirmPw, setShowResetConfirmPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");

  // ---- Toggle Active Confirm ----
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "settings" && isAdmin) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  useEffect(() => {
    setAdjReason(adjType === "in" ? REASONS_IN[0] : REASONS_OUT[0]);
  }, [adjType]);

  // Populate ALL fields when the selected part changes in the adjustments tab
  useEffect(() => {
    if (adjMode === "existing" && adjPart) {
      const p = parts.find((x) => x.part_id === adjPart);
      if (p) {
        setAdjName(p.name);
        setAdjCategory(p.category);
        setAdjCost(p.cost_price?.toString() || "0");
        setAdjMarkup(p.markup_percent?.toString() || "20");
        setAdjSupplier(p.supplier || "");
      }
    } else {
      setAdjName("");
      setAdjCategory("");
      setAdjCost("");
      setAdjMarkup("");
      setAdjSupplier("");
    }
  }, [adjPart, parts, adjMode]);

  // Auto-calculate selling price in the Add/Edit form
  useEffect(() => {
    const cost = parseFloat(form.cost_price) || 0;
    const markup = parseFloat(form.markup_percent) || 0;
    const calculatedPrice = cost * (1 + markup / 100);

    if (
      form.price !== calculatedPrice.toString() &&
      (cost > 0 || form.price === "")
    ) {
      setForm((prev) => ({ ...prev, price: calculatedPrice.toString() }));
    }
  }, [form.cost_price, form.markup_percent]);

  // ============================================================
  // FETCHERS
  // ============================================================

  const fetchParts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAllParts();
      setParts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load parts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await listUsers();
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // ============================================================
  // SORTING LOGIC
  // ============================================================

  const handleSortChange = (
    type: "name" | "price" | "stock",
    value: string,
  ) => {
    if (type === "name") {
      setNameSort(value as NameSort);
      setPriceSort("none");
      setStockSort("none");
    } else if (type === "price") {
      setPriceSort(value as PriceSort);
      setNameSort("name-asc");
      setStockSort("none");
    } else if (type === "stock") {
      setStockSort(value as StockSort);
      setNameSort("name-asc");
      setPriceSort("none");
    }
  };

  // ============================================================
  // PART CRUD
  // ============================================================

  const openAddModal = () => {
    setEditingPart(null);
    setForm({
      part_number: "",
      name: "",
      category: "",
      description: "",
      price: "",
      cost_price: "",
      markup_percent: "20",
      reorder_level: "10",
      quantity: "0",
      location: "",
      supplier: "",
    });
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (part: Part) => {
    setEditingPart(part);
    setForm({
      part_number: part.part_number,
      name: part.name,
      category: part.category,
      description: part.description || "",
      price: String(part.price),
      cost_price: String(part.cost_price || ""),
      markup_percent: String(part.markup_percent || "20"),
      reorder_level: String(part.reorder_level),
      quantity: String(part.quantity),
      location: part.location || "",
      supplier: part.supplier || "",
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPart(null);
    setModalError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError("");
    setSaving(true);

    try {
      if (editingPart) {
        await updatePart(editingPart.part_id, form);
        showToast(`"${form.name}" was updated.`, "success");
      } else {
        await createPart(form);
        showToast(`"${form.name}" was added to the catalog.`, "success");
      }
      await fetchParts();
      closeModal();
    } catch (err: any) {
      setModalError(err.response?.data?.message || "Failed to save part.");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (part: Part) => setConfirmTarget(part);
  const cancelDelete = () => !deleting && setConfirmTarget(null);

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await deletePart(confirmTarget.part_id);
      showToast(`"${confirmTarget.name}" was deleted.`, "success");
      setConfirmTarget(null);
      await fetchParts();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete.", "error");
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // RECEIVE SUPPLY (FROM CATALOG ACTION BUTTON)
  // ============================================================

  const openReceiveModal = (part: Part) => {
    setReceiveTarget(part);
    setReceiveForm({
      quantity: "",
      cost_per_unit: part.cost_price?.toString() || "0",
      markup_percent: part.markup_percent?.toString() || "20",
      manual_price: "",
      supplier: part.supplier || "",
    });
    setReceiveError("");
    setShowReceiveModal(true);
  };

  const handleReceiveSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!receiveTarget) return;
    setReceiveError("");
    setReceiveSaving(true);

    try {
      await receiveStock({
        part_id: receiveTarget.part_id,
        quantity: parseInt(receiveForm.quantity),
        cost_per_unit: parseFloat(receiveForm.cost_per_unit),
        markup_percent: parseFloat(receiveForm.markup_percent),
        manual_price: receiveForm.manual_price
          ? parseFloat(receiveForm.manual_price)
          : undefined,
        supplier: receiveForm.supplier || undefined,
      });
      showToast(`Received stock for "${receiveTarget.name}".`, "success");
      setShowReceiveModal(false);
      await fetchParts();
    } catch (err: any) {
      setReceiveError(
        err.response?.data?.message || "Failed to receive stock.",
      );
    } finally {
      setReceiveSaving(false);
    }
  };

  // ============================================================
  // STOCK ADJUSTMENT
  // ============================================================

  const selectedPart = parts.find((p) => p.part_id === adjPart);
  const adjQtyNum = parseInt(adjQty) || 0;

  const handleAdjustSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdjError("");

    if (adjMode === "existing" && !selectedPart) {
      setAdjError("Please select a part.");
      return;
    }

    if (adjMode === "new") {
      if (!newPartNumber || !newName || !newCategory) {
        setAdjError("Part Number, Name, and Category are required.");
        return;
      }
    }

    if (adjQtyNum <= 0) {
      setAdjError("Quantity must be greater than zero.");
      return;
    }

    if (
      adjType === "out" &&
      selectedPart &&
      adjQtyNum > selectedPart.quantity
    ) {
      setAdjError(
        `Cannot remove ${adjQtyNum} units. Only ${selectedPart.quantity} in stock.`,
      );
      return;
    }

    setAdjSaving(true);
    try {
      if (adjMode === "new") {
        const newPrice =
          (parseFloat(adjCost) || 0) * (1 + (parseFloat(adjMarkup) || 0) / 100);

        await createPart({
          part_number: newPartNumber,
          name: newName,
          category: newCategory,
          description: "",
          price: newPrice.toString(),
          cost_price: adjCost,
          markup_percent: adjMarkup,
          reorder_level: "10",
          quantity: adjQty,
          location: "",
          supplier: adjSupplier || newSupplier,
        });
        showToast(
          `New part "${newName}" created with ${adjQty} units.`,
          "success",
        );
        setAdjMode("existing");
        setNewPartNumber("");
        setNewName("");
        setNewCategory("");
        setNewSupplier("");
      } else if (adjType === "in" && selectedPart) {
        const newCost = parseFloat(adjCost) || 0;
        const newMarkup = parseFloat(adjMarkup) || 0;

        // ✅ 1.5 Detect Changes across all relevant fields
        const isCostChanged = Number(selectedPart.cost_price) !== newCost;
        const isMarkupChanged =
          Number(selectedPart.markup_percent) !== newMarkup;
        const isSupplierChanged = (selectedPart.supplier || "") !== adjSupplier;
        const isCategoryChanged = selectedPart.category !== adjCategory;
        const isNameChanged = selectedPart.name !== adjName;

        const hasChanged =
          isCostChanged ||
          isMarkupChanged ||
          isSupplierChanged ||
          isCategoryChanged ||
          isNameChanged;

        if (hasChanged) {
          // ✅ 1.1, 1.3, 1.4 Professional Clone Logic
          // Extract base part number (remove any existing -V1, -V2, etc.)
          const basePartNumber = selectedPart.part_number.split("-V")[0];

          // Find how many variants of this base part already exist to generate the next number
          const existingVariants = parts.filter((p) =>
            p.part_number.startsWith(basePartNumber + "-V"),
          );
          let nextVersionNum = 1;

          if (existingVariants.length > 0) {
            const highestVersion = Math.max(
              ...existingVariants.map((v) => {
                const match = v.part_number.match(/-V(\d+)$/);
                return match ? parseInt(match[1]) : 0;
              }),
            );
            nextVersionNum = highestVersion + 1;
          }

          const newPartNumberStr = `${basePartNumber}-V${nextVersionNum}`;

          // ✅ 1.4 Extract base name (remove any existing (v1), (v2), etc.) and append the new version number
          const baseName = selectedPart.name.replace(/\s*\(v\d+\)$/, "");
          const newNameStr = `${baseName} (v${nextVersionNum})`;

          await createPart({
            part_number: newPartNumberStr,
            name: newNameStr, // Use the new modified name
            category: adjCategory, // Use the new modified category
            description: selectedPart.description || "",
            price: (newCost * (1 + newMarkup / 100)).toString(),
            cost_price: newCost.toString(),
            markup_percent: newMarkup.toString(),
            reorder_level: selectedPart.reorder_level.toString(),
            quantity: adjQtyNum.toString(),
            location: selectedPart.location || "",
            supplier: adjSupplier, // Use the new modified supplier
          });
          showToast(
            `Details changed. Created new variant: "${newNameStr}".`,
            "success",
          );
        } else {
          // ✅ 1.2 No changes detected, just add stock to existing
          await receiveStock({
            part_id: selectedPart.part_id,
            quantity: adjQtyNum,
            cost_per_unit: newCost,
            markup_percent: newMarkup,
            supplier: adjSupplier || undefined,
          });
          showToast(
            `Added ${adjQtyNum} units to "${selectedPart.name}".`,
            "success",
          );
        }
      } else if (selectedPart) {
        // STOCK OUT LOGIC
        await adjustStock({
          part_id: selectedPart.part_id,
          type: adjType,
          quantity: adjQtyNum,
          reason: adjReason,
          notes: adjNotes || undefined,
        });
        showToast(
          `Removed ${adjQtyNum} unit(s) from "${selectedPart.name}".`,
          "success",
        );
      }

      setAdjQty("1");
      setAdjNotes("");
      await fetchParts();
    } catch (err: any) {
      setAdjError(err.response?.data?.message || "Failed to process.");
    } finally {
      setAdjSaving(false);
    }
  };

  // ============================================================
  // AVAILABILITY — Memoized
  // ============================================================

  const categories = useMemo(() => {
    const set = new Set(parts.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [parts]);

  const availabilityData = useMemo(() => {
    let list = [...parts];

    if (availSearch) {
      const q = availSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.part_number.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (availCategory !== "all") {
      list = list.filter((p) => p.category === availCategory);
    }

    if (availFilter === "in") {
      list = list.filter((p) => p.quantity > p.reorder_level);
    } else if (availFilter === "low") {
      list = list.filter(
        (p) => p.quantity > 0 && p.quantity <= p.reorder_level,
      );
    } else if (availFilter === "out") {
      list = list.filter((p) => p.quantity === 0);
    }

    list.sort((a, b) => {
      switch (availSort) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "qty-asc":
          return a.quantity - b.quantity;
        case "qty-desc":
          return b.quantity - a.quantity;
        case "low-first": {
          const aLow = a.quantity <= a.reorder_level ? 0 : 1;
          const bLow = b.quantity <= b.reorder_level ? 0 : 1;
          if (aLow !== bLow) return aLow - bLow;
          return a.quantity - b.quantity;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [parts, availSearch, availSort, availFilter, availCategory]);

  const lowStockCount = parts.filter(
    (p) => p.quantity <= p.reorder_level,
  ).length;

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  const openAddUserModal = () => {
    setUserForm({
      username: "",
      password: "",
      name: "",
      email: "",
      role: "manager",
    });
    setUserModalError("");
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setUserModalError("");
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUserModalError("");
    setUserSaving(true);

    try {
      await createUser(userForm);
      showToast(`User "${userForm.username}" was created.`, "success");
      closeUserModal();
      await fetchUsers();
    } catch (err: any) {
      setUserModalError(
        err.response?.data?.message || "Failed to create user.",
      );
    } finally {
      setUserSaving(false);
    }
  };

  // ---- Reset Password flow ----
  const openResetPasswordModal = (u: AppUser) => {
    setResetTarget(u);
    setResetAdminPassword("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowResetAdminPw(false);
    setShowResetNewPw(false);
    setShowResetConfirmPw(false);
    setResetError("");
  };

  const closeResetPasswordModal = () => {
    if (resetSaving) return;
    setResetTarget(null);
    setResetAdminPassword("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setShowResetAdminPw(false);
    setShowResetNewPw(false);
    setShowResetConfirmPw(false);
    setResetError("");
  };

  const handleResetPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError("");

    if (!resetAdminPassword) {
      setResetError("Please enter your password to confirm.");
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New password and confirmation do not match.");
      return;
    }

    setResetSaving(true);
    try {
      await resetUserPassword(
        resetTarget.user_id,
        resetAdminPassword,
        resetNewPassword,
      );
      showToast(`Password for "${resetTarget.username}" was reset.`, "success");
      closeResetPasswordModal();
    } catch (err: any) {
      setResetError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setResetSaving(false);
    }
  };

  // ---- Toggle Active flow ----
  const requestToggleActive = (u: AppUser) => setToggleTarget(u);
  const cancelToggleActive = () => !togglingActive && setToggleTarget(null);

  const confirmToggleActive = async () => {
    if (!toggleTarget) return;
    setTogglingActive(true);

    const newStatus = toggleTarget.is_active === 1 ? false : true;

    try {
      await toggleUserActive(toggleTarget.user_id, newStatus);
      showToast(
        `"${toggleTarget.username}" was ${newStatus ? "enabled" : "disabled"}.`,
        "success",
      );
      setToggleTarget(null);
      await fetchUsers();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to update user.",
        "error",
      );
      setToggleTarget(null);
    } finally {
      setTogglingActive(false);
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const filtered = useMemo(() => {
    let list = parts.filter((p) => {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.part_number.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });

    if (stockSort !== "none") {
      list.sort((a, b) => {
        if (stockSort === "qty-asc") return a.quantity - b.quantity;
        if (stockSort === "qty-desc") return b.quantity - a.quantity;
        if (stockSort === "low-first") {
          const aLow = a.quantity <= a.reorder_level ? 0 : 1;
          const bLow = b.quantity <= b.reorder_level ? 0 : 1;
          if (aLow !== bLow) return aLow - bLow;
          return a.quantity - b.quantity;
        }
        return 0;
      });
    } else if (priceSort !== "none") {
      list.sort((a, b) => {
        if (priceSort === "price-asc") return a.price - b.price;
        if (priceSort === "price-desc") return b.price - a.price;
        return 0;
      });
    } else {
      list.sort((a, b) => {
        if (nameSort === "name-asc") return a.name.localeCompare(b.name);
        if (nameSort === "name-desc") return b.name.localeCompare(a.name);
        return 0;
      });
    }

    return list;
  }, [parts, search, nameSort, priceSort, stockSort]);

  const money = (n: number) =>
    "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const getCategoryClass = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("brake")) return "cat-brakes";
    if (c.includes("engine")) return "cat-engine";
    if (c.includes("electrical")) return "cat-electrical";
    if (c.includes("suspension")) return "cat-suspension";
    if (c.includes("consumable")) return "cat-consumables";
    return "cat-default";
  };

  const reasons = adjType === "in" ? REASONS_IN : REASONS_OUT;

  const formatDate = (s: string | null) => {
    if (!s) return "Never";
    const d = new Date(s);
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Inventory" />

        <div className="inv-content">
          {/* TABS */}
          <div className="inv-tabs">
            {(
              [
                { id: "catalog", label: "Parts Catalog" },
                { id: "adjustments", label: "Stock Adjustments" },
                { id: "availability", label: "Check Availability" },
                { id: "settings", label: "Settings" },
              ] as { id: Tab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`inv-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ============================================================
              TAB: PARTS CATALOG
              ============================================================ */}
          {activeTab === "catalog" && (
            <>
              <div className="inv-toolbar">
                <div className="inv-search">
                  <Search size={15} className="inv-search__icon" />
                  <input
                    type="text"
                    placeholder="Search by part #, name, or category"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="inv-search__input"
                  />
                </div>

                {/* ✅ 3 Separate Sort Pills */}
                <div className="inv-sort-group">
                  {/* Name Sort */}
                  <div className="inv-sort-pill">
                    <span className="inv-sort-label">Name</span>
                    <select
                      value={nameSort}
                      onChange={(e) => handleSortChange("name", e.target.value)}
                      className="inv-sort-select"
                    >
                      <option value="name-asc">A–Z</option>
                      <option value="name-desc">Z–A</option>
                    </select>
                  </div>

                  {/* Price Sort */}
                  <div className="inv-sort-pill">
                    <span className="inv-sort-label">Price</span>
                    <select
                      value={priceSort}
                      onChange={(e) =>
                        handleSortChange("price", e.target.value)
                      }
                      className="inv-sort-select"
                    >
                      <option value="none">Default</option>
                      <option value="price-asc">Low → High</option>
                      <option value="price-desc">High → Low</option>
                    </select>
                  </div>

                  {/* Stock Sort */}
                  <div className="inv-sort-pill">
                    <span className="inv-sort-label">Stock</span>
                    <select
                      value={stockSort}
                      onChange={(e) =>
                        handleSortChange("stock", e.target.value)
                      }
                      className="inv-sort-select"
                    >
                      <option value="none">Default</option>
                      <option value="qty-asc">Low → High</option>
                      <option value="qty-desc">High → Low</option>
                      <option value="low-first">⚠️ Low First</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="inv-add-btn"
                  onClick={openAddModal}
                >
                  <Plus size={15} /> Add part
                </button>
              </div>

              {error && <div className="inv-error">{error}</div>}

              <div className="inv-table-wrap">
                {loading ? (
                  <div className="inv-loading">Loading parts...</div>
                ) : filtered.length === 0 ? (
                  <div className="inv-empty">
                    {search ? "No parts match your search." : "No parts yet."}
                  </div>
                ) : (
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>PART #</th>
                        <th>NAME</th>
                        <th>SUPPLIER</th>
                        <th>CATEGORY</th>
                        <th className="inv-right">PRICE</th>
                        <th className="inv-right">STOCK</th>
                        <th className="inv-right">REORDER AT</th>
                        <th className="inv-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((part) => {
                        const low = part.quantity <= part.reorder_level;
                        return (
                          <tr key={part.part_id}>
                            <td className="inv-mono">{part.part_number}</td>
                            <td>{part.name}</td>
                            <td>{part.supplier || "-"}</td>
                            <td>
                              <span
                                className={`inv-cat ${getCategoryClass(
                                  part.category,
                                )}`}
                              >
                                {part.category}
                              </span>
                            </td>
                            <td className="inv-right">{money(part.price)}</td>
                            <td className={`inv-right ${low ? "inv-low" : ""}`}>
                              {part.quantity}
                            </td>
                            <td className="inv-right">{part.reorder_level}</td>
                            <td className="inv-right">
                              <div className="inv-actions">
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => {
                                    setAdjPart(part.part_id);
                                    setActiveTab("adjustments");
                                  }}
                                  title="Adjust stock"
                                >
                                  <Sliders size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => openReceiveModal(part)}
                                  title="Receive Supply"
                                >
                                  <ArrowDownToLine size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="inv-icon-btn"
                                  onClick={() => openEditModal(part)}
                                  title="Edit part"
                                >
                                  <Pencil size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="inv-icon-btn inv-icon-btn--danger"
                                    onClick={() => requestDelete(part)}
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ============================================================
              TAB: STOCK ADJUSTMENTS
              ============================================================ */}
          {activeTab === "adjustments" && (
            <div className="adj-layout adj-layout--centered">
              <div className="adj-form-card">
                <h2 className="adj-title">Stock Adjustments</h2>

                <div
                  className="adj-mode-toggle"
                  style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
                >
                  <button
                    type="button"
                    className={`btn-secondary ${adjMode === "existing" ? "is-active" : ""}`}
                    onClick={() => setAdjMode("existing")}
                    style={{
                      flex: 1,
                      backgroundColor: adjMode === "existing" ? "#0f6b5c" : "",
                      color: adjMode === "existing" ? "#fff" : "",
                    }}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    className={`btn-secondary ${adjMode === "new" ? "is-active" : ""}`}
                    onClick={() => setAdjMode("new")}
                    style={{
                      flex: 1,
                      backgroundColor: adjMode === "new" ? "#0f6b5c" : "",
                      color: adjMode === "new" ? "#fff" : "",
                    }}
                  >
                    Create New Part
                  </button>
                </div>

                <form onSubmit={handleAdjustSubmit} className="adj-form">
                  {adjMode === "existing" ? (
                    <div className="adj-group">
                      <label>Part</label>
                      <select
                        value={adjPart}
                        onChange={(e) =>
                          setAdjPart(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
                        className="adj-select"
                        required
                      >
                        <option value="">— Select a part —</option>
                        {parts.map((p) => (
                          <option key={p.part_id} value={p.part_id}>
                            {p.name} ({p.supplier || "No Supplier"}) —{" "}
                            {p.quantity} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="form-row">
                        <div className="adj-group">
                          <label>Part Number *</label>
                          <input
                            type="text"
                            value={newPartNumber}
                            onChange={(e) => setNewPartNumber(e.target.value)}
                            className="adj-input"
                            required
                          />
                        </div>
                        <div className="adj-group">
                          <label>Name *</label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="adj-input"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="adj-group">
                          <label>Category *</label>
                          <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="adj-input"
                            required
                          />
                        </div>
                        <div className="adj-group">
                          <label>Supplier</label>
                          <input
                            type="text"
                            value={newSupplier}
                            onChange={(e) => setNewSupplier(e.target.value)}
                            className="adj-input"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="adj-toggle">
                    <button
                      type="button"
                      className={`adj-toggle__btn ${
                        adjType === "in" ? "is-active-in" : ""
                      }`}
                      onClick={() => setAdjType("in")}
                      style={{
                        gridColumn: adjMode === "new" ? "span 2" : "span 1",
                      }}
                    >
                      <PackagePlus size={14} /> Stock in
                    </button>
                    {adjMode === "existing" && (
                      <button
                        type="button"
                        className={`adj-toggle__btn ${
                          adjType === "out" ? "is-active-out" : ""
                        }`}
                        onClick={() => setAdjType("out")}
                      >
                        <PackageMinus size={14} /> Stock out
                      </button>
                    )}
                  </div>

                  <div className="adj-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={adjQty}
                      onChange={(e) => setAdjQty(e.target.value)}
                      className="adj-input"
                      required
                    />
                  </div>

                  {/* ✅ Added editable fields for Name, Category, Supplier to detect changes */}
                  {adjType === "in" &&
                    adjMode === "existing" &&
                    selectedPart && (
                      <>
                        <div className="form-row">
                          <div className="adj-group">
                            <label>Name</label>
                            <input
                              type="text"
                              value={adjName}
                              onChange={(e) => setAdjName(e.target.value)}
                              className="adj-input"
                            />
                          </div>
                          <div className="adj-group">
                            <label>Category</label>
                            <input
                              type="text"
                              value={adjCategory}
                              onChange={(e) => setAdjCategory(e.target.value)}
                              className="adj-input"
                            />
                          </div>
                        </div>
                        <div className="form-row">
                          <div className="adj-group">
                            <label>Cost per Unit (₱)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={adjCost}
                              onChange={(e) => setAdjCost(e.target.value)}
                              className="adj-input"
                            />
                          </div>
                          <div className="adj-group">
                            <label>Markup (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={adjMarkup}
                              onChange={(e) => setAdjMarkup(e.target.value)}
                              className="adj-input"
                            />
                          </div>
                        </div>
                        <div className="adj-group">
                          <label>Supplier</label>
                          <input
                            type="text"
                            value={adjSupplier}
                            onChange={(e) => setAdjSupplier(e.target.value)}
                            placeholder="e.g. Bosch, Denso"
                            className="adj-input"
                          />
                        </div>

                        <div className="adj-preview">
                          <span className="adj-preview__label">
                            New Selling Price
                          </span>
                          <span className="adj-preview__value">
                            <strong>
                              {money(
                                (parseFloat(adjCost) || 0) *
                                  (1 + (parseFloat(adjMarkup) || 0) / 100),
                              )}
                            </strong>
                          </span>
                        </div>
                      </>
                    )}

                  {adjType === "in" && adjMode === "new" && (
                    <>
                      <div className="form-row">
                        <div className="adj-group">
                          <label>Cost per Unit (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={adjCost}
                            onChange={(e) => setAdjCost(e.target.value)}
                            className="adj-input"
                          />
                        </div>
                        <div className="adj-group">
                          <label>Markup (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={adjMarkup}
                            onChange={(e) => setAdjMarkup(e.target.value)}
                            className="adj-input"
                          />
                        </div>
                      </div>

                      <div className="adj-preview">
                        <span className="adj-preview__label">
                          New Selling Price
                        </span>
                        <span className="adj-preview__value">
                          <strong>
                            {money(
                              (parseFloat(adjCost) || 0) *
                                (1 + (parseFloat(adjMarkup) || 0) / 100),
                            )}
                          </strong>
                        </span>
                      </div>
                    </>
                  )}

                  {adjType === "out" && (
                    <div className="adj-group">
                      <label>Reason</label>
                      <select
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        className="adj-select"
                      >
                        {reasons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="adj-group">
                    <label>Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={adjNotes}
                      onChange={(e) => setAdjNotes(e.target.value)}
                      className="adj-input"
                      placeholder="Add any additional notes..."
                    />
                  </div>

                  {adjMode === "existing" &&
                    selectedPart &&
                    adjType === "in" && (
                      <div className="adj-preview">
                        <span className="adj-preview__label">New stock</span>
                        <span className="adj-preview__value">
                          {selectedPart.quantity} →{" "}
                          <strong>{selectedPart.quantity + adjQtyNum}</strong>{" "}
                          units
                        </span>
                      </div>
                    )}

                  {adjError && (
                    <div className="modal-error">
                      <AlertTriangle size={14} />
                      {adjError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="adj-submit"
                    disabled={adjSaving}
                  >
                    {adjSaving ? "Processing..." : "Apply adjustment"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ============================================================
              TAB: CHECK AVAILABILITY
              ============================================================ */}
          {activeTab === "availability" && (
            <div className="avail-layout">
              {lowStockCount > 0 && (
                <div className="avail-alert">
                  <AlertTriangle size={15} className="avail-alert__icon" />
                  <span className="avail-alert__text">
                    <strong>{lowStockCount}</strong>{" "}
                    {lowStockCount === 1 ? "item needs" : "items need"}{" "}
                    reordering.
                  </span>
                  <button
                    type="button"
                    className="avail-alert__action"
                    onClick={() => setAvailFilter("low")}
                  >
                    Show only low stock
                  </button>
                </div>
              )}

              <div className="avail-toolbar">
                <div className="avail-toolbar__search">
                  <Search size={15} className="avail-toolbar__search-icon" />
                  <input
                    type="text"
                    placeholder="Search parts by name, part #, or category..."
                    value={availSearch}
                    onChange={(e) => setAvailSearch(e.target.value)}
                    className="avail-toolbar__search-input"
                  />
                </div>

                <div className="avail-toolbar__field">
                  <label className="avail-toolbar__label">Category</label>
                  <select
                    value={availCategory}
                    onChange={(e) => setAvailCategory(e.target.value)}
                    className="avail-toolbar__select"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === "all" ? "All Categories" : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="avail-toolbar__field">
                  <label className="avail-toolbar__label">Stock Status</label>
                  <select
                    value={availFilter}
                    onChange={(e) =>
                      setAvailFilter(e.target.value as StockFilter)
                    }
                    className="avail-toolbar__select"
                  >
                    <option value="all">All Stock</option>
                    <option value="in">In Stock</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>

                <div className="avail-toolbar__field">
                  <label className="avail-toolbar__label">Sort by</label>
                  <select
                    value={availSort}
                    onChange={(e) => setAvailSort(e.target.value as SortOption)}
                    className="avail-toolbar__select"
                  >
                    <option value="name-asc">Name (A–Z)</option>
                    <option value="name-desc">Name (Z–A)</option>
                    <option value="price-asc">Price (Low → High)</option>
                    <option value="price-desc">Price (High → Low)</option>
                    <option value="qty-asc">Stock (Low → High)</option>
                    <option value="qty-desc">Stock (High → Low)</option>
                    <option value="low-first">⚠️ Low stock first</option>
                  </select>
                </div>
              </div>

              {availabilityData.length === 0 ? (
                <div className="inv-empty">No parts match your filters.</div>
              ) : (
                <div className="avail-list">
                  {availabilityData.map((part) => {
                    const outOfStock = part.quantity === 0;
                    const isLow =
                      part.quantity > 0 && part.quantity <= part.reorder_level;
                    return (
                      <div className="avail-card" key={part.part_id}>
                        <div className="avail-card__left">
                          <div className="avail-card__name">{part.name}</div>
                          <div className="avail-card__meta">
                            {part.part_number} · {money(part.price)} ·{" "}
                            {part.category}
                          </div>
                        </div>
                        <div className="avail-card__right">
                          <span
                            className={`avail-badge ${
                              outOfStock
                                ? "avail-badge--out"
                                : isLow
                                  ? "avail-badge--low"
                                  : "avail-badge--in"
                            }`}
                          >
                            {part.quantity} in stock
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: SETTINGS
              ============================================================ */}
          {activeTab === "settings" && (
            <div className="settings-layout">
              <div className="settings-card">
                <div className="settings-header">
                  <Store size={16} />
                  <h3>Store settings</h3>
                </div>

                <div className="settings-body">
                  <div className="adj-group">
                    <label>Store name</label>
                    <input
                      type="text"
                      value={storeSettings.store_name}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          store_name: e.target.value,
                        })
                      }
                      className="adj-input"
                    />
                  </div>
                  <div className="adj-group">
                    <label>Sales tax rate (%)</label>
                    <input
                      type="number"
                      value={storeSettings.tax_rate}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          tax_rate: e.target.value,
                        })
                      }
                      className="adj-input"
                    />
                  </div>
                  <div className="adj-group">
                    <label>Default reorder threshold</label>
                    <input
                      type="number"
                      value={storeSettings.reorder_default}
                      onChange={(e) =>
                        setStoreSettings({
                          ...storeSettings,
                          reorder_default: e.target.value,
                        })
                      }
                      className="adj-input"
                    />
                  </div>
                  <button
                    type="button"
                    className="settings-save"
                    onClick={() =>
                      showToast(
                        "Store settings saved (session only).",
                        "success",
                      )
                    }
                  >
                    Save settings
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="settings-card">
                  <div className="settings-header">
                    <UsersIcon size={16} />
                    <h3>Manage users</h3>
                    <button
                      type="button"
                      className="settings-add-user"
                      onClick={openAddUserModal}
                    >
                      <Plus size={13} /> Add user
                    </button>
                  </div>

                  {usersLoading ? (
                    <div className="inv-loading">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="inv-empty">No users found.</div>
                  ) : (
                    <ul className="user-list">
                      {users.map((u) => (
                        <li className="user-item" key={u.user_id}>
                          <div className="user-item__info">
                            <div className="user-item__name">{u.name}</div>
                            <div className="user-item__meta">
                              @{u.username} · last login:{" "}
                              {formatDate(u.last_login)}
                            </div>
                          </div>

                          <div className="user-item__right">
                            <span className={`user-role user-role--${u.role}`}>
                              {u.role}
                            </span>

                            <button
                              type="button"
                              className="user-icon-btn"
                              onClick={() => openResetPasswordModal(u)}
                              title="Reset password"
                            >
                              <Key size={13} />
                            </button>

                            <button
                              type="button"
                              className={`user-icon-btn ${
                                u.is_active === 0
                                  ? "user-icon-btn--disabled"
                                  : ""
                              }`}
                              onClick={() => requestToggleActive(u)}
                              title={u.is_active === 1 ? "Disable" : "Enable"}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= ADD / EDIT PART MODAL ================= */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? "Edit Part" : "Add New Part"}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              {modalError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {modalError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Part Number *</label>
                  <input
                    type="text"
                    value={form.part_number}
                    onChange={(e) =>
                      setForm({ ...form, part_number: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={form.supplier}
                    onChange={(e) =>
                      setForm({ ...form, supplier: e.target.value })
                    }
                    placeholder="e.g. Bosch, Denso"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) =>
                      setForm({ ...form, cost_price: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Markup (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.markup_percent}
                    onChange={(e) =>
                      setForm({ ...form, markup_percent: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                {/* ✅ Replaced manual Selling Price input with a read-only calculated field */}
                <div className="form-group">
                  <label>Selling Price (₱) *</label>
                  <input
                    type="text"
                    value={money(
                      (parseFloat(form.cost_price) || 0) *
                        (1 + (parseFloat(form.markup_percent) || 0) / 100),
                    )}
                    readOnly
                    style={{
                      backgroundColor: "#f9fafb",
                      cursor: "not-allowed",
                      fontWeight: "bold",
                      color: "#0f6b5c",
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorder_level}
                    onChange={(e) =>
                      setForm({ ...form, reorder_level: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Initial Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    disabled={!!editingPart}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingPart
                      ? "Update Part"
                      : "Add Part"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RECEIVE SUPPLY MODAL ================= */}
      {showReceiveModal && receiveTarget && (
        <div
          className="modal-overlay"
          onClick={() => !receiveSaving && setShowReceiveModal(false)}
        >
          <div
            className="modal modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Receive Supply</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => !receiveSaving && setShowReceiveModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleReceiveSubmit}>
              <div className="reset-context">
                Receiving stock for <strong>{receiveTarget.name}</strong>.
                Updating the cost and markup here will calculate a new selling
                price.
              </div>

              {receiveError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {receiveError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    value={receiveForm.quantity}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        quantity: e.target.value,
                      })
                    }
                    placeholder="e.g. 50"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Supplier</label>
                  <input
                    type="text"
                    value={receiveForm.supplier}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        supplier: e.target.value,
                      })
                    }
                    placeholder="Update supplier"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Cost per Unit (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiveForm.cost_per_unit}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        cost_per_unit: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Markup (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={receiveForm.markup_percent}
                    onChange={(e) =>
                      setReceiveForm({
                        ...receiveForm,
                        markup_percent: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Manual Price Override (₱) - Optional</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={receiveForm.manual_price}
                  onChange={(e) =>
                    setReceiveForm({
                      ...receiveForm,
                      manual_price: e.target.value,
                    })
                  }
                  placeholder="Leave blank to use auto-markup"
                />
              </div>

              <div className="adj-preview">
                <span className="adj-preview__label">New Selling Price</span>
                <span className="adj-preview__value">
                  <strong>
                    {money(
                      receiveForm.manual_price
                        ? parseFloat(receiveForm.manual_price)
                        : (parseFloat(receiveForm.cost_per_unit) || 0) *
                            (1 +
                              (parseFloat(receiveForm.markup_percent) || 0) /
                                100),
                    )}
                  </strong>
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowReceiveModal(false)}
                  disabled={receiveSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={receiveSaving}
                >
                  {receiveSaving ? "Saving..." : "Receive Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD USER MODAL ================= */}
      {showUserModal && isAdmin && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeUserModal}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCreateUser}>
              {userModalError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {userModalError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Full name *</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) =>
                      setUserForm({ ...userForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        username: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        role: e.target.value as "admin" | "manager",
                      })
                    }
                    className="adj-select"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Password * (min 6 characters)</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeUserModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={userSaving}
                >
                  {userSaving ? "Creating..." : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RESET PASSWORD MODAL ================= */}
      {resetTarget && (
        <div className="modal-overlay" onClick={closeResetPasswordModal}>
          <div
            className="modal modal--small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Reset user password</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeResetPasswordModal}
              >
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleResetPasswordSubmit}>
              <div className="reset-context">
                You are resetting the password for{" "}
                <strong>{resetTarget.name}</strong> (@
                {resetTarget.username}). Please confirm this action with your
                own password.
              </div>

              {resetError && (
                <div className="modal-error">
                  <AlertTriangle size={14} />
                  {resetError}
                </div>
              )}

              <div className="form-group">
                <label>Your password *</label>
                <div className="pw-input-wrap">
                  <input
                    type={showResetAdminPw ? "text" : "password"}
                    value={resetAdminPassword}
                    onChange={(e) => setResetAdminPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="Enter your own password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pw-eye-btn"
                    onClick={() => setShowResetAdminPw((v) => !v)}
                    aria-label={
                      showResetAdminPw ? "Hide password" : "Show password"
                    }
                  >
                    {showResetAdminPw ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>New password * (min 6 characters)</label>
                <div className="pw-input-wrap">
                  <input
                    type={showResetNewPw ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pw-eye-btn"
                    onClick={() => setShowResetNewPw((v) => !v)}
                    aria-label={
                      showResetNewPw ? "Hide password" : "Show password"
                    }
                  >
                    {showResetNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm new password *</label>
                <div className="pw-input-wrap">
                  <input
                    type={showResetConfirmPw ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pw-eye-btn"
                    onClick={() => setShowResetConfirmPw((v) => !v)}
                    aria-label={
                      showResetConfirmPw ? "Hide password" : "Show password"
                    }
                  >
                    {showResetConfirmPw ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeResetPasswordModal}
                  disabled={resetSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resetSaving}
                >
                  {resetSaving ? "Resetting..." : "Reset password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE PART CONFIRM ================= */}
      {confirmTarget && (
        <ConfirmDialog
          title="Delete this part?"
          message={`"${confirmTarget.name}" (${confirmTarget.part_number}) will be permanently removed from the catalog. This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* ================= TOGGLE ACTIVE CONFIRM ================= */}
      {toggleTarget && (
        <ConfirmDialog
          title={
            toggleTarget.is_active === 1 ? "Disable user?" : "Enable user?"
          }
          message={
            toggleTarget.is_active === 1
              ? `"${toggleTarget.name}" (@${toggleTarget.username}) will no longer be able to log in.`
              : `"${toggleTarget.name}" (@${toggleTarget.username}) will be able to log in again.`
          }
          confirmLabel={toggleTarget.is_active === 1 ? "Disable" : "Enable"}
          cancelLabel="Cancel"
          variant={toggleTarget.is_active === 1 ? "danger" : "default"}
          loading={togglingActive}
          onConfirm={confirmToggleActive}
          onCancel={cancelToggleActive}
        />
      )}

      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
