import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  IndianRupee, ShoppingBag, Package, AlertCircle, RefreshCw,
  Store, Power, Pencil, Wallet, CheckCircle2, Clock, ChevronRight,
  TrendingUp, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";

interface VendorOrder {
  _id: string;
  netAmount?: number;
  subtotal?: number;
  status: string;
  createdAt: string;
}

interface VendorProduct {
  _id: string;
  stock?: number;
  status?: string;
}

interface ApiShop {
  _id: string;
  shopName: string;
  ownerId: string;
  totalOrders: number;
  totalRevenue: number;
  isOpen: boolean;
  status: string;
}

interface Payout {
  _id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  ordersIncluded?: string[];
  notes?: string;
}

function buildSeries(orders: VendorOrder[], days: number): { date: string; revenue: number; orders: number }[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const label = days === 7
      ? d.toLocaleDateString("en-US", { weekday: "short" })
      : d.getDate().toString();
    const startMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const endMs = startMs + 86400000 - 1;
    const dayOrders = orders.filter(o => {
      const t = new Date(o.createdAt).getTime();
      return t >= startMs && t <= endMs;
    });
    const revenue = dayOrders.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
    return { date: label, revenue, orders: dayOrders.length };
  });
}

const PIPELINE = [
  { key: "placed",           label: "New",       color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-400/20" },
  { key: "confirmed",        label: "Confirmed", color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-400/20" },
  { key: "packed",           label: "Packed",    color: "text-indigo-500",  bg: "bg-indigo-500/10 border-indigo-400/20" },
  { key: "out_for_delivery", label: "Out",       color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-400/20" },
  { key: "delivered",        label: "Delivered", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-400/20" },
  { key: "cancelled",        label: "Cancelled", color: "text-red-500",     bg: "bg-red-500/10 border-red-400/20" },
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  borderRadius: "16px",
  border: "none",
  boxShadow: "8px 8px 24px hsl(var(--neu-shadow-dark)/.18), -8px -8px 24px hsl(var(--neu-shadow-light)/.9)",
};

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([]);
  const [payoutData, setPayoutData] = useState<{ payouts: Payout[]; totalEarned: number; pendingAmount: number }>({ payouts: [], totalEarned: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopIsOpen, setShopIsOpen] = useState<boolean | null>(null);
  const [shopStatus, setShopStatus] = useState<string>("");
  const [toggling, setToggling] = useState(false);
  const [shopNotFound, setShopNotFound] = useState(false);
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const fetchData = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setShopNotFound(false);
    try {
      const shopData = await api.get<{ success: boolean; shops: ApiShop[] }>(`/shops?ownerId=${user.id}`);
      const shop = shopData.shops[0];
      if (shop) {
        setShopId(shop._id);
        setShopIsOpen(shop.isOpen ?? false);
        setShopStatus(shop.status ?? "");
        const [ordersData, productsData, payoutsData] = await Promise.all([
          api.get<{ success: boolean; orders: VendorOrder[] }>(`/orders?shopId=${shop._id}&limit=200`),
          api.get<{ success: boolean; products: VendorProduct[] }>(`/products?shopId=${shop._id}&status=all&limit=500`),
          api.get<{ success: boolean; payouts: Payout[]; totalEarned: number; pendingAmount: number }>(`/payouts/my`),
        ]);
        setOrders(ordersData.orders);
        setVendorProducts(productsData.products);
        setPayoutData({ payouts: payoutsData.payouts ?? [], totalEarned: payoutsData.totalEarned ?? 0, pendingAmount: payoutsData.pendingAmount ?? 0 });
      } else {
        setShopNotFound(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      toast.error(msg.includes("buffering") ? "Database connecting — please retry." : msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [fetchData, authLoading]);

  const handleToggleOpen = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await api.patch<{ success: boolean; isOpen: boolean }>("/shops/my/toggle-open");
      setShopIsOpen(res.isOpen);
      toast.success(res.isOpen ? "Shop is now Open — customers can place orders." : "Shop is now Closed — orders are paused.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update shop status";
      toast.error(msg);
    } finally {
      setToggling(false);
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.createdAt) >= todayStart);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
  const activeOrders = orders.filter(o => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  const lowStockProducts = vendorProducts.filter(p => (p.stock ?? 0) < 20 && p.status === "active");
  const series = buildSeries(orders, chartDays);
  const periodRevenue = series.reduce((s, d) => s + d.revenue, 0);
  const periodOrderCount = series.reduce((s, d) => s + d.orders, 0);

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (shopNotFound) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-[60dvh] flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Store className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">No shop found.</h2>
          <p className="text-muted-foreground text-sm">You don't have a registered shop yet. Register one to start selling.</p>
        </div>
        <Button
          className="rounded-2xl h-14 px-8 text-lg font-bold shadow-none neu-card"
          onClick={() => setLocation("/vendor-register")}
        >
          Register a Shop
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionHeader title="Vendor Dashboard" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/vendor/shop-profile")} className="text-muted-foreground">
            <Pencil className="w-4 h-4 mr-1" /> Edit Shop
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Shop open/closed toggle */}
      {shopStatus === "approved" && shopIsOpen !== null && (
        <div className={`flex items-center justify-between p-4 rounded-2xl neu-card border-2 ${shopIsOpen ? "border-green-400/40 bg-green-500/5" : "border-red-400/30 bg-red-500/5"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${shopIsOpen ? "bg-green-500/15" : "bg-red-500/15"}`}>
              <Power className={`w-5 h-5 ${shopIsOpen ? "text-green-600" : "text-red-500"}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Shop Status</p>
              <p className={`font-bold text-sm ${shopIsOpen ? "text-green-600" : "text-red-500"}`}>
                {shopIsOpen ? "Open — Accepting Orders" : "Closed — Orders Paused"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleToggleOpen}
            disabled={toggling}
            className={`rounded-xl h-9 px-4 font-bold shadow-none ${shopIsOpen ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-300/40" : "bg-green-500/10 text-green-700 hover:bg-green-500/20 border border-green-300/40"}`}
            variant="ghost"
          >
            {toggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : shopIsOpen ? "Close Shop" : "Open Shop"}
          </Button>
        </div>
      )}

      {shopStatus === "pending" && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-amber-700 dark:text-amber-400">Shop pending approval</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Your shop is under review by SwiftMart. You can set up your profile and add products in the meantime — they'll go live once approved.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatINR(todayRevenue)}
          icon={IndianRupee}
          trend={todayOrders.length > 0 ? `${todayOrders.length} orders` : "No orders today"}
          trendUp={todayOrders.length > 0}
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          icon={ShoppingBag}
          trend={orders.length > 0 ? `${orders.length} total` : "No orders yet"}
          trendUp={activeOrders > 0}
        />
        <StatCard
          title="Total Products"
          value={vendorProducts.length}
          icon={Package}
          trend={lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : "All stocked"}
          trendUp={lowStockProducts.length === 0}
          className={lowStockProducts.length > 0 ? "border-destructive/50" : ""}
        />
        <StatCard
          title="Pending Payout"
          value={formatINR(payoutData.pendingAmount)}
          icon={Wallet}
          trend={payoutData.payouts.filter(p => p.status === "pending").length > 0
            ? `${payoutData.payouts.filter(p => p.status === "pending").length} pending`
            : "All settled"}
          trendUp={payoutData.pendingAmount === 0}
        />
      </div>

      {/* Revenue chart with 7d / 30d toggle */}
      <section className="bg-card p-6 rounded-3xl neu-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg">Revenue Overview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatINR(periodRevenue)} from {periodOrderCount} orders in {chartDays} days
            </p>
          </div>
          <div className="flex gap-2">
            {([7, 30] as const).map(d => (
              <Button
                key={d}
                size="sm"
                variant={chartDays === d ? "default" : "ghost"}
                onClick={() => setChartDays(d)}
                className={`h-8 px-4 rounded-xl text-xs font-bold ${chartDays === d ? "" : "text-muted-foreground"}`}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartDays === 7 ? (
              <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => v === 0 ? "₹0" : `₹${v / 1000}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [formatINR(value), "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            ) : (
              <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} dy={10} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => v === 0 ? "₹0" : `₹${v / 1000}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [formatINR(value), "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Order Pipeline + Payout History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Order Pipeline */}
        <section className="bg-card p-6 rounded-3xl neu-card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base">Order Pipeline</h3>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/vendor/orders")} className="text-primary text-xs font-bold h-7 px-3">
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="flex flex-col gap-2.5">
            {PIPELINE.map(({ key, label, color, bg }) => {
              const cnt = orders.filter(o => o.status === key).length;
              return (
                <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-2xl border neu-inset ${bg}`}>
                  <span className={`text-sm font-semibold ${color}`}>{label}</span>
                  <span className={`text-xl font-bold ${color}`}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Payout History */}
        <section className="bg-card p-6 rounded-3xl neu-card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">Payout History</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <span>Earned: <strong className="text-foreground">{formatINR(payoutData.totalEarned)}</strong></span>
            </div>
          </div>

          {payoutData.payouts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Wallet className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No payouts yet</p>
              <p className="text-xs text-muted-foreground/60">Payouts are created automatically when orders are placed.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {payoutData.payouts.slice(0, 5).map(p => (
                <div key={p._id} className="flex items-center justify-between p-3 rounded-2xl neu-inset bg-background">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${p.status === "paid" ? "bg-emerald-500/15" : p.status === "cancelled" ? "bg-destructive/10" : "bg-amber-500/15"}`}>
                      {p.status === "paid"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Clock className={`w-4 h-4 ${p.status === "cancelled" ? "text-destructive" : "text-amber-500"}`} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{formatINR(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {p.ordersIncluded?.length ? ` · ${p.ordersIncluded.length} order${p.ordersIncluded.length !== 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${p.status === "paid" ? "bg-emerald-500/12 text-emerald-500" : p.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-amber-500/12 text-amber-500"}`}>
                    {p.status === "paid" ? "Paid" : p.status === "cancelled" ? "Cancelled" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {payoutData.pendingAmount > 0 && (
            <div className="mt-auto flex items-center justify-between p-3.5 rounded-2xl bg-primary/8 border border-primary/25">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {formatINR(payoutData.pendingAmount)} pending
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-primary" />
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
