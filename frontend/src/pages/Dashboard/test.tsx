import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import {
  AlertTriangle,
  Receipt,
  Activity,
  ArrowRight,
  Plus,
  ShoppingCart,
  BarChart3,
  Package,
  TrendingUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  getDashboardStats,
  getDashboardTransactions,
  getActivityLogs,
  getTopSelling,
  getSalesTrend,
  getLowStockParts,
} from "../../services/api";
import "./Dashboard.css";

import DashboardImg1 from "../../assets/images/DashboardImg1.png";
import DashboardImg2 from "../../assets/images/DashboardImg2.png";

// ============================================================
// TYPES
// ============================================================

interface DashboardStats {
  todaySales: {
    total_sales: number;
    transaction_count: number;
  };
  totalTransactions: number;
  lowStockItems: number;
  partsInCatalog: number;
  unitsOnHand: number;
}

interface Transaction {
  sale_id: number;
  receipt_no: string;
  sale_date: string;
  total_price: number;
  part_name: string;
  user_name: string;
}

interface ActivityLog {
  time: string;
  text: string;
}

interface TopSelling {
  part_id: number;
  name: string;
  sold: number;
  revenue: number;
}

interface SalesTrendPoint {
  day: string;
  sales: number;
}

interface LowStockPart {
  part_id: number;
  part_number: string;
  name: string;
  quantity: number;
  reorder_level: number;
}

// ============================================================
// BANNER SLIDES
// ============================================================

