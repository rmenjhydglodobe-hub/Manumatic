import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Download,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  getSalesOverview,
  getInventoryValuation,
  getTopMovers,
  getReorderPriority,
  getLowStockForecast,
  getCashierPerformance,
} from "../../services/api";
import "./Reports.css";

// ============================================================
// TYPES
// ============================================================

type Tab =
  | "sales"
  | "valuation"
  | "movers"
  | "reorder"
  | "forecast"
  | "cashier";

type Range = "today" | "week" | "month";

interface ToastState {
  message: string;
  type: ToastType;
}

const CATEGORY_COLORS = [
  "#0f6b5c", // teal
  "#1d4ed8", // blue
  "#7c3aed", // purple
  "#b45309", // orange
  "#dc2626", // red
  "#0891b2", // cyan
  "#65a30d", // green
  "#db2777", // pink
  "#4f46e5", // indigo
  "#059669", // emerald
];

// ============================================================
// COMPONENT
// ============================================================

export default function Reports() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<Range>("today");

  // ---- Data ----
  const [salesData, setSalesData] = useState<any>(null);
  const [valuationData, setValuationData] = useState<any>(null);
  const [moversData, setMoversData] = useState<any>(null);
  const [reorderData, setReorderData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [cashierData, setCashierData] = useState<any[]>([]);

  // ✅ State to track which day's bar was clicked
  const [selectedDay, setSelectedDay] = useState<any>(null);

  // ---- Load data on tab change ----
  useEffect(() => {
    loadTab();
    // Reset selected day when range changes
    setSelectedDay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, range]);

  const loadTab = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "sales":
          const r1 = await getSalesOverview(range);
          setSalesData(r1.data);
          break;
        case "valuation":
          const r2 = await getInventoryValuation();
          setValuationData(r2.data);
          break;
        case "movers":
          const r3 = await getTopMovers(5);
          setMoversData(r3.data);
          break;
        case "reorder":
          const r4 = await getReorderPriority();
          setReorderData(r4.data);
          break;
        case "forecast":
          const r5 = await getLowStockForecast();
          setForecastData(r5.data);
          break;
        case "cashier":
          const r6 = await getCashierPerformance();
          setCashierData(r6.data);
          break;
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      showToast("Failed to load report data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  // ---- Helpers ----
  const money = (n: number) =>
    "₱" +
    Number(n).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const shortMoney = (n: number) =>
    "₱" + Number(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });

  const shortDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
    });
  };

  // ---- CSV Export ----
  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows || rows.length === 0) {
      showToast("No data to export.", "error");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h];
            if (val === null || val === undefined) return "";
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${rows.length} rows as CSV.`, "success");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-main">
        <Header title="Reports" />

        <div className="rpt-content">
          {/* TABS */}
          <div className="rpt-tabs">
            {(
              [
                { id: "sales", label: "Sales Overview", Icon: TrendingUp },
                { id: "valuation", label: "Inventory Value", Icon: Package },
                { id: "movers", label: "Top Movers", Icon: Activity },
                {
                  id: "reorder",
                  label: "Reorder Priority",
                  Icon: AlertTriangle,
                },
                { id: "forecast", label: "Stock Forecast", Icon: Clock },
                { id: "cashier", label: "Cashier Stats", Icon: Users },
              ] as { id: Tab; label: string; Icon: any }[]
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`rpt-tab ${activeTab === id ? "is-active" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ============================================================
              TAB: SALES OVERVIEW
              ============================================================ */}
          {activeTab === "sales" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div className="rpt-range">
                  {(["today", "week", "month"] as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`rpt-range__btn ${
                        range === r ? "is-active" : ""
                      }`}
                      onClick={() => setRange(r)}
                    >
                      {r === "today"
                        ? "Today"
                        : r === "week"
                          ? "Last 7 Days"
                          : "Last 30 Days"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    salesData?.daily &&
                    exportCSV("sales-overview", salesData.daily)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !salesData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  <div className="rpt-kpis">
                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Revenue</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.total_revenue)}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Transactions</div>
                      <div className="rpt-kpi__value">
                        {salesData.transaction_count}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Unique Parts Sold</div>
                      <div className="rpt-kpi__value">
                        {salesData.unique_parts_sold}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--orange">
                        <Activity size={18} />
                      </div>
                      <div className="rpt-kpi__label">Avg Transaction</div>
                      <div className="rpt-kpi__value">
                        {money(salesData.avg_transaction)}
                      </div>
                    </div>
                  </div>

                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>Revenue Trend</h3>
                      <span className="rpt-card__hint">
                        {range === "today"
                          ? "Today"
                          : range === "week"
                            ? "Last 7 days"
                            : "Last 30 days"}
                      </span>
                    </div>

                    {salesData.daily && salesData.daily.length > 0 ? (
                      <div style={{ width: "100%", height: 320 }}>
                        <ResponsiveContainer>
                          <BarChart
                            data={salesData.daily}
                            margin={{
                              top: 10,
                              right: 10,
                              bottom: 0,
                              left: -10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f3f4f6"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="day"
                              tickFormatter={shortDate}
                              tick={{ fontSize: 11, fill: "#6b7280" }}
                              axisLine={{ stroke: "#e5e7eb" }}
                              tickLine={false}
                              dy={10}
                            />
                            <YAxis
                              tickFormatter={shortMoney}
                              tick={{ fontSize: 11, fill: "#6b7280" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                fontSize: 13,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                                padding: "10px 14px",
                              }}
                              formatter={(value) => [
                                money(Number(value)),
                                "Revenue",
                              ]}
                              labelFormatter={(value) =>
                                shortDate(String(value))
                              }
                              cursor={{ fill: "rgba(15, 107, 92, 0.08)" }}
                            />

                            {/* ✅ Bar Width and Outline Fixes applied here */}
                            <Bar
                              dataKey="revenue"
                              fill="#0f6b5c"
                              radius={[6, 6, 0, 0]}
                              barSize={40}
                              focusable={false}
                              minPointSize={4}
                              onClick={(data) => setSelectedDay(data)}
                              style={{ cursor: "pointer", outline: "none" }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rpt-empty">No sales in this period.</div>
                    )}
                  </div>

                  {/* ✅ UPDATED PANEL: Shows Total Range OR Specific Day depending on selection */}
                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>
                        <ShoppingCart size={16} style={{ color: "#0f6b5c" }} />
                        {selectedDay
                          ? `Parts Sold on ${shortDate(selectedDay.day)}`
                          : "All Parts Sold"}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span className="rpt-card__hint">
                          {selectedDay
                            ? `Revenue: ${money(selectedDay.revenue)}`
                            : range === "today"
                              ? "Sold today"
                              : range === "week"
                                ? "Sold in last 7 days"
                                : "Sold in last 30 days"}
                        </span>
                        {/* Reset button to go back to viewing the whole range */}
                        {selectedDay && (
                          <button
                            className="rpt-export"
                            style={{
                              padding: "4px 8px",
                              fontSize: "10px",
                              height: "auto",
                            }}
                            onClick={() => setSelectedDay(null)}
                          >
                            <X size={12} /> Clear filter
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Determine which data to show based on whether a day is selected */}
                    {(() => {
                      const displayData = selectedDay
                        ? selectedDay.parts_sold
                        : salesData.daily?.flatMap(
                            (d: any) => d.parts_sold || [],
                          ) || [];

                      // Aggregate the data if viewing the whole range (to sum up quantities across days)
                      const aggregatedData = selectedDay
                        ? displayData
                        : Object.values(
                            displayData.reduce((acc: any, item: any) => {
                              if (!acc[item.part_id]) {
                                acc[item.part_id] = { ...item };
                              } else {
                                acc[item.part_id].quantity_sold +=
                                  item.quantity_sold;
                                acc[item.part_id].revenue += item.revenue;
                              }
                              return acc;
                            }, {}),
                          );

                      if (!aggregatedData || aggregatedData.length === 0) {
                        return (
                          <div className="rpt-empty">
                            No parts sold in this period.
                          </div>
                        );
                      }

                      return (
                        <table className="rpt-table">
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th className="rpt-right rpt-col-num">
                                Qty Sold
                              </th>
                              <th className="rpt-right rpt-col-money">
                                Revenue
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {aggregatedData.map((p: any) => (
                              <tr key={p.part_id}>
                                <td>
                                  <div className="rpt-cell-name">{p.name}</div>
                                  <div className="rpt-cell-meta">
                                    {p.part_number}
                                  </div>
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  <strong>{p.quantity_sold}</strong>
                                </td>
                                <td className="rpt-right rpt-col-money">
                                  {money(p.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: INVENTORY VALUATION
              ============================================================ */}
          {activeTab === "valuation" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    valuationData?.by_category &&
                    exportCSV("inventory-valuation", valuationData.by_category)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !valuationData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <>
                  <div className="rpt-kpis">
                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--green">
                        <DollarSign size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Stock Value</div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.total_value)}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--blue">
                        <Package size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Parts</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_parts}
                      </div>
                    </div>

                    <div className="rpt-kpi">
                      <div className="rpt-kpi__icon rpt-kpi__icon--purple">
                        <BarChart3 size={18} />
                      </div>
                      <div className="rpt-kpi__label">Total Units</div>
                      <div className="rpt-kpi__value">
                        {valuationData.total_units}
                      </div>
                    </div>

                    <div className="rpt-kpi rpt-kpi--warn">
                      <div className="rpt-kpi__icon rpt-kpi__icon--red">
                        <AlertTriangle size={18} />
                      </div>
                      <div className="rpt-kpi__label">At Risk (Low Stock)</div>
                      <div className="rpt-kpi__value">
                        {money(valuationData.at_risk_value)}
                      </div>
                    </div>
                  </div>

                  <div className="rpt-row-2">
                    {/* ENHANCED PIE CHART */}
                    <div className="rpt-card">
                      <div className="rpt-card__head">
                        <h3>Value by Category</h3>
                        <span className="rpt-card__hint">
                          {valuationData.by_category.length} categories
                        </span>
                      </div>

                      {/* Legend grid ABOVE the chart for clarity */}
                      <div className="rpt-pie-legend">
                        {valuationData.by_category.map(
                          (c: any, idx: number) => {
                            const pct =
                              valuationData.total_value > 0
                                ? (c.value / valuationData.total_value) * 100
                                : 0;
                            return (
                              <div
                                className="rpt-pie-legend__item"
                                key={c.category}
                              >
                                <span
                                  className="rpt-pie-legend__dot"
                                  style={{
                                    background:
                                      CATEGORY_COLORS[
                                        idx % CATEGORY_COLORS.length
                                      ],
                                  }}
                                />
                                <span className="rpt-pie-legend__label">
                                  {c.category}
                                </span>
                                <span className="rpt-pie-legend__value">
                                  {pct.toFixed(1)}%
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>

                      {/* Pie with center label */}
                      <div className="rpt-pie-wrap">
                        <div style={{ width: "100%", height: 260 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={valuationData.by_category}
                                dataKey="value"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={105}
                                paddingAngle={3}
                                stroke="#ffffff"
                                strokeWidth={2}
                              >
                                {valuationData.by_category.map(
                                  (entry: any, idx: number) => (
                                    <Cell
                                      key={idx}
                                      fill={
                                        CATEGORY_COLORS[
                                          idx % CATEGORY_COLORS.length
                                        ]
                                      }
                                    />
                                  ),
                                )}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  fontSize: 12,
                                  borderRadius: 8,
                                  border: "1px solid #e5e7eb",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                }}
                                formatter={(value: any) => money(Number(value))}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Center label */}
                        <div className="rpt-pie-center">
                          <span className="rpt-pie-center__label">
                            Total Value
                          </span>
                          <span className="rpt-pie-center__value">
                            {shortMoney(valuationData.total_value)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* BREAKDOWN TABLE */}
                    <div className="rpt-card">
                      <div className="rpt-card__head">
                        <h3>Breakdown</h3>
                        <span className="rpt-card__hint">By category</span>
                      </div>
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th className="rpt-right rpt-col-num">Parts</th>
                            <th className="rpt-right rpt-col-num">Units</th>
                            <th className="rpt-right rpt-col-money">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {valuationData.by_category.map(
                            (c: any, idx: number) => (
                              <tr key={c.category}>
                                <td>
                                  <span
                                    className="rpt-cat-dot"
                                    style={{
                                      background:
                                        CATEGORY_COLORS[
                                          idx % CATEGORY_COLORS.length
                                        ],
                                    }}
                                  />
                                  {c.category}
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  {c.part_count}
                                </td>
                                <td className="rpt-right rpt-col-num">
                                  {c.units}
                                </td>
                                <td className="rpt-right rpt-col-money">
                                  {money(c.value)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: TOP MOVERS
              ============================================================ */}
          {activeTab === "movers" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() =>
                    moversData?.top && exportCSV("top-sellers", moversData.top)
                  }
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : !moversData ? (
                <div className="rpt-empty">No data.</div>
              ) : (
                <div className="rpt-row-2">
                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>
                        <ArrowUpRight size={16} style={{ color: "#0f6b5c" }} />
                        Best Sellers
                      </h3>
                      <span className="rpt-card__hint">By units sold</span>
                    </div>
                    {moversData.top.length === 0 ? (
                      <div className="rpt-empty">No sales yet.</div>
                    ) : (
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th className="rpt-col-rank">#</th>
                            <th>Part</th>
                            <th className="rpt-right rpt-col-num">Sold</th>
                            <th className="rpt-right rpt-col-money">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.top.map((p: any, idx: number) => (
                            <tr key={p.part_id}>
                              <td className="rpt-col-rank">
                                <span className="rpt-rank">{idx + 1}</span>
                              </td>
                              <td>
                                <div className="rpt-cell-name">{p.name}</div>
                                <div className="rpt-cell-meta">
                                  {p.part_number} · {p.category}
                                </div>
                              </td>
                              <td className="rpt-right rpt-col-num">
                                <strong>{p.units_sold}</strong>
                              </td>
                              <td className="rpt-right rpt-col-money">
                                {money(p.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="rpt-card">
                    <div className="rpt-card__head">
                      <h3>
                        <ArrowDownRight
                          size={16}
                          style={{ color: "#b45309" }}
                        />
                        Slow Movers
                      </h3>
                      <span className="rpt-card__hint">
                        Consider promotions
                      </span>
                    </div>
                    {moversData.slow.length === 0 ? (
                      <div className="rpt-empty">No data.</div>
                    ) : (
                      <table className="rpt-table">
                        <thead>
                          <tr>
                            <th>Part</th>
                            <th className="rpt-right rpt-col-num">In Stock</th>
                            <th className="rpt-right rpt-col-num">Sold</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moversData.slow.map((p: any) => (
                            <tr key={p.part_id}>
                              <td>
                                <div className="rpt-cell-name">{p.name}</div>
                                <div className="rpt-cell-meta">
                                  {p.part_number} · {p.category}
                                </div>
                              </td>
                              <td className="rpt-right rpt-col-num">
                                {p.current_stock}
                              </td>
                              <td className="rpt-right rpt-col-num">
                                <span
                                  className={
                                    p.units_sold === 0
                                      ? "rpt-tag rpt-tag--warn"
                                      : ""
                                  }
                                >
                                  {p.units_sold}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: REORDER PRIORITY
              ============================================================ */}
          {activeTab === "reorder" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div className="rpt-summary-text">
                  <AlertTriangle size={14} />
                  <span>
                    {reorderData.length} part(s) need reordering · Total restock
                    cost:{" "}
                    <strong>
                      {money(
                        reorderData.reduce((s, r) => s + r.restock_cost, 0),
                      )}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("reorder-priority", reorderData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : reorderData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ All parts are sufficiently stocked.
                </div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th className="rpt-col-urgency">Urgency</th>
                        <th>Part</th>
                        <th className="rpt-right rpt-col-num">In Stock</th>
                        <th className="rpt-right rpt-col-num">Min</th>
                        <th className="rpt-right rpt-col-num">Deficit</th>
                        <th className="rpt-right rpt-col-money">
                          Restock Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderData.map((r: any) => (
                        <tr key={r.part_id}>
                          <td className="rpt-col-urgency">
                            <span
                              className={`rpt-urgency rpt-urgency--${r.urgency}`}
                            >
                              {r.urgency}
                            </span>
                          </td>
                          <td>
                            <div className="rpt-cell-name">{r.name}</div>
                            <div className="rpt-cell-meta">
                              {r.part_number} · {r.category}
                            </div>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            <strong>{r.quantity}</strong>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {r.reorder_level}
                          </td>
                          <td className="rpt-right rpt-col-num">
                            <span className="rpt-tag rpt-tag--warn">
                              {r.deficit}
                            </span>
                          </td>
                          <td className="rpt-right rpt-col-money">
                            {money(r.restock_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: STOCK FORECAST
              ============================================================ */}
          {activeTab === "forecast" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div className="rpt-summary-text">
                  <Clock size={14} />
                  <span>
                    Based on 30-day sales velocity ·{" "}
                    <strong>{forecastData.length}</strong> part(s) may run out
                    soon
                  </span>
                </div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("stock-forecast", forecastData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : forecastData.length === 0 ? (
                <div className="rpt-empty rpt-empty--good">
                  ✅ No parts at immediate risk of stockout.
                </div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th className="rpt-col-urgency">Status</th>
                        <th>Part</th>
                        <th className="rpt-right rpt-col-num">In Stock</th>
                        <th className="rpt-right rpt-col-num">Daily Sales</th>
                        <th className="rpt-right rpt-col-days">
                          Days Until Stockout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((f: any) => (
                        <tr key={f.part_id}>
                          <td className="rpt-col-urgency">
                            <span
                              className={`rpt-urgency rpt-urgency--${f.stockout_status}`}
                            >
                              {f.stockout_status}
                            </span>
                          </td>
                          <td>
                            <div className="rpt-cell-name">{f.name}</div>
                            <div className="rpt-cell-meta">
                              {f.part_number} · {f.category}
                            </div>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {f.current_stock}
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {f.avg_daily_sales}/day
                          </td>
                          <td className="rpt-right rpt-col-days">
                            <strong>
                              {f.days_until_stockout !== null
                                ? `${f.days_until_stockout} day(s)`
                                : "—"}
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TAB: CASHIER PERFORMANCE
              ============================================================ */}
          {activeTab === "cashier" && (
            <div className="rpt-body">
              <div className="rpt-toolbar">
                <div></div>
                <button
                  type="button"
                  className="rpt-export"
                  onClick={() => exportCSV("cashier-performance", cashierData)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="rpt-loading">Loading...</div>
              ) : cashierData.length === 0 ? (
                <div className="rpt-empty">No users.</div>
              ) : (
                <div className="rpt-card">
                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>Cashier</th>
                        <th className="rpt-col-role">Role</th>
                        <th className="rpt-right rpt-col-num">Sales</th>
                        <th className="rpt-right rpt-col-money">
                          Total Revenue
                        </th>
                        <th className="rpt-right rpt-col-money">
                          Avg Transaction
                        </th>
                        <th className="rpt-right rpt-col-date">Last Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashierData.map((c: any) => (
                        <tr key={c.user_id}>
                          <td>
                            <div className="rpt-cell-name">{c.name}</div>
                          </td>
                          <td className="rpt-col-role">
                            <span
                              className={`rpt-tag rpt-tag--${
                                c.role === "admin" ? "admin" : "manager"
                              }`}
                            >
                              {c.role}
                            </span>
                          </td>
                          <td className="rpt-right rpt-col-num">
                            {c.total_sales}
                          </td>
                          <td className="rpt-right rpt-col-money">
                            <strong>{money(c.total_revenue)}</strong>
                          </td>
                          <td className="rpt-right rpt-col-money">
                            {money(c.avg_transaction)}
                          </td>
                          <td className="rpt-right rpt-col-date">
                            {c.last_sale ? shortDate(c.last_sale) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
