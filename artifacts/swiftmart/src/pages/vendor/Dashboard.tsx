import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useProducts } from "@/hooks/useProducts";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { IndianRupee, ShoppingBag, Package, AlertCircle, RefreshCw, Store, Power, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";

interface VendorOrder {
  _id: string;
  netAmount?: number;
  subtotal?: number;
  status: string;
  createdAt: string;
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

function buildSeries(orders: VendorOrder[]): { date: string; revenue: number; orders: number }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
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

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { products } = useProducts();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopIsOpen, setShopIsOpen] = useState<boolean | null>(null);
  const [shopStatus, setShopStatus] = useState<string>("");
  const [toggling, setToggling] = useState(false);
  const [shopNotFound, setShopNotFound] = useState(false);

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
        const ordersData = await api.get<{ success: boolean; orders: VendorOrder[] }>(`/orders?shopId=${shop._id}&limit=200`);
        setOrders(ordersData.orders);
      } else {
        setShopNotFound(true);
      }
    } catch {
      // silently fail — show zeros
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
  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(o.status)).length;
  const lowStockProducts = products.filter(p => p.stock < 20);
  const series = buildSeries(orders);

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-3xl" />
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
          <h2 className="text-xl font-bold mb-2">You do not have an active shop.</h2>
          <p className="text-muted-foreground text-sm">Your shop may have been removed or is no longer active. Register a new shop to start selling again.</p>
        </div>
        <Button
          className="rounded-2xl h-14 px-8 text-lg font-bold shadow-none neu-card"
          onClick={() => setLocation("/vendor-register")}
        >
          Register Again
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-5xl mx-auto space-y-8">
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
          value={products.length}
          icon={Package}
        />
        <StatCard
          title="Low Stock"
          value={lowStockProducts.length}
          icon={AlertCircle}
          trend={lowStockProducts.length > 0 ? "Needs attention" : "All stocked"}
          trendUp={lowStockProducts.length === 0}
          className={lowStockProducts.length > 0 ? "border-destructive/50" : ""}
        />
      </div>

      <section className="bg-card p-6 rounded-3xl neu-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg">Revenue Overview (Last 7 Days)</h3>
          {orders.length === 0 && (
            <span className="text-xs text-muted-foreground">No orders data yet</span>
          )}
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => value === 0 ? '₹0' : `₹${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '8px 8px 24px hsl(var(--neu-shadow-dark)/.18), -8px -8px 24px hsl(var(--neu-shadow-light)/.9)'
                }}
                formatter={(value: number) => [formatINR(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {orders.length > 0 && (
        <section className="bg-card p-6 rounded-3xl neu-card">
          <h3 className="font-bold text-lg mb-4">Order Status Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { key: 'placed', label: 'New', color: 'bg-blue-500/10 text-blue-600' },
              { key: 'accepted', label: 'Accepted', color: 'bg-amber-500/10 text-amber-600' },
              { key: 'preparing', label: 'Preparing', color: 'bg-orange-500/10 text-orange-600' },
              { key: 'packed', label: 'Packed', color: 'bg-indigo-500/10 text-indigo-600' },
              { key: 'out_for_delivery', label: 'Out', color: 'bg-purple-500/10 text-purple-600' },
              { key: 'delivered', label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-600' },
            ].map(({ key, label, color }) => {
              const count = orders.filter(o => o.status === key).length;
              return (
                <div key={key} className={`p-3 rounded-2xl neu-inset flex items-center justify-between ${color}`}>
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xl font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