const bannerSlides = [
  { src: DashboardImg1, alt: "Banner 1 — Car Service" },
  { src: DashboardImg2, alt: "Banner 2 — Motorcycle Repair" },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Data state ----
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [topSelling, setTopSelling] = useState<TopSelling[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [lowStock, setLowStock] = useState<LowStockPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Carousel state ----
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  // ---- Fetch all dashboard data on mount ----
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const [statsRes, txnRes, logsRes, topRes, trendRes, lowStockRes] =
        await Promise.all([
          getDashboardStats(),
          getDashboardTransactions(6),
          getActivityLogs(6),
          getTopSelling(5),
          getSalesTrend(),
          getLowStockParts(),
        ]);

      setStats(statsRes.data);
      setTransactions(txnRes.data);
      setLogs(logsRes.data);
      setTopSelling(topRes.data);
      setSalesTrend(trendRes.data);
      setLowStock(lowStockRes.data);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ---- Carousel auto-advance ----
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % bannerSlides.length);
    }, 4000);
    return () => clearInterval(id);
  }, [paused]);

  const prevSlide = () =>
    setSlide((s) => (s - 1 + bannerSlides.length) % bannerSlides.length);
  const nextSlide = () => setSlide((s) => (s + 1) % bannerSlides.length);

  // ---- Helpers ----
  const money = (n: number) =>
    "₱" +
    n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const shortMoney = (n: number) => "₱" + n.toLocaleString("en-PH");

  // ⚠️ FIXED: Format date in Asia/Manila timezone
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const quickActions = [
    {
      label: "New Sale",
      hint: "Process a walk-in checkout",
      icon: ShoppingCart,
      path: "/sales",
      accent: "#0f6b5c",
    },
    {
      label: "Add Part",
      hint: "Register a new part",
      icon: Plus,
      path: "/inventory",
      accent: "#1d4ed8",
    },
    {
      label: "View Reports",
      hint: "Sales & inventory analytics",
      icon: BarChart3,
      path: "/reports",
      accent: "#7c3aed",
    },
    {
      label: "Manage Stock",
      hint: "Adjust quantities & alerts",
      icon: Package,
      path: "/inventory",
      accent: "#b45309",
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <Header title="Dashboard" />
          <div className="dashboard-content">
            <div className="dash-loading">Loading dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Dashboard" />

        <div className="dashboard-content">
          {error && <div className="dash-error">{error}</div>}

          {/* WELCOME STRIP */}
          <div className="welcome-strip">
            <div className="welcome-strip__left">
              <h2 className="welcome-strip__title">
                Welcome back, {user?.name?.split(" ")[0] || "User"} 👋
              </h2>
              <p className="welcome-strip__sub">
                Here's what's happening in your store today.
              </p>
            </div>
            <div className="welcome-strip__right">
              <button
                type="button"
                className="welcome-strip__cta"
                onClick={() => navigate("/sales")}
              >
                <ShoppingCart size={15} />
                New Sale
              </button>
            </div>
          </div>

          {/* ROW 1: Analytics + Needs Reordering */}
          <div className="dash-row-top">
            <div className="dash-card dash-analytics">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Analytics</h2>
                <span className="dash-card__hint">Last 7 days</span>
              </div>

              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart
                    data={salesTrend}
                    margin={{ top: 8, right: 12, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#0f6b5c"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0f6b5c"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                      formatter={(value) =>
                        "₱" + Number(value).toLocaleString()
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#0f6b5c"
                      strokeWidth={2.5}
                      fill="url(#salesFill)"
                      dot={{ r: 3, fill: "#0f6b5c" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="analytics-list">
                <div className="analytics-item">
                  <div className="analytics-item__label">Today's sales</div>
                  <div className="analytics-item__value">
                    {money(stats?.todaySales.total_sales || 0)}
                  </div>
                  <div className="analytics-item__sub">
                    {stats?.todaySales.transaction_count || 0} transaction(s)
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">
                    Total transactions
                  </div>
                  <div className="analytics-item__value">
                    {stats?.totalTransactions || 0}
                  </div>
                  <div className="analytics-item__sub">
                    All-time recorded sales
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">Low stock items</div>
                  <div className="analytics-item__value">
                    {stats?.lowStockItems || 0}
                  </div>
                  <div className="analytics-item__sub">
                    At or below reorder level
                  </div>
                </div>

                <div className="analytics-item">
                  <div className="analytics-item__label">Parts in catalog</div>
                  <div className="analytics-item__value">
                    {stats?.partsInCatalog || 0}
                  </div>
                  <div className="analytics-item__sub">
                    {stats?.unitsOnHand || 0} units on hand
                  </div>
                </div>
              </div>
            </div>

            {/* Needs Reordering */}
            <div className="dash-card dash-reorder">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Needs reordering</h2>
                <span className="dash-badge-count">{lowStock.length}</span>
              </div>

              <div className="reorder-list">
                {lowStock.length === 0 ? (
                  <div className="reorder-empty">
                    All items are sufficiently stocked ✅
                  </div>
                ) : (
                  lowStock.slice(0, 3).map((item) => (
                    <div className="reorder-item" key={item.part_id}>
                      <div className="reorder-item__left">
                        <AlertTriangle
                          size={16}
                          className="reorder-item__icon"
                        />
                        <div className="reorder-item__info">
                          <div className="reorder-item__name">{item.name}</div>
                          <div className="reorder-item__code">
                            {item.part_number}
                          </div>
                        </div>
                      </div>
                      <div className="reorder-item__badge">
                        {item.quantity} left
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="reorder-footer">
                <button
                  type="button"
                  className="reorder-btn"
                  onClick={() => navigate("/inventory")}
                >
                  View Inventory
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* ROW 2: Recent Transactions + Activity Logs */}
          <div className="dash-row-bottom">
            <div className="dash-card dash-transactions">
              <div className="dash-card__subtitle-row">
                <Receipt size={14} />
                <span>Recent transactions</span>
              </div>

              <div className="txn-scroll">
                {transactions.length === 0 ? (
                  <div className="txn-empty">No transactions yet.</div>
                ) : (
                  <table className="txn-table">
                    <thead>
                      <tr>
                        <th>RECEIPT</th>
                        <th>PART</th>
                        <th>DATE</th>
                        <th className="txn-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.sale_id}>
                          <td>{txn.receipt_no}</td>
                          <td>{txn.part_name}</td>
                          <td>{formatDate(txn.sale_date)}</td>
                          <td className="txn-right">
                            {money(txn.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="dash-card dash-logs">
              <div className="dash-card__subtitle-row dash-card__subtitle-row--light">
                <Activity size={14} />
                <span>Activity Logs</span>
              </div>

              <div className="logs-scroll">
                {logs.length === 0 ? (
                  <div className="logs-empty">No recent activity.</div>
                ) : (
                  <ul className="logs-list">
                    {logs.map((log, i) => (
                      <li className="log-item" key={i}>
                        <span className="log-item__time">{log.time}</span>
                        <span className="log-item__text">{log.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: Quick Actions (with carousel) + Top Selling */}
          <div className="dash-row-third">
            <div className="dash-card dash-quick">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Quick Actions</h2>
                <span className="dash-card__hint">Shortcuts</span>
              </div>

              <div className="quick-grid">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      className="quick-card"
                      onClick={() => navigate(action.path)}
                    >
                      <span
                        className="quick-card__icon"
                        style={{
                          background: `${action.accent}1a`,
                          color: action.accent,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="quick-card__body">
                        <span className="quick-card__label">
                          {action.label}
                        </span>
                        <span className="quick-card__hint">{action.hint}</span>
                      </span>
                      <ArrowUpRight size={14} className="quick-card__arrow" />
                    </button>
                  );
                })}
              </div>

              <div
                className="banner-carousel"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div
                  className="banner-carousel__track"
                  style={{ transform: `translateX(-${slide * 100}%)` }}
                >
                  {bannerSlides.map((b, i) => (
                    <div className="banner-carousel__slide" key={i}>
                      <img
                        src={b.src}
                        alt={b.alt}
                        className="banner-carousel__img"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="banner-carousel__nav banner-carousel__nav--prev"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="banner-carousel__nav banner-carousel__nav--next"
                  onClick={nextSlide}
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="banner-carousel__dots">
                  {bannerSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`banner-carousel__dot ${
                        slide === i ? "is-active" : ""
                      }`}
                      onClick={() => setSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="dash-card dash-top">
              <div className="dash-card__head">
                <h2 className="dash-card__title">Top Selling Parts</h2>
                <span className="dash-card__hint">This week</span>
              </div>

              {topSelling.length === 0 ? (
                <div className="top-empty">No sales data yet.</div>
              ) : (
                <ul className="top-list">
                  {topSelling.map((part, idx) => (
                    <li className="top-item" key={part.part_id}>
                      <span className="top-item__rank">{idx + 1}</span>
                      <span className="top-item__info">
                        <span className="top-item__name">{part.name}</span>
                        <span className="top-item__sold">
                          <TrendingUp size={11} /> {part.sold} sold
                        </span>
                      </span>
                      <span className="top-item__revenue">
                        {shortMoney(part.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
