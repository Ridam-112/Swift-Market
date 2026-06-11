import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  IndianRupee, ShoppingBag, Package, Wallet, TrendingUp,
  Clock, CheckCircle2, Truck, ChevronRight, Store, Power,
  RefreshCw, ArrowUpRight, Pencil,
} from "lucide-react";

const BG = "#1c1f22";
const CARD = "#1e2327";
const PRIMARY = "hsl(35,90%,55%)";
const SHADOW = "8px 8px 24px rgba(0,0,0,.45), -6px -6px 18px rgba(255,255,255,.04)";
const INSET = "inset 4px 4px 10px rgba(0,0,0,.45), inset -4px -4px 10px rgba(255,255,255,.04)";

function neu(extra?: string) {
  return { background: CARD, boxShadow: SHADOW, borderRadius: 20, ...(extra ? {} : {}) };
}

const SERIES_7 = [
  { date: "Mon", revenue: 1820, orders: 4 },
  { date: "Tue", revenue: 3200, orders: 9 },
  { date: "Wed", revenue: 2540, orders: 6 },
  { date: "Thu", revenue: 4100, orders: 11 },
  { date: "Fri", revenue: 5830, orders: 14 },
  { date: "Sat", revenue: 7200, orders: 18 },
  { date: "Sun", revenue: 6450, orders: 16 },
];

const SERIES_30 = Array.from({ length: 30 }, (_, i) => ({
  date: `${i + 1}`,
  revenue: 1000 + Math.sin(i * 0.4) * 1500 + Math.random() * 2000,
  orders: 2 + Math.floor(Math.random() * 14),
}));

const PAYOUTS = [
  { id: "PAY001", amount: 5850.75, status: "paid", date: "Jun 10, 2026", orders: 3 },
  { id: "PAY002", amount: 3220.00, status: "pending", date: "Jun 11, 2026", orders: 2 },
  { id: "PAY003", amount: 8940.50, status: "paid", date: "Jun 08, 2026", orders: 5 },
  { id: "PAY004", amount: 1680.00, status: "pending", date: "Jun 11, 2026", orders: 1 },
];

const ORDER_PIPELINE = [
  { key: "placed", label: "New", count: 3, color: "#3b82f6", bg: "rgba(59,130,246,.12)" },
  { key: "confirmed", label: "Confirmed", count: 2, color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  { key: "packed", label: "Packed", count: 1, color: "#8b5cf6", bg: "rgba(139,92,246,.12)" },
  { key: "out_for_delivery", label: "Out", count: 2, color: "#ec4899", bg: "rgba(236,72,153,.12)" },
  { key: "delivered", label: "Delivered", count: 47, color: "#10b981", bg: "rgba(16,185,129,.12)" },
  { key: "cancelled", label: "Cancelled", count: 4, color: "#ef4444", bg: "rgba(239,68,68,.12)" },
];

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

function StatCard({ title, value, icon: Icon, trend, trendUp, accent }: {
  title: string; value: string | number; icon: React.ElementType;
  trend?: string; trendUp?: boolean; accent?: string;
}) {
  return (
    <div style={{ ...neu(), padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>{title}</span>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: BG, boxShadow: INSET, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={accent ?? PRIMARY} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: "#f5f5f5" }}>{value}</span>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trendUp ? "#10b981" : "#ef4444" }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

const TTStyle = {
  backgroundColor: CARD,
  borderRadius: 14,
  border: "none",
  boxShadow: SHADOW,
  color: "#f5f5f5",
  fontSize: 12,
};

export function VendorDashboard() {
  const [days, setDays] = useState<7 | 30>(7);
  const series = days === 7 ? SERIES_7 : SERIES_30;
  const totalRevenue = series.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = series.reduce((s, d) => s + d.orders, 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#f5f5f5", fontFamily: "system-ui, sans-serif", padding: "24px 28px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Vendor Dashboard</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Fresh Bazaar · Jun 11, 2026</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, background: "transparent", border: "1px solid #374151", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
              <Pencil size={13} /> Edit Shop
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12, background: "transparent", border: "1px solid #374151", color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Shop Open Banner */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 20, ...neu(), border: "1.5px solid rgba(16,185,129,.3)", background: "rgba(16,185,129,.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(16,185,129,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Power size={18} color="#10b981" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Shop Status</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#10b981", margin: "2px 0 0" }}>Open — Accepting Orders</p>
            </div>
          </div>
          <button style={{ padding: "8px 18px", borderRadius: 12, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Close Shop
          </button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard title="Today's Revenue" value="₹6,450" icon={IndianRupee} trend="16 orders" trendUp />
          <StatCard title="Active Orders" value="8" icon={ShoppingBag} trend="59 total" trendUp />
          <StatCard title="Total Products" value="24" icon={Package} />
          <StatCard title="Pending Payout" value="₹4,900" icon={Wallet} trend="2 pending" trendUp={false} accent="#f59e0b" />
        </div>

        {/* Revenue Chart */}
        <div style={{ ...neu(), padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Revenue Overview</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                {fmt(totalRevenue)} from {totalOrders} orders in {days} days
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {([7, 30] as const).map(d => (
                <button key={d} onClick={() => setDays(d)} style={{
                  padding: "6px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: days === d ? PRIMARY : "transparent",
                  color: days === d ? "#1e1e1e" : "#6b7280",
                  border: days === d ? "none" : "1px solid #374151",
                }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              {days === 7 ? (
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => v === 0 ? "₹0" : `₹${v / 1000}k`} />
                  <Tooltip contentStyle={TTStyle} formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke={PRIMARY} strokeWidth={2.5} fillOpacity={1} fill="url(#rev)" />
                </AreaChart>
              ) : (
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.06)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} dy={10} interval={4} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => v === 0 ? "₹0" : `₹${v / 1000}k`} />
                  <Tooltip contentStyle={TTStyle} formatter={(v: number) => [fmt(v), "Revenue"]} />
                  <Bar dataKey="revenue" fill={PRIMARY} radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Pipeline + Payouts side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Order Pipeline */}
          <div style={{ ...neu(), padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Order Pipeline</h3>
              <button style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: PRIMARY, background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ORDER_PIPELINE.map(({ key, label, count, color, bg }) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 14, background: bg, border: `1px solid ${color}22` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payout History */}
          <div style={{ ...neu(), padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Payout History</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
                <TrendingUp size={13} color={PRIMARY} />
                <span>Total earned: <strong style={{ color: "#f5f5f5" }}>₹19,691</strong></span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PAYOUTS.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 16, background: BG, boxShadow: INSET }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.status === "paid" ? "rgba(16,185,129,.15)" : "rgba(245,158,11,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p.status === "paid" ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} color="#f59e0b" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>₹{p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{p.date} · {p.orders} orders</p>
                    </div>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: p.status === "paid" ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.12)",
                    color: p.status === "paid" ? "#10b981" : "#f59e0b",
                  }}>
                    {p.status === "paid" ? "Paid" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 14, background: `${PRIMARY}14`, border: `1px solid ${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Wallet size={16} color={PRIMARY} />
                <span style={{ fontSize: 13, fontWeight: 600, color: PRIMARY }}>Next payout in 2 days</span>
              </div>
              <ArrowUpRight size={14} color={PRIMARY} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
