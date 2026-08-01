import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Users,
  Bike,
  CreditCard,
  Tag,
  Bell,
  HelpCircle,
  TrendingUp,
  FileText,
  DollarSign,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Activity,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

type ManagerTab =
  | "overview"
  | "finances"
  | "orders"
  | "shops"
  | "customers"
  | "riders"
  | "payouts"
  | "coupons"
  | "support"
  | "notifications"
  | "inventory";

interface City {
  id: string;
  name: string;
  isActive: boolean;
}

export default function ManagerPanel() {
  const { user, userRole } = useAuth();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");
  const [citiesList, setCitiesList] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Unified Loading & State
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [finances, setFinances] = useState<any>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [shopsList, setShopsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [ridersList, setRidersList] = useState<any[]>([]);
  const [payoutsList, setPayoutsList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Form states
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponVal, setCouponVal] = useState("");
  const [couponMin, setCouponMin] = useState("");
  const [couponType, setCouponType] = useState("percentage");
  const [couponExpiry, setCouponExpiry] = useState("");

  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");

  // Submissions
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && userRole !== "city_manager" && userRole !== "super_admin") {
      toast.error("Unauthorized access");
      setLocation("/profile");
    }
  }, [user, userRole, setLocation]);

  // Load Cities List
  useEffect(() => {
    setCitiesLoading(true);
    api.get<{ success: boolean; cities: City[] }>("/manager/cities")
      .then(res => {
        setCitiesList(res.cities || []);
        if (res.cities && res.cities.length > 0) {
          setSelectedCityId(res.cities[0].id);
        }
      })
      .catch(() => toast.error("Failed to load cities"))
      .finally(() => setCitiesLoading(false));
  }, []);

  // Fetch tab-specific data
  const fetchData = useCallback(async () => {
    if (!selectedCityId) return;
    setDataLoading(true);
    try {
      if (activeTab === "overview") {
        const [statsRes, analyticsRes] = await Promise.all([
          api.get<{ success: boolean; stats: any }>(`/manager/stats?cityId=${selectedCityId}`),
          api.get<{ success: boolean; analytics: any }>(`/manager/analytics?cityId=${selectedCityId}`)
        ]);
        setStats(statsRes.stats);
        setAnalytics(analyticsRes.analytics);
      } else if (activeTab === "finances") {
        const res = await api.get<{ success: boolean; finances: any }>(`/manager/finances?cityId=${selectedCityId}`);
        setFinances(res.finances);
      } else if (activeTab === "orders") {
        const res = await api.get<{ success: boolean; orders: any[] }>(`/manager/orders?cityId=${selectedCityId}`);
        setOrdersList(res.orders || []);
      } else if (activeTab === "shops") {
        const res = await api.get<{ success: boolean; shops: any[] }>(`/manager/shops?cityId=${selectedCityId}`);
        setShopsList(res.shops || []);
      } else if (activeTab === "customers") {
        const res = await api.get<{ success: boolean; customers: any[] }>(`/manager/customers?cityId=${selectedCityId}`);
        setCustomersList(res.customers || []);
      } else if (activeTab === "riders") {
        const res = await api.get<{ success: boolean; partners: any[] }>(`/manager/delivery?cityId=${selectedCityId}`);
        setRidersList(res.partners || []);
      } else if (activeTab === "payouts") {
        const res = await api.get<{ success: boolean; payouts: any[] }>(`/manager/payouts?cityId=${selectedCityId}`);
        setPayoutsList(res.payouts || []);
      } else if (activeTab === "coupons") {
        const res = await api.get<{ success: boolean; coupons: any[] }>(`/manager/coupons?cityId=${selectedCityId}`);
        setCouponsList(res.coupons || []);
      } else if (activeTab === "support") {
        const res = await api.get<{ success: boolean; tickets: any[] }>(`/manager/support?cityId=${selectedCityId}`);
        setTicketsList(res.tickets || []);
      } else if (activeTab === "inventory") {
        // reuse standard products, filtered locally
        const res = await api.get<{ success: boolean; products: any[] }>(`/products?limit=1000`);
        const activeShops = await api.get<{ success: boolean; shops: any[] }>(`/manager/shops?cityId=${selectedCityId}`);
        const shopIds = new Set(activeShops.shops.map(s => s._id || s.id));
        setProductsInventory(res.products.filter(p => shopIds.has(p.shopId)));
      }
    } catch {
      toast.error("Failed to load tab data");
    } finally {
      setDataLoading(false);
    }
  }, [activeTab, selectedCityId]);

  const [productsInventory, setProductsInventory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/manager/orders/${orderId}/status`, { status });
      toast.success("Order status updated");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Update shop status
  const handleUpdateShopStatus = async (shopId: string, status: string) => {
    try {
      await api.patch(`/manager/shops/${shopId}/status`, { status });
      toast.success(`Shop set to ${status}`);
      fetchData();
    } catch {
      toast.error("Failed to update shop status");
    }
  };

  // Update customer status (block/unblock)
  const handleUpdateCustomerStatus = async (customerId: string, status: string) => {
    try {
      await api.patch(`/manager/customers/${customerId}/status`, { status });
      toast.success(`Customer set to ${status}`);
      fetchData();
    } catch {
      toast.error("Failed to update customer status");
    }
  };

  // Update rider status
  const handleUpdateRiderStatus = async (riderId: string, status: string) => {
    try {
      await api.patch(`/manager/delivery/${riderId}/status`, { status });
      toast.success(`Rider status set to ${status}`);
      fetchData();
    } catch {
      toast.error("Failed to update rider status");
    }
  };

  // Settle payout
  const handleSettlePayout = async (payoutId: string) => {
    try {
      await api.post(`/manager/payouts/settle?cityId=${selectedCityId}`, { payoutId });
      toast.success("Payout completed successfully");
      fetchData();
    } catch {
      toast.error("Failed to settle payout");
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponVal || !couponExpiry) {
      toast.error("All coupon fields are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/manager/coupons?cityId=${selectedCityId}`, {
        code: couponCode,
        type: couponType,
        value: parseFloat(couponVal),
        minimumOrder: parseFloat(couponMin || "0"),
        expiryDate: couponExpiry
      });
      toast.success("Hyperlocal coupon created");
      setShowCouponForm(false);
      setCouponCode("");
      setCouponVal("");
      setCouponMin("");
      setCouponExpiry("");
      fetchData();
    } catch {
      toast.error("Failed to create coupon");
    } finally {
      setSubmitting(false);
    }
  };

  // Broadcast notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMsg) {
      toast.error("Title and message are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; sentCount: number }>(`/manager/notifications?cityId=${selectedCityId}`, {
        title: notifTitle,
        message: notifMsg
      });
      toast.success(`Push notification broadcasted to ${res.sentCount} customers`);
      setShowNotificationForm(false);
      setNotifTitle("");
      setNotifMsg("");
    } catch {
      toast.error("Failed to broadcast notifications");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCityName = useMemo(() => {
    return citiesList.find(c => c.id === selectedCityId)?.name || "Hyperlocal Panel";
  }, [citiesList, selectedCityId]);

  if (citiesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/40 flex flex-col gap-3">
          <Link href="/profile" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight leading-none text-foreground">Manager Panel</h2>
              <span className="text-[10px] text-muted-foreground capitalize mt-0.5 block">{userRole}</span>
            </div>
          </div>
          
          {/* City Switcher */}
          {citiesList.length > 1 ? (
            <div className="relative mt-2">
              <select
                value={selectedCityId}
                onChange={e => setSelectedCityId(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-xl bg-background border border-border/40 text-xs text-foreground focus:outline-none focus:ring-0 shadow-sm appearance-none cursor-pointer"
              >
                {citiesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          ) : (
            <div className="text-xs font-semibold bg-primary/5 text-primary rounded-lg py-1.5 px-3 mt-1 text-center capitalize">
              📍 {activeCityName}
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {(
            [
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "finances", label: "Finances", icon: DollarSign },
              { id: "orders", label: "Orders", icon: ShoppingBag },
              { id: "shops", label: "Shops", icon: Store },
              { id: "customers", label: "Customers", icon: Users },
              { id: "riders", label: "Delivery Partners", icon: Bike },
              { id: "payouts", label: "Payouts", icon: CreditCard },
              { id: "coupons", label: "Coupons", icon: Tag },
              { id: "support", label: "Support Tickets", icon: HelpCircle },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "inventory", label: "Inventory Alerts", icon: AlertTriangle }
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md neu-card"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-card">
          <h1 className="text-lg font-black capitalize text-foreground flex items-center gap-2">
            <span>Hyperlocal Area:</span>
            <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{activeCityName}</span>
          </h1>
          <Button onClick={fetchData} size="sm" variant="outline" className="rounded-xl bg-background border-none neu-inset">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${dataLoading ? 'animate-spin' : ''}`} /> Sync Data
          </Button>
        </header>

        <div className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {dataLoading && !stats && !finances && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-28 bg-card border border-border/30 rounded-3xl animate-pulse" />
                    ))}
                  </div>
                  <div className="h-[350px] bg-card border border-border/30 rounded-3xl animate-pulse" />
                </div>
              )}

              {!dataLoading && (
                <>
                  {/* OVERVIEW TAB */}
                  {activeTab === "overview" && stats && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-32">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Today's Revenue</span>
                          <span className="text-2xl font-black text-foreground">₹{stats.todayRevenue}</span>
                          <span className="text-[10px] text-green-500 font-bold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> +12% from yesterday</span>
                        </div>
                        <div className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-32">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Today's Orders</span>
                          <span className="text-2xl font-black text-foreground">{stats.todayOrders}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">Updated just now</span>
                        </div>
                        <div className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-32">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pending Orders</span>
                          <span className="text-2xl font-black text-amber-500">{stats.pendingOrders}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">Needs fulfillment</span>
                        </div>
                        <div className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-32">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Completed Orders</span>
                          <span className="text-2xl font-black text-emerald-500">{stats.completedOrders}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">Delivered successfully</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Area Chart */}
                        <div className="lg:col-span-2 bg-card p-6 rounded-3xl border border-border/40 neu-card">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Revenue Trend</h3>
                          <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={analytics?.chartData || []}>
                                <defs>
                                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card flex flex-col justify-between">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Operational Status</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/20">
                              <span className="text-xs text-muted-foreground font-semibold">Active Local Shops</span>
                              <Badge className="bg-blue-500/10 text-blue-500 border-none">{stats.activeShops}</Badge>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/20">
                              <span className="text-xs text-muted-foreground font-semibold">On-Duty Riders</span>
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none">{stats.activeDelivery}</Badge>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/20">
                              <span className="text-xs text-muted-foreground font-semibold">Registered Customers</span>
                              <Badge className="bg-purple-500/10 text-purple-500 border-none">{stats.totalCustomers}</Badge>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-xs text-muted-foreground font-semibold">Avg. Delivery Duration</span>
                              <span className="text-xs font-bold text-foreground">{stats.avgDeliveryTime}</span>
                            </div>
                          </div>
                          <div className="pt-4 mt-auto">
                            <Button onClick={() => setActiveTab("orders")} className="w-full rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold">
                              Manage Active Orders
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FINANCES TAB */}
                  {activeTab === "finances" && finances && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Total Sales Gross</span>
                          <span className="text-3xl font-black text-foreground">₹{finances.totalSales.toFixed(2)}</span>
                          <p className="text-[10px] text-muted-foreground mt-2">Sum total of all successfully completed orders in {activeCityName}.</p>
                        </div>
                        <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Platform Commission</span>
                          <span className="text-3xl font-black text-amber-500">₹{finances.platformCommission.toFixed(2)}</span>
                          <p className="text-[10px] text-muted-foreground mt-2">Deducted directly from vendor sales payouts.</p>
                        </div>
                        <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Net Platform Revenue</span>
                          <span className="text-3xl font-black text-emerald-500">₹{finances.netRevenue.toFixed(2)}</span>
                          <p className="text-[10px] text-muted-foreground mt-2">Estimated earnings (Commissions + 20% Delivery charges profit-share).</p>
                        </div>
                      </div>

                      <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-extrabold text-lg text-foreground">Financial Ledger Statement</h3>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 shadow-inner border-none bg-background text-foreground"><Download className="w-3.5 h-3.5" /> PDF</Button>
                            <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1 shadow-inner border-none bg-background text-foreground"><Download className="w-3.5 h-3.5" /> Excel</Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-border/20">
                            <span className="text-sm text-muted-foreground font-semibold">Total Delivery Charges Collected</span>
                            <span className="text-sm font-bold text-foreground">₹{finances.deliveryCharges.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-border/20">
                            <span className="text-sm text-muted-foreground font-semibold">Vendor (Merchant) Payouts Generated</span>
                            <span className="text-sm font-bold text-foreground">₹{finances.vendorEarnings.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center py-3 border-b border-border/20">
                            <span className="text-sm text-muted-foreground font-semibold">Rider Earnings Shared</span>
                            <span className="text-sm font-bold text-foreground">₹{finances.riderEarnings.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center py-3">
                            <span className="text-sm text-muted-foreground font-semibold">Coupon Discounts Sponsored</span>
                            <span className="text-sm font-bold text-red-500">-₹{finances.refundAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORDERS TAB */}
                  {activeTab === "orders" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-extrabold text-lg text-foreground">Active Hyperlocal Orders</h3>
                      </div>
                      {ordersList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No orders found for {activeCityName}.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ordersList.map(o => (
                            <div key={o.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-foreground">Order #{o.id.slice(-6).toUpperCase()}</span>
                                  <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold">{o.status}</Badge>
                                  <Badge className="bg-muted text-muted-foreground border-none text-[10px] font-bold">{o.paymentMethod}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Customer: <span className="font-semibold text-foreground">{o.customerName} ({o.customerPhone})</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Shop: <span className="font-semibold text-foreground">{o.vendorName}</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-lg">
                                  Items: <span className="text-foreground">{o.items.map((it: any) => `${it.name} x${it.qty}`).join(", ")}</span>
                                </div>
                              </div>

                              <div className="flex flex-col md:items-end justify-between shrink-0">
                                <span className="text-lg font-black text-foreground">₹{o.total}</span>
                                <div className="flex gap-1.5 mt-2 md:mt-0">
                                  {o.status === "placed" && (
                                    <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, "confirmed")} className="rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                                      Confirm Order
                                    </Button>
                                  )}
                                  {o.status === "confirmed" && (
                                    <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, "packed")} className="rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                                      Pack Order
                                    </Button>
                                  )}
                                  {o.status === "packed" && (
                                    <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, "out_for_delivery")} className="rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700">
                                      Ship Order
                                    </Button>
                                  )}
                                  {o.status === "out_for_delivery" && (
                                    <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, "delivered")} className="rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">
                                      Mark Delivered
                                    </Button>
                                  )}
                                  {!["delivered", "cancelled"].includes(o.status) && (
                                    <Button size="sm" variant="ghost" onClick={() => handleUpdateOrderStatus(o.id, "cancelled")} className="rounded-xl text-red-500 hover:bg-red-500/10">
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SHOPS TAB */}
                  {activeTab === "shops" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-extrabold text-lg text-foreground">Local Shops Registry</h3>
                      </div>
                      {shopsList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No shops registered in {activeCityName}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {shopsList.map(s => (
                            <div key={s.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex gap-4 h-36 relative overflow-hidden group">
                              <img src={s.image || "/assets/cat-grocery.png"} alt={s.storeName} className="w-16 h-16 rounded-2xl object-cover bg-muted shrink-0" />
                              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                                <div>
                                  <h4 className="font-extrabold text-base truncate text-foreground leading-snug">{s.storeName}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 capitalize leading-none">{s.category}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">Owner: {s.ownerName} ({s.phone})</p>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                  <Badge className={`border-none font-bold text-[10px] capitalize ${
                                    s.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                    s.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                  }`}>{s.status}</Badge>

                                  <div className="flex gap-1.5">
                                    {s.status === "pending" && (
                                      <Button size="sm" onClick={() => handleUpdateShopStatus(s.id, "approved")} className="rounded-xl h-8 text-[11px] bg-primary text-primary-foreground font-bold">
                                        Approve
                                      </Button>
                                    )}
                                    {s.status === "approved" ? (
                                      <Button size="sm" variant="ghost" onClick={() => handleUpdateShopStatus(s.id, "rejected")} className="rounded-xl h-8 text-[11px] text-red-500 hover:bg-red-500/10">
                                        Suspend
                                      </Button>
                                    ) : (
                                      s.status !== "pending" && (
                                        <Button size="sm" onClick={() => handleUpdateShopStatus(s.id, "approved")} className="rounded-xl h-8 text-[11px] bg-primary text-primary-foreground font-bold">
                                          Reactivate
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CUSTOMERS TAB */}
                  {activeTab === "customers" && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground">Hyperlocal Customers</h3>
                      {customersList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No customer users found in {activeCityName}.
                        </div>
                      ) : (
                        <div className="bg-card rounded-3xl border border-border/40 neu-card overflow-hidden">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="bg-muted/40 border-b border-border/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              <tr>
                                <th className="p-4">Customer Name</th>
                                <th className="p-4">Phone Number</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {customersList.map(c => (
                                <tr key={c.id}>
                                  <td className="p-4 font-bold text-foreground">{c.name || "Unnamed"}</td>
                                  <td className="p-4 text-muted-foreground">{c.phone}</td>
                                  <td className="p-4">
                                    <Badge className={`border-none ${c.status === "active" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>{c.status}</Badge>
                                  </td>
                                  <td className="p-4 text-right">
                                    {c.status === "active" ? (
                                      <Button size="sm" variant="ghost" onClick={() => handleUpdateCustomerStatus(c.id, "suspended")} className="rounded-xl text-red-500 hover:bg-red-500/10">Block</Button>
                                    ) : (
                                      <Button size="sm" onClick={() => handleUpdateCustomerStatus(c.id, "active")} className="rounded-xl bg-primary text-primary-foreground font-bold">Unblock</Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RIDERS TAB */}
                  {activeTab === "riders" && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground">Delivery Partners</h3>
                      {ridersList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No delivery partners registered in {activeCityName}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ridersList.map(r => (
                            <div key={r.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-36">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-sm text-foreground">{r.name}</h4>
                                  <p className="text-xs text-muted-foreground">{r.phone}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">Vehicle: <span className="capitalize text-foreground font-bold">{r.vehicle || "Bicycle"}</span></p>
                                </div>
                                <Badge className={`border-none font-bold text-[10px] capitalize ${r.status === "active" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>{r.status}</Badge>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="text-xs font-bold text-muted-foreground">Earnings: <span className="text-foreground">₹{r.totalEarnings}</span></span>
                                <div className="flex gap-1">
                                  {r.status === "active" ? (
                                    <Button size="sm" variant="ghost" onClick={() => handleUpdateRiderStatus(r.id, "suspended")} className="rounded-xl text-red-500 hover:bg-red-500/10">Suspend</Button>
                                  ) : (
                                    <Button size="sm" onClick={() => handleUpdateRiderStatus(r.id, "active")} className="rounded-xl bg-primary text-primary-foreground font-bold">Activate</Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAYOUTS TAB */}
                  {activeTab === "payouts" && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground">Earnings Settlements</h3>
                      {payoutsList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No pending payouts for {activeCityName}.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {payoutsList.map(p => (
                            <div key={p.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex justify-between items-center">
                              <div>
                                <h4 className="font-extrabold text-sm text-foreground">Shop: {p.vendorName}</h4>
                                <span className="text-xs text-muted-foreground block mt-1">Total orders included: <span className="font-semibold text-foreground">{p.ordersIncluded?.length || 0}</span></span>
                              </div>
                              <div className="text-right flex items-center gap-4">
                                <div>
                                  <span className="text-lg font-black text-foreground block">₹{p.amount}</span>
                                  <Badge className={`border-none mt-1 font-bold text-[9px] uppercase ${p.status === "completed" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>{p.status}</Badge>
                                </div>
                                {p.status === "pending" && (
                                  <Button size="sm" onClick={() => handleSettlePayout(p.id)} className="rounded-xl bg-primary text-primary-foreground font-bold">
                                    Settle Earnings
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* COUPONS TAB */}
                  {activeTab === "coupons" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-lg text-foreground">Hyperlocal City Coupons</h3>
                        <Button onClick={() => setShowCouponForm(!showCouponForm)} className="rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 flex items-center gap-1.5">
                          <Plus className="w-4 h-4" /> Add Coupon
                        </Button>
                      </div>

                      <AnimatePresence>
                        {showCouponForm && (
                          <motion.form
                            onSubmit={handleCreateCoupon}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-card border border-border/40 p-5 rounded-3xl space-y-4 max-w-xl"
                          >
                            <h4 className="font-extrabold text-sm text-foreground">Create City Coupon</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <Input placeholder="Coupon code (e.g. FIRST50)" value={couponCode} onChange={e => setCouponCode(e.target.value)} required />
                              <select value={couponType} onChange={e => setCouponType(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-background border border-border/40 text-sm">
                                <option value="percentage">Percentage Discount (%)</option>
                                <option value="flat">Flat Discount (₹)</option>
                              </select>
                              <Input type="number" placeholder="Discount Value" value={couponVal} onChange={e => setCouponVal(e.target.value)} required />
                              <Input type="number" placeholder="Min Order (₹)" value={couponMin} onChange={e => setCouponMin(e.target.value)} />
                              <Input type="date" placeholder="Expiry Date" value={couponExpiry} onChange={e => setCouponExpiry(e.target.value)} className="col-span-2" required />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setShowCouponForm(false)}>Cancel</Button>
                              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-bold">
                                {submitting ? "Adding..." : "Save Coupon"}
                              </Button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {couponsList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No coupons created for {activeCityName}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {couponsList.map(c => (
                            <div key={c.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col justify-between h-36">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-base font-black text-foreground tracking-wide">{c.code}</span>
                                  <span className="text-xs text-muted-foreground block mt-1">Discount: <span className="font-bold text-foreground">{c.type === "percentage" ? `${c.value}%` : `₹${c.value}`}</span></span>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] uppercase font-bold">Active</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-auto">Min Order: ₹{c.minimumOrder} · Exp: {new Date(c.expiryDate).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUPPORT TICKETS TAB */}
                  {activeTab === "support" && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground">Support Tickets</h3>
                      {ticketsList.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No support tickets found for {activeCityName}.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ticketsList.map(t => (
                            <div key={t.id} className="bg-card p-5 rounded-3xl border border-border/40 neu-card flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-sm text-foreground">{t.subject}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">Category: {t.category} · Customer: {t.userName} ({t.userPhone})</p>
                                </div>
                                <Badge className={`border-none font-bold text-[9px] uppercase ${t.status === "resolved" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>{t.status}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/20 mt-1 italic">"{t.message}"</p>
                              {t.status === "open" && (
                                <div className="flex gap-2 justify-end mt-2">
                                  <Button size="sm" onClick={() => handleUpdateOrderStatus(t.id, "resolved")} className="rounded-xl bg-primary text-primary-foreground font-bold">
                                    Mark Resolved
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NOTIFICATIONS TAB */}
                  {activeTab === "notifications" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-lg text-foreground">Hyperlocal Notifications</h3>
                        <Button onClick={() => setShowNotificationForm(!showNotificationForm)} className="rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 flex items-center gap-1.5">
                          <Plus className="w-4 h-4" /> Create Broadcast
                        </Button>
                      </div>

                      <AnimatePresence>
                        {showNotificationForm && (
                          <motion.form
                            onSubmit={handleSendNotification}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-card border border-border/40 p-6 rounded-3xl space-y-4 max-w-xl"
                          >
                            <h4 className="font-extrabold text-sm text-foreground">Broadcast Push Notification</h4>
                            <div className="space-y-3">
                              <Input placeholder="Notification Title (e.g. Flash Sale Live! ⚡)" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required />
                              <textarea placeholder="Message content..." value={notifMsg} onChange={e => setNotifMsg(e.target.value)} className="w-full h-24 p-3 rounded-xl bg-background border border-border/40 text-sm focus:outline-none focus:ring-0" required />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setShowNotificationForm(false)}>Cancel</Button>
                              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-bold">
                                {submitting ? "Broadcasting..." : "Send Notification"}
                              </Button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      <div className="bg-card p-6 rounded-3xl border border-border/40 neu-card">
                        <h4 className="font-extrabold text-sm text-foreground mb-2">Broadcasting Policy</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Broadcast push notifications will deliver to all customers whose active city is set to <span className="font-semibold text-foreground capitalize">{activeCityName}</span>. Use this to alert customers regarding weather alerts, festival campaigns, or city-wide offers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* INVENTORY TAB */}
                  {activeTab === "inventory" && (
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground">Hyperlocal Inventory Alerts</h3>
                      {productsInventory.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-3xl border border-border/30 text-muted-foreground">
                          No product inventory found for {activeCityName}.
                        </div>
                      ) : (
                        <div className="bg-card rounded-3xl border border-border/40 neu-card overflow-hidden">
                          <table className="w-full border-collapse text-left text-sm">
                            <thead className="bg-muted/40 border-b border-border/20 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              <tr>
                                <th className="p-4">Product</th>
                                <th className="p-4">Shop</th>
                                <th className="p-4">Stock Status</th>
                                <th className="p-4 text-right">Unit Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {productsInventory.map(p => (
                                <tr key={p.id}>
                                  <td className="p-4 font-bold text-foreground">{p.name}</td>
                                  <td className="p-4 text-muted-foreground">{p.shopName || "Local Merchant"}</td>
                                  <td className="p-4">
                                    <Badge className={`border-none ${p.stock === 0 ? "bg-red-500/10 text-red-500" : p.stock < 10 ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}`}>
                                      {p.stock === 0 ? "Out of stock" : `${p.stock} remaining`}
                                    </Badge>
                                  </td>
                                  <td className="p-4 text-right font-extrabold text-foreground">₹{p.price}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
