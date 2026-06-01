import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";
import { 
  LayoutDashboard, Store, Users, FileText, TrendingUp, Ban, CheckCircle, 
  XCircle, Clock, Search, Shield, Star, ShoppingBag, Trash2, Eye, EyeOff,
  ChevronDown, ChevronUp, Award, Building2, CreditCard, User, AlertCircle,
  Flag, BarChart2, LogOut, Menu, X, Package, RefreshCw, Bell, Send,
  ImageIcon, Plus, Edit2
} from "lucide-react";
import { categories } from "@/data/categories";
import { VendorApplication, VendorStatus, AdminCustomer, PlatformOrder, Report, TransactionLog, Vendor } from "@/types";
import { useShops } from "@/hooks/useShops";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

interface ApiShop {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  shopType: string;
  description?: string;
  panNumber: string;
  gstNumber?: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  upiId: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  rejectionReason?: string;
  createdAt: string;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  address?: { line1?: string; city?: string; pincode?: string };
  isOpen?: boolean;
}

interface ApiUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  createdAt: string;
}

interface ApiOrder {
  _id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  shopId?: string;
  shopName?: string;
  items: { name: string; qty: number; price: number }[];
  netAmount?: number;
  subtotal?: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AdminStats {
  totalUsers: number;
  totalShops: number;
  pendingShops: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCommission: number;
}

interface AnalyticsPoint { label: string; revenue: number; orders: number; newUsers: number; commission: number }

function buildDaySeries(orders: ApiOrder[]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    const startMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const endMs = startMs + 86400000 - 1;
    const dayOrders = orders.filter(o => { const t = new Date(o.createdAt).getTime(); return t >= startMs && t <= endMs; });
    const revenue = dayOrders.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
    return { date: label, revenue, orders: dayOrders.length, commission: Math.round(revenue * 0.05) };
  });
}

function buildAnalyticsSeries(orders: ApiOrder[], period: 'Daily' | 'Weekly' | 'Monthly'): AnalyticsPoint[] {
  const now = new Date();
  if (period === 'Daily') {
    return buildDaySeries(orders).map(d => ({ label: d.date, revenue: d.revenue, orders: d.orders, newUsers: 0, commission: d.commission }));
  }
  if (period === 'Weekly') {
    return Array.from({ length: 4 }, (_, i) => {
      const wEnd = new Date(now); wEnd.setDate(wEnd.getDate() - i * 7);
      const wStart = new Date(wEnd); wStart.setDate(wEnd.getDate() - 6);
      const wo = orders.filter(o => { const t = new Date(o.createdAt).getTime(); return t >= wStart.getTime() && t <= wEnd.getTime(); });
      const revenue = wo.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
      return { label: `Week ${4 - i}`, revenue, orders: wo.length, newUsers: 0, commission: Math.round(revenue * 0.05) };
    }).reverse();
  }
  return Array.from({ length: 6 }, (_, i) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
    const mo = orders.filter(o => { const t = new Date(o.createdAt).getTime(); return t >= month.getTime() && t < next.getTime(); });
    const revenue = mo.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
    return { label: month.toLocaleDateString('en-US', { month: 'short' }), revenue, orders: mo.length, newUsers: 0, commission: Math.round(revenue * 0.05) };
  });
}

function buildTopProducts(orders: ApiOrder[]) {
  const map = new Map<string, { name: string; category: string; unitsSold: number; revenue: number; vendorName: string }>();
  for (const order of orders) {
    for (const item of order.items) {
      const name = (item as { productName?: string; name?: string }).productName ?? (item as { name?: string }).name ?? 'Unknown';
      const key = name.toLowerCase();
      const qty = (item as { qty?: number }).qty ?? 1;
      const price = (item as { price?: number }).price ?? 0;
      const cat = (item as { category?: string }).category ?? 'other';
      const ex = map.get(key);
      if (ex) { ex.unitsSold += qty; ex.revenue += qty * price; }
      else map.set(key, { name, category: cat, unitsSold: qty, revenue: qty * price, vendorName: order.shopName ?? 'Unknown' });
    }
  }
  return [...map.entries()].map(([, v], i) => ({ id: `tp-${i}`, ...v, image: '' }))
    .sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
}

type AdminSection = 'overview' | 'requests' | 'users' | 'orders' | 'reports' | 'analytics' | 'transactions' | 'notifications' | 'hero-banners';

export default function Admin() {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] flex bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-foreground">
          <Menu className="w-6 h-6" />
        </button>
        <div className="font-bold text-foreground capitalize">{activeSection}</div>
        <div className="flex items-center gap-1 font-bold text-primary">
          SwiftMart <Shield className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", bounce: 0, duration: 0.3 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-card z-50 flex flex-col"
            >
              <SidebarContent activeSection={activeSection} setActiveSection={(s) => { setActiveSection(s); setMobileMenuOpen(false); }} handleLogout={handleLogout} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen shrink-0 bg-card neu-card rounded-none border-r border-border flex-col sticky top-0">
        <SidebarContent activeSection={activeSection} setActiveSection={setActiveSection} handleLogout={handleLogout} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-[100dvh] overflow-y-auto pt-14 md:pt-0 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'overview' && <OverviewTab onNavigate={setActiveSection} />}
              {activeSection === 'requests' && <ShopRequestsTab />}
              {activeSection === 'users' && <UsersTab />}
              {activeSection === 'orders' && <OrdersTab />}
              {activeSection === 'reports' && <ReportsTab />}
              {activeSection === 'analytics' && <AnalyticsTab />}
              {activeSection === 'transactions' && <TransactionsTab />}
              {activeSection === 'notifications' && <AdminNotificationsTab />}
              {activeSection === 'hero-banners' && <HeroBannersTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ activeSection, setActiveSection, handleLogout }: { activeSection: AdminSection, setActiveSection: (s: AdminSection) => void, handleLogout: () => void }) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const { reports } = useAuth();
  const openReports = reports.filter(r => r.status === 'open').length;

  useEffect(() => {
    api.get<{ success: boolean; stats: { pendingShops: number; pendingOrders: number } }>('/admin/stats')
      .then(d => {
        setPendingRequests(d.stats.pendingShops);
        setPendingOrders(d.stats.pendingOrders);
      })
      .catch(() => {});
  }, []);

  const navItems: { id: AdminSection, label: string, icon: any, badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'requests', label: 'Shop Requests', icon: FileText, badge: pendingRequests },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: pendingOrders },
    { id: 'reports', label: 'Reports', icon: Flag, badge: openReports },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'hero-banners', label: 'Hero Banners', icon: ImageIcon },
  ];

  return (
    <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl font-bold text-primary tracking-tight">SwiftMart</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5" /> Admin Panel
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
              activeSection === item.id 
                ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-primary' : 'opacity-70'}`} />
              <span>{item.label}</span>
            </div>
            {!!item.badge && item.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                activeSection === item.id ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <div className="bg-muted/30 p-3 rounded-xl mb-4 flex items-center justify-center text-xs font-mono text-muted-foreground">
          ID: ADMIN-0000000000
        </div>
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </>
  );
}

// ============================================================================
// OVERVIEW SECTION
// ============================================================================

function OverviewTab({ onNavigate }: { onNavigate: (s: AdminSection) => void }) {
  const { reports } = useAuth();
  const { shops } = useShops();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([]);

  useEffect(() => {
    api.get<{ success: boolean; stats: AdminStats }>('/admin/stats').then(d => setAdminStats(d.stats)).catch(() => {});
    api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=200').then(d => setRecentOrders(d.orders)).catch(() => {});
  }, []);

  const weekRevData = useMemo(() => buildDaySeries(recentOrders), [recentOrders]);
  const totalRevenue = adminStats?.totalRevenue ?? 0;
  const platformComm = adminStats?.totalCommission ?? 0;
  const activeShopsCount = adminStats?.totalShops ?? shops.length;
  const totalUsers = adminStats?.totalUsers ?? 0;
  const totalOrdersCount = adminStats?.totalOrders ?? 0;
  const openReports = reports.filter(r => r.status === 'open').length;

  const topShops = useMemo(() => [...shops].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 3), [shops]);

  const formatLargeValue = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return formatINR(val);
  };

  const recentActivity = useMemo(() => {
    const activities: { id: string; type: string; icon: any; title: string; desc: string; time: string; color: string; bg: string }[] = [];
    const timeAgo = (dateStr: string) => {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    };
    [...recentOrders].slice(0, 2).forEach((o, i) => {
      activities.push({ id: `ord-${i}`, type: 'order', icon: ShoppingBag, title: 'New order placed', desc: `#${o._id.slice(-6).toUpperCase()} at ${o.shopName ?? 'shop'}`, time: timeAgo(o.createdAt), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' });
    });
    reports.filter(r => r.status === 'open').slice(0, 1).forEach((r, i) => {
      activities.push({ id: `rep-${i}`, type: 'report', icon: Flag, title: 'New report opened', desc: `Regarding ${r.targetName}`, time: timeAgo(r.reportedAt), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' });
    });
    [...shops].filter(s => s.status === 'active').slice(0, 1).forEach((s, i) => {
      activities.push({ id: `shop-${i}`, type: 'shop', icon: Store, title: 'Shop active', desc: s.storeName, time: '', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20' });
    });
    return activities.slice(0, 5);
  }, [recentOrders, reports, shops]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatLargeValue(totalRevenue)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Platform Commission" value={formatLargeValue(platformComm)} icon={Award} color="text-amber-600" />
        <StatCard title="Active Shops" value={activeShopsCount} icon={Store} color="text-blue-600" />
        <StatCard title="Total Customers" value={totalUsers} icon={Users} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Orders" value={totalOrdersCount} icon={ShoppingBag} color="text-indigo-600" />
        <StatCard title="Open Reports" value={openReports} icon={Flag} color="text-red-600" />
        <StatCard title="Pending Orders" value={adminStats?.pendingOrders ?? 0} icon={CreditCard} color="text-teal-600" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button onClick={() => onNavigate('requests')} variant="outline" className="rounded-full bg-card neu-inset border-none text-foreground"><FileText className="w-4 h-4 mr-2 text-primary" /> View Pending Requests</Button>
        <Button onClick={() => onNavigate('reports')} variant="outline" className="rounded-full bg-card neu-inset border-none text-foreground"><Flag className="w-4 h-4 mr-2 text-red-500" /> View Open Reports</Button>
        <Button onClick={() => onNavigate('orders')} variant="outline" className="rounded-full bg-card neu-inset border-none text-foreground"><ShoppingBag className="w-4 h-4 mr-2 text-blue-500" /> View Orders</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card p-6 rounded-3xl neu-card">
          <h3 className="text-lg font-bold text-foreground mb-4">Revenue This Week</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekRevData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-3xl neu-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Top Performing Shops</h3>
            <div className="space-y-4">
              {topShops.map((shop, i) => (
                <div key={shop.id} className="flex items-center gap-3">
                  <div className="relative">
                    <img src={shop.image} alt={shop.storeName} className="w-10 h-10 rounded-full object-cover bg-muted" />
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-card ${
                      i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
                    }`}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{shop.storeName}</p>
                    <p className="text-xs text-muted-foreground truncate">{shop.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatLargeValue(shop.totalRevenue || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl neu-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>No recent activity yet</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent hidden-before">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.bg} ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.desc}{activity.time ? ` · ${activity.time}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-card p-4 md:p-6 rounded-2xl md:rounded-3xl neu-card flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`w-5 h-5 ${color} opacity-80`} />
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

// ============================================================================
// SHOP REQUESTS SECTION
// ============================================================================

function ShopRequestsTab() {
  const [shops, setShops] = useState<ApiShop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchShops = () => {
    setLoadingShops(true);
    api.get<{ success: boolean; shops: ApiShop[] }>('/shops?limit=100')
      .then(d => setShops(d.shops))
      .catch(() => setShops([]))
      .finally(() => setLoadingShops(false));
  };

  useEffect(() => { fetchShops(); }, []);

  const applications = shops.map(s => ({
    id: s._id,
    userId: s._id,
    userName: s.ownerName,
    userPhone: s.phone,
    storeName: s.shopName,
    storeCategory: s.shopType as VendorApplication['storeCategory'],
    storeDescription: s.description ?? "",
    ownerName: s.ownerName,
    panNumber: s.panNumber,
    gstNumber: s.gstNumber ?? "",
    bankAccountNumber: s.bankAccountNumber,
    bankIfscCode: s.bankIfscCode,
    upiId: s.upiId,
    submittedAt: s.createdAt,
    status: (s.status === 'banned' ? 'rejected' : s.status) as VendorApplication['status'],
    rejectionReason: s.rejectionReason,
  }));

  const filteredApplications = applications.filter(app => filter === 'all' || app.status === filter);
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/shops/${id}/approve`);
      toast.success("Application approved");
      fetchShops();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { toast.error("Please provide a reason for rejection"); return; }
    try {
      await api.post(`/shops/${id}/reject`, { reason: rejectReason });
      setRejectingId(null);
      setRejectReason("");
      toast.success("Application rejected");
      fetchShops();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };

  if (loadingShops) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        {[1,2,3].map(i => <div key={i} className="h-40 bg-muted rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Shop Requests</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-2xl neu-card text-center">
          <div className="text-2xl font-bold text-foreground">{applications.length}</div>
          <div className="text-xs text-muted-foreground">Total Apps</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl neu-card text-center border border-amber-200 dark:border-amber-900/50">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{pendingCount}</div>
          <div className="text-xs text-amber-700 dark:text-amber-400">Pending</div>
        </div>
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-2xl neu-card text-center border border-green-200 dark:border-green-900/50">
          <div className="text-2xl font-bold text-green-600 dark:text-green-500">{approvedCount}</div>
          <div className="text-xs text-green-700 dark:text-green-400">Approved</div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl neu-card text-center border border-red-200 dark:border-red-900/50">
          <div className="text-2xl font-bold text-red-600 dark:text-red-500">{rejectedCount}</div>
          <div className="text-xs text-red-700 dark:text-red-400">Rejected</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-primary text-primary-foreground neu-card' 
                : 'bg-background text-muted-foreground neu-inset'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No applications found</p>
          </div>
        ) : (
          filteredApplications.map(app => (
            <div key={app.id} className="bg-card p-6 rounded-3xl neu-card space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl text-foreground">{app.storeName}</h3>
                    <Badge variant="secondary" className="bg-background neu-inset text-xs border-none capitalize">
                      {app.storeCategory.replace('-', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> {app.ownerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Applied: {new Date(app.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  {app.status === 'pending' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 neu-inset border-none px-3 py-1"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                  {app.status === 'approved' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 neu-inset border-none px-3 py-1"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                  {app.status === 'rejected' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 neu-inset border-none px-3 py-1"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background p-4 rounded-2xl neu-inset">
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Building2 className="w-4 h-4" /> KYC Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">PAN:</span>
                    <span className="font-mono text-foreground">{app.panNumber}</span>
                    {app.gstNumber && (
                      <>
                        <span className="text-muted-foreground">GST:</span>
                        <span className="font-mono text-foreground">{app.gstNumber}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CreditCard className="w-4 h-4" /> Payment Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">UPI:</span>
                    <span className="text-foreground">{app.upiId}</span>
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-mono text-foreground">{app.bankAccountNumber}</span>
                  </div>
                </div>
              </div>

              {app.status === 'pending' && (
                <div className="pt-2 border-t border-border flex flex-col md:flex-row gap-3">
                  {rejectingId === app.id ? (
                    <div className="w-full space-y-3 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl">
                      <Textarea 
                        placeholder="Reason for rejection..." 
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="bg-background neu-inset border-red-200 dark:border-red-900 resize-none h-20"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }} className="flex-1 rounded-xl">
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} className="flex-1 bg-red-600 hover:bg-red-700 shadow-none neu-card text-white rounded-xl">
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button onClick={() => handleApprove(app.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-none neu-card">
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve Application
                      </Button>
                      <Button onClick={() => setRejectingId(app.id)} variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/30 rounded-xl shadow-none neu-inset bg-background">
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              )}

              {app.status === 'rejected' && app.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 mt-2">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{app.rejectionReason}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// USERS SECTION (COMBINED CUSTOMERS & VENDORS)
// ============================================================================

function UsersTab() {
  const [subTab, setSubTab] = useState<'customers' | 'vendors'>('customers');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
      </div>

      <div className="flex gap-2 p-1 bg-background neu-inset rounded-xl max-w-fit">
        <button
          onClick={() => setSubTab('customers')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 'customers' ? 'bg-primary text-primary-foreground neu-card' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Customers
        </button>
        <button
          onClick={() => setSubTab('vendors')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === 'vendors' ? 'bg-primary text-primary-foreground neu-card' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Vendors
        </button>
      </div>

      {subTab === 'customers' ? <CustomersList /> : <VendorsList />}
    </div>
  );
}

function CustomersList() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCustomers = () => {
    setLoadingCustomers(true);
    api.get<{ success: boolean; users: ApiUser[] }>('/users?role=customer&limit=100')
      .then(d => {
        setCustomers(d.users.map(u => ({
          id: u._id,
          name: u.name,
          phone: u.phone,
          email: u.email ?? "",
          joinedAt: u.createdAt,
          totalOrders: 0,
          totalSpent: 0,
          status: (u.status === 'banned' ? 'banned' : 'active') as 'active' | 'banned',
          orders: [],
        })));
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  };

  useEffect(() => { fetchCustomers(); }, []);

  const banCustomer = async (customerId: string) => {
    await api.patch(`/users/${customerId}/ban`).catch(() => {});
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: 'banned' as const } : c));
  };

  const unbanCustomer = async (customerId: string) => {
    await api.patch(`/users/${customerId}/unban`).catch(() => {});
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: 'active' as const } : c));
  };

  const filtered = customers.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    return true;
  });

  if (loadingCustomers) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-3xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search customers by name or phone..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 bg-card neu-inset rounded-2xl border-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
          {(['all', 'active', 'banned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === f ? 'bg-primary text-primary-foreground neu-card' : 'bg-background text-muted-foreground neu-inset'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-card rounded-3xl neu-card overflow-hidden">
              <div 
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 neu-inset">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{c.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{c.phone}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:flex md:items-center gap-4 md:gap-8 flex-1 md:justify-end text-sm">
                  <div className="text-left md:text-right">
                    <p className="text-muted-foreground text-xs">Total Spent</p>
                    <p className="font-bold text-foreground">{formatINR(c.totalSpent)}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-muted-foreground text-xs">Orders</p>
                    <p className="font-bold text-foreground">{c.totalOrders}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-muted-foreground text-xs">Status</p>
                    {c.status === 'active' 
                      ? <Badge className="bg-green-100 text-green-800 border-none px-2 rounded-full font-medium">Active</Badge>
                      : <Badge className="bg-red-100 text-red-800 border-none px-2 rounded-full font-medium">Banned</Badge>
                    }
                  </div>
                  <div className="flex items-center justify-end">
                    {expandedId === c.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {expandedId === c.id && (
                <div className="px-4 md:px-6 pb-6 pt-2 border-t border-border/50 bg-background/50">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Joined: {new Date(c.joinedAt).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">Email: {c.email || 'N/A'}</p>
                    </div>
                    <div>
                      {c.status === 'active' ? (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); banCustomer(c.id); toast.success("Customer banned"); }}
                          variant="outline" 
                          className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl neu-inset bg-background shadow-none h-9"
                        >
                          <Ban className="w-4 h-4 mr-2" /> Ban User
                        </Button>
                      ) : (
                        <Button 
                          onClick={(e) => { e.stopPropagation(); unbanCustomer(c.id); toast.success("Customer unbanned"); }}
                          className="bg-green-600 hover:bg-green-700 text-white rounded-xl neu-card shadow-none h-9"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" /> Unban User
                        </Button>
                      )}
                    </div>
                  </div>

                  {c.orders.length > 0 ? (
                    <div className="space-y-3 mt-4">
                      <h4 className="font-semibold text-sm text-foreground">Recent Orders</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                              <th className="pb-2 font-medium">Order ID</th>
                              <th className="pb-2 font-medium">Date</th>
                              <th className="pb-2 font-medium">Shop</th>
                              <th className="pb-2 font-medium">Items</th>
                              <th className="pb-2 font-medium text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.orders.map(o => (
                              <tr key={o.id} className="border-b border-border/30 last:border-0">
                                <td className="py-2 font-mono text-xs">{o.id}</td>
                                <td className="py-2">{new Date(o.placedAt).toLocaleDateString()}</td>
                                <td className="py-2 truncate max-w-[150px]">{o.vendorName}</td>
                                <td className="py-2 text-muted-foreground">{o.items.length} items</td>
                                <td className="py-2 text-right font-medium">{formatINR(o.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4 italic">No orders yet.</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function VendorsList() {
  const [apiShops, setApiShops] = useState<ApiShop[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');

  const fetchVendors = () => {
    setLoadingVendors(true);
    api.get<{ success: boolean; shops: ApiShop[] }>('/shops?status=approved&limit=100')
      .then(d => setApiShops(d.shops))
      .catch(() => setApiShops([]))
      .finally(() => setLoadingVendors(false));
  };

  useEffect(() => { fetchVendors(); }, []);

  const allShops = useMemo<Vendor[]>(() => {
    return apiShops.map(s => ({
      id: s._id,
      storeName: s.shopName,
      ownerName: s.ownerName,
      category: s.shopType,
      tagline: s.description ?? "",
      rating: s.rating ?? 0,
      totalOrders: s.totalOrders ?? 0,
      isOpen: s.isOpen ?? true,
      eta: "10-15 min",
      image: "",
      pincode: s.address?.pincode ?? "N/A",
      city: s.address?.city ?? "N/A",
      phone: s.phone,
      status: (s.status === 'banned' ? 'banned' : 'active') as 'active' | 'banned',
      joinedAt: s.createdAt,
      revenue: s.totalRevenue ?? 0,
      commission: Math.round((s.totalRevenue ?? 0) * 0.1),
    }));
  }, [apiShops]);

  const filtered = allShops.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.storeName.toLowerCase().includes(search.toLowerCase()) && !s.ownerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleBan = async (id: string) => {
    await api.patch(`/shops/${id}/ban`).catch(() => {});
    setApiShops(prev => prev.map(s => s._id === id ? { ...s, status: 'banned' as const } : s));
    toast.success("Shop banned");
  };

  const handleUnban = async (id: string) => {
    await api.patch(`/shops/${id}/unban`).catch(() => {});
    setApiShops(prev => prev.map(s => s._id === id ? { ...s, status: 'approved' as const } : s));
    toast.success("Shop unbanned");
  };

  const handleRemove = async (id: string) => {
    if (confirm("Are you sure you want to permanently remove this shop?")) {
      await api.delete(`/shops/${id}`).catch(() => {});
      setApiShops(prev => prev.filter(s => s._id !== id));
      toast.success("Shop removed");
    }
  };

  if (loadingVendors) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-3xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search shops by name or owner..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 bg-card neu-inset rounded-2xl border-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
          {(['all', 'active', 'banned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === f ? 'bg-primary text-primary-foreground neu-card' : 'bg-background text-muted-foreground neu-inset'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No shops found</p>
          </div>
        ) : (
          filtered.map(shop => (
            <div key={shop.id} className={`bg-card p-6 rounded-3xl neu-card space-y-4 ${shop.status === 'banned' ? 'opacity-75 grayscale-[50%]' : ''}`}>
              <div className="flex items-start gap-4">
                <img src={shop.image} alt={shop.storeName} className="w-16 h-16 rounded-2xl object-cover bg-muted neu-inset" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-foreground truncate">{shop.storeName}</h3>
                    {shop.status === 'banned' && <Badge className="bg-red-100 text-red-800 border-none shrink-0">Banned</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate">
                    <User className="w-3 h-3" /> {shop.ownerName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Joined: {new Date(shop.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-background p-3 rounded-2xl neu-inset">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="font-bold text-foreground">{formatINR(shop.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-bold text-foreground">{shop.totalOrders}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {shop.status === 'active' ? (
                  <Button 
                    onClick={() => handleBan(shop.id)} 
                    variant="outline" 
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl neu-inset bg-background shadow-none"
                  >
                    <Ban className="w-4 h-4 mr-2" /> Ban
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleUnban(shop.id)} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl neu-card shadow-none"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Unban
                  </Button>
                )}
                <Button 
                  onClick={() => handleRemove(shop.id)} 
                  variant="outline" 
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50 rounded-xl neu-inset bg-background shadow-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ORDERS SECTION
// ============================================================================

function OrdersTab() {
  const [platformOrders, setPlatformOrders] = useState<PlatformOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlatformOrder['status'] | 'all'>('all');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  useEffect(() => {
    setLoadingOrders(true);
    api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=100')
      .then(d => {
        setPlatformOrders(d.orders.map(o => ({
          id: o._id,
          customerId: o.customerId,
          customerName: o.customerName ?? "Customer",
          customerPhone: o.customerPhone ?? "",
          vendorId: o.shopId ?? "",
          vendorName: o.shopName ?? "Shop",
          items: o.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, category: "" })),
          total: o.netAmount ?? o.subtotal ?? o.items.reduce((s, i) => s + i.price * i.qty, 0),
          status: o.status as PlatformOrder['status'],
          paymentMethod: (o.paymentMethod ?? "cash") as PlatformOrder['paymentMethod'],
          paymentStatus: (o.paymentStatus ?? "pending") as PlatformOrder['paymentStatus'],
          placedAt: o.createdAt,
          updatedAt: o.updatedAt ?? o.createdAt,
        })));
      })
      .catch(() => setPlatformOrders([]))
      .finally(() => setLoadingOrders(false));
  }, []);

  const updateOrderStatus = async (orderId: string, status: PlatformOrder['status']) => {
    await api.patch(`/orders/${orderId}/status`, { status }).catch(() => {});
    setPlatformOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const refundOrder = async (orderId: string) => {
    await api.post(`/orders/${orderId}/refund`).catch(() => {});
    setPlatformOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: 'refunded' as const } : o));
  };

  const filtered = platformOrders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) && 
        !o.customerName.toLowerCase().includes(search.toLowerCase()) && 
        !o.vendorName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loadingOrders) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-muted rounded-3xl animate-pulse" />)}</div>;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'packed': return 'bg-amber-100 text-amber-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Order Management</h2>
        <Badge className="bg-primary/10 text-primary neu-inset border-none">{platformOrders.length} total</Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by Order ID, Customer, or Shop..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 bg-card neu-inset rounded-2xl border-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide shrink-0">
          {(['all', 'placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                filter === f ? 'bg-primary text-primary-foreground neu-card' : 'bg-background text-muted-foreground neu-inset'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No orders found</p>
          </div>
        ) : (
          filtered.map(o => (
            <div key={o.id} className="bg-card p-4 md:p-6 rounded-3xl neu-card flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-lg text-foreground">{o.id}</span>
                  <Badge className={`${getStatusColor(o.status)} border-none neu-inset px-2.5 py-0.5 capitalize`}>
                    {o.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(o.placedAt).toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background p-3 rounded-2xl neu-inset">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Customer</p>
                    <p className="font-medium text-foreground">{o.customerName}</p>
                    <p className="text-sm text-muted-foreground">{o.customerPhone}</p>
                  </div>
                  <div className="bg-background p-3 rounded-2xl neu-inset">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Shop</p>
                    <p className="font-medium text-foreground">{o.vendorName}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Items: {o.items[0]?.name} {o.items.length > 1 ? `& ${o.items.length - 1} more` : ''}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-64 flex flex-col gap-3 shrink-0">
                <div className="bg-background p-4 rounded-2xl neu-inset text-center">
                  <p className="text-sm text-muted-foreground mb-1">Order Total</p>
                  <p className="text-2xl font-bold text-foreground">{formatINR(o.total)}</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{o.paymentMethod}</span>
                    <Badge className={`${getPaymentColor(o.paymentStatus)} border-none text-[10px] px-1.5 py-0`}>
                      {o.paymentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {updatingOrder === o.id ? (
                    <div className="bg-background p-2 rounded-xl neu-inset flex gap-2">
                      <select 
                        className="flex-1 bg-transparent text-sm font-medium outline-none text-foreground"
                        defaultValue={o.status}
                        onChange={(e) => {
                          updateOrderStatus(o.id, e.target.value as any);
                          setUpdatingOrder(null);
                          toast.success("Order status updated");
                        }}
                      >
                        <option value="placed">Placed</option>
                        <option value="packed">Packed</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setUpdatingOrder(null)} className="h-8 px-2 rounded-lg"><X className="w-4 h-4"/></Button>
                    </div>
                  ) : (
                    <Button onClick={() => setUpdatingOrder(o.id)} variant="outline" className="w-full rounded-xl bg-card neu-inset border-none shadow-none text-primary hover:text-primary">
                      Update Status
                    </Button>
                  )}

                  {o.paymentStatus === 'success' && o.status !== 'cancelled' && (
                    <Button 
                      onClick={() => {
                        if(confirm(`Refund ${formatINR(o.total)} to customer?`)) {
                          refundOrder(o.id);
                          toast.success(`Refund initiated for ${formatINR(o.total)}`);
                        }
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-none neu-card"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Refund
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// REPORTS SECTION
// ============================================================================

function ReportsTab() {
  const { reports, resolveReport, ignoreReport } = useAuth();
  const [filter, setFilter] = useState<Report['status'] | 'all'>('all');

  const filtered = reports.filter(r => filter === 'all' || r.status === filter);

  const openCount = reports.filter(r => r.status === 'open').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const ignoredCount = reports.filter(r => r.status === 'ignored').length;

  const getReasonColor = (reason: string) => {
    switch(reason) {
      case 'fraud': return 'bg-red-100 text-red-800';
      case 'fake_product': return 'bg-orange-100 text-orange-800';
      case 'rude_behavior': return 'bg-purple-100 text-purple-800';
      case 'wrong_delivery': return 'bg-blue-100 text-blue-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Reports & Complaints</h2>
        <div className="flex gap-2">
          <Badge className="bg-red-100 text-red-800 border-none neu-inset">{openCount} Open</Badge>
          <Badge className="bg-green-100 text-green-800 border-none neu-inset hidden md:inline-flex">{resolvedCount} Resolved</Badge>
          <Badge className="bg-slate-100 text-slate-800 border-none neu-inset hidden md:inline-flex">{ignoredCount} Ignored</Badge>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['all', 'open', 'resolved', 'ignored'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
              filter === f ? 'bg-primary text-primary-foreground neu-card' : 'bg-background text-muted-foreground neu-inset'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground">
            <Flag className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No reports found</p>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="bg-card p-6 rounded-3xl neu-card space-y-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{r.id}</span>
                    <Badge className={`${r.type === 'shop' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'} border-none neu-inset capitalize px-2 py-0.5`}>
                      {r.type}
                    </Badge>
                    <Badge className={`${r.status === 'open' ? 'bg-red-100 text-red-800' : r.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'} border-none neu-inset capitalize px-2 py-0.5`}>
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(r.reportedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-background p-3 rounded-2xl neu-inset space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {r.type === 'shop' ? <Store className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-primary" />}
                  Reported: {r.targetName}
                </div>
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  By: <span className="font-medium text-foreground">{r.reportedBy}</span> · {r.reporterPhone}
                </div>
              </div>

              <div>
                <Badge className={`${getReasonColor(r.reason)} border-none mb-2 px-2 py-0.5 capitalize`}>
                  {r.reason.replace('_', ' ')}
                </Badge>
                <p className="text-sm italic text-muted-foreground line-clamp-3">"{r.description}"</p>
              </div>

              <div className="mt-auto pt-4 flex gap-2">
                {r.status === 'open' ? (
                  <>
                    <Button 
                      onClick={() => { resolveReport(r.id); toast.success("Report marked as resolved"); }} 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl neu-card shadow-none"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Resolve
                    </Button>
                    <Button 
                      onClick={() => { ignoreReport(r.id); toast.success("Report ignored"); }} 
                      variant="outline" 
                      className="flex-1 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl neu-inset bg-background shadow-none"
                    >
                      <EyeOff className="w-4 h-4 mr-2" /> Ignore
                    </Button>
                  </>
                ) : (
                  <div className="w-full text-center p-2 bg-background neu-inset rounded-xl text-sm font-medium text-muted-foreground capitalize">
                    {r.status}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS SECTION
// ============================================================================

function AnalyticsTab() {
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const { shops } = useShops();
  const [allOrders, setAllOrders] = useState<ApiOrder[]>([]);

  useEffect(() => {
    api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=500')
      .then(d => setAllOrders(d.orders)).catch(() => {});
  }, []);

  const data = useMemo(() => buildAnalyticsSeries(allOrders, period), [allOrders, period]);
  const computedTopProducts = useMemo(() => buildTopProducts(allOrders), [allOrders]);

  const totalRev = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrd = data.reduce((sum, d) => sum + d.orders, 0);
  const totalNewUsers = data.reduce((sum, d) => sum + d.newUsers, 0);
  const totalComm = data.reduce((sum, d) => sum + d.commission, 0);

  const maxUnits = computedTopProducts.length > 0 ? computedTopProducts[0].unitsSold : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Platform Analytics</h2>
        <div className="flex gap-1 p-1 bg-background neu-inset rounded-xl max-w-fit">
          {(['Daily', 'Weekly', 'Monthly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p ? 'bg-primary text-primary-foreground neu-card' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatINR(totalRev)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Total Orders" value={totalOrd} icon={ShoppingBag} color="text-blue-600" />
        <StatCard title="New Users" value={totalNewUsers} icon={Users} color="text-purple-600" />
        <StatCard title="Commission" value={formatINR(totalComm)} icon={Award} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-3xl neu-card">
          <h3 className="text-lg font-bold text-foreground mb-4">Revenue & Orders ({period})</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrd2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev2)" />
                <Area yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrd2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl neu-card">
          <h3 className="text-lg font-bold text-foreground mb-4">New Users ({period})</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                />
                <Bar dataKey="newUsers" name="New Users" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-3xl neu-card space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Top Selling Products</h3>
            <p className="text-sm text-muted-foreground">By units sold this period</p>
          </div>
          
          <div className="space-y-5">
            {computedTopProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No order data yet — top products will appear here once orders are placed.
              </div>
            ) : computedTopProducts.map((p, i) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-muted neu-inset flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 border-none bg-background neu-inset capitalize">
                        {p.category.replace('-', ' ')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{p.vendorName}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{p.unitsSold} units</p>
                    <p className="text-[10px] text-muted-foreground">{formatINR(p.revenue)}</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-background neu-inset rounded-full overflow-hidden ml-9">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(p.unitsSold / maxUnits) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-6 rounded-3xl neu-card space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Top Shops</h3>
            <p className="text-sm text-muted-foreground">By total revenue</p>
          </div>
          
          <div className="space-y-4">
            {[...shops].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0)).slice(0, 5).map((shop) => (
              <div key={shop.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background neu-inset rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={shop.image} alt={shop.storeName} className="w-12 h-12 rounded-full object-cover bg-muted" />
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{shop.storeName}</p>
                    <p className="text-xs text-muted-foreground">{shop.totalOrders} total orders</p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                  <p className="font-bold text-foreground">{formatINR(shop.totalRevenue || 0)}</p>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none">
                    Comm: {formatINR(Math.round((shop.totalRevenue || 0) * (shop.commissionRate || 5) / 100))}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRANSACTIONS SECTION
// ============================================================================

function TransactionsTab() {
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TransactionLog['status'] | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'7' | '30' | 'all'>('all');

  useEffect(() => {
    setTxLoading(true);
    const methodMap: Record<string, TransactionLog['method']> = { COD: 'COD', UPI: 'UPI', card: 'Card', wallet: 'UPI' };
    api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=500')
      .then(d => {
        const txns: TransactionLog[] = d.orders.map(o => ({
          id: `TXN-${o._id.slice(-8).toUpperCase()}`,
          orderId: o._id,
          customerName: o.customerName ?? 'Customer',
          vendorName: o.shopName ?? 'Vendor',
          amount: o.netAmount ?? o.subtotal ?? 0,
          method: methodMap[o.paymentMethod ?? 'COD'] ?? 'COD',
          status: (o.paymentStatus ?? 'pending') as TransactionLog['status'],
          createdAt: o.createdAt,
        }));
        setTransactions(txns);
      })
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, []);

  if (txLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.id.toLowerCase().includes(search.toLowerCase()) && 
        !t.orderId.toLowerCase().includes(search.toLowerCase()) &&
        !t.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoff = new Date(Date.now() - 86400000 * days);
      if (new Date(t.createdAt) < cutoff) return false;
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-slate-200 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
  const successCount = filtered.filter(t => t.status === 'success').length;
  const failedCount = filtered.filter(t => t.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-foreground">Transaction Logs</h2>
        <Badge className="bg-primary/10 text-primary neu-inset border-none">{transactions.length} total</Badge>
      </div>

      <div className="flex flex-col gap-4 bg-card p-4 rounded-3xl neu-card">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by TXN ID, Order ID, or Customer..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 bg-background neu-inset rounded-2xl border-none"
          />
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {(['all', 'success', 'pending', 'failed', 'refunded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                  filter === f ? 'bg-primary text-primary-foreground neu-card' : 'bg-background text-muted-foreground neu-inset'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide bg-background neu-inset p-1 rounded-2xl">
            <button onClick={() => setDateFilter('7')} className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${dateFilter === '7' ? 'bg-card neu-card text-foreground' : 'text-muted-foreground'}`}>Last 7 days</button>
            <button onClick={() => setDateFilter('30')} className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${dateFilter === '30' ? 'bg-card neu-card text-foreground' : 'text-muted-foreground'}`}>Last 30 days</button>
            <button onClick={() => setDateFilter('all')} className={`px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap ${dateFilter === 'all' ? 'bg-card neu-card text-foreground' : 'text-muted-foreground'}`}>All time</button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl neu-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-background/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border/50">
                  <tr>
                    <th className="p-4">TXN ID</th>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Vendor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-border/50">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono font-medium text-foreground">{t.id}</td>
                      <td className="p-4 font-mono text-muted-foreground">{t.orderId}</td>
                      <td className="p-4">{t.customerName}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[150px]">{t.vendorName}</td>
                      <td className="p-4 font-bold text-foreground">{formatINR(t.amount)}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-background neu-inset rounded-lg text-xs font-medium">{t.method}</span></td>
                      <td className="p-4">
                        <Badge className={`${getStatusColor(t.status)} border-none px-2 py-0.5 capitalize`}>{t.status}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-border/50">
              {filtered.map(t => (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground">{t.id}</span>
                    <Badge className={`${getStatusColor(t.status)} border-none px-2 py-0.5 capitalize`}>{t.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center bg-background neu-inset p-3 rounded-2xl">
                    <div>
                      <p className="text-xs text-muted-foreground">Order</p>
                      <p className="font-mono text-sm">{t.orderId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t.method}</p>
                      <p className="font-bold text-lg">{formatINR(t.amount)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-foreground font-medium">{t.customerName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{t.vendorName}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground pt-1">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-background/80 border-t border-border/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div>Showing <span className="font-bold text-foreground">{filtered.length}</span> transactions</div>
              <div className="flex gap-4">
                <span>Success: <span className="text-green-600 font-bold">{successCount}</span></span>
                <span>Failed: <span className="text-red-600 font-bold">{failedCount}</span></span>
                <span className="bg-card neu-inset px-3 py-1 rounded-xl text-foreground font-bold border border-border">Total: {formatINR(totalAmount)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN NOTIFICATIONS SECTION
// ============================================================================

interface BroadcastRecord {
  _id: string;
  title: string;
  message: string;
  targetAudience: string;
  sentCount: number;
  createdAt: string;
}

function AdminNotificationsTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "customers" | "vendors" | "specific">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = () => {
    setLoadingHistory(true);
    api.get<{ success: boolean; broadcasts: BroadcastRecord[] }>("/notifications/broadcasts")
      .then(d => setHistory(d.broadcasts))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Title and message are required"); return; }
    if (targetAudience === "specific" && !targetUserId.trim()) { toast.error("Please enter a User ID"); return; }
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; sentCount: number }>("/notifications/broadcast", {
        title, message, targetAudience, targetUserId: targetAudience === "specific" ? targetUserId : undefined,
      });
      toast.success(`Notification sent to ${res.sentCount} user${res.sentCount !== 1 ? "s" : ""}`);
      setTitle(""); setMessage(""); setTargetUserId("");
      fetchHistory();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const audienceLabels: Record<string, string> = {
    all: "All Users",
    customers: "Customers Only",
    vendors: "Vendors Only",
    specific: "Specific User",
  };

  return (
    <div className="space-y-6">
      {/* Compose */}
      <div className="bg-card p-6 rounded-3xl neu-card space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Send Notification</h2>
            <p className="text-xs text-muted-foreground">Broadcast a message to users on the platform</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Audience</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(["all", "customers", "vendors", "specific"] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setTargetAudience(a)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    targetAudience === a
                      ? "bg-primary text-primary-foreground neu-card"
                      : "bg-background neu-inset text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {audienceLabels[a]}
                </button>
              ))}
            </div>
          </div>

          {targetAudience === "specific" && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">User ID</label>
              <Input
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                placeholder="Paste MongoDB user _id"
                className="bg-background neu-inset border-none font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Notification title"
              className="bg-background neu-inset border-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Message</label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={3}
              className="bg-background neu-inset border-none resize-none"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full md:w-auto rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {sending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Send Notification</>
            )}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="bg-card rounded-3xl neu-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="font-bold text-lg text-foreground">Broadcast History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All notifications sent by admins</p>
        </div>

        {loadingHistory ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {history.map(b => (
              <div key={b._id} className="p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{b.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{b.message}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className="bg-primary/10 text-primary border-none text-xs capitalize">
                        {audienceLabels[b.targetAudience] ?? b.targetAudience}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-green-600 font-medium">
                      ✓ Sent to {b.sentCount} user{b.sentCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ApiBanner {
  _id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  redirectType: "category" | "shop" | "product" | "internal" | "external";
  redirectValue: string;
  isActive: boolean;
  displayOrder: number;
  views: number;
  clicks: number;
  createdAt: string;
}

interface BannerForm {
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  redirectType: "category" | "shop" | "product" | "internal" | "external";
  redirectValue: string;
  isActive: boolean;
  displayOrder: number;
}

const defaultBannerForm: BannerForm = {
  imageUrl: "", title: "", subtitle: "", buttonText: "",
  redirectType: "internal", redirectValue: "", isActive: true, displayOrder: 0,
};

const redirectTypeLabels: Record<string, string> = {
  category: "Category",
  shop: "Shop",
  product: "Product",
  internal: "Internal Page",
  external: "External URL",
};

const redirectValuePlaceholders: Record<string, string> = {
  shop: "Shop ID (e.g. from /shop/...)",
  product: "Product ID (e.g. from /product/...)",
  internal: "/offers, /shops, /categories",
  external: "https://instagram.com/yourpage",
};

function HeroBannersTab() {
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(defaultBannerForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; banners: ApiBanner[] }>("/hero-banners/admin");
      setBanners(data.banners);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { access } = api.getTokens();
      const res = await fetch("/api/upload/banner-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${access ?? ""}` },
        body: fd,
      });
      const data = await res.json() as { success: boolean; imageUrl: string };
      if (data.success) setForm(f => ({ ...f, imageUrl: data.imageUrl }));
      else toast.error("Upload failed");
    } catch { toast.error("Upload failed"); } finally {
      setUploading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultBannerForm);
    setShowForm(true);
  };

  const openEdit = (b: ApiBanner) => {
    setEditingId(b._id);
    setForm({
      imageUrl: b.imageUrl,
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      buttonText: b.buttonText ?? "",
      redirectType: b.redirectType,
      redirectValue: b.redirectValue,
      isActive: b.isActive,
      displayOrder: b.displayOrder,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.imageUrl) { toast.error("Please upload a banner image"); return; }
    if (!form.redirectValue.trim()) { toast.error("Redirect target is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/hero-banners/${editingId}`, form);
        toast.success("Banner updated");
      } else {
        await api.post("/hero-banners", form);
        toast.success("Banner created");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultBannerForm);
      fetchBanners();
    } catch (e) {
      toast.error((e as Error).message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this banner? This cannot be undone.")) return;
    try {
      await api.delete(`/hero-banners/${id}`);
      toast.success("Banner deleted");
      fetchBanners();
    } catch { toast.error("Delete failed"); }
  };

  const handleToggleActive = async (b: ApiBanner) => {
    try {
      await api.patch(`/hero-banners/${b._id}`, { isActive: !b.isActive });
      fetchBanners();
    } catch { toast.error("Update failed"); }
  };

  const totalViews = banners.reduce((s, b) => s + b.views, 0);
  const totalClicks = banners.reduce((s, b) => s + b.clicks, 0);
  const overallCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Hero Banners</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage homepage banners with click &amp; view analytics</p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Banner
        </Button>
      </div>

      {/* Analytics summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Views", value: totalViews.toLocaleString(), color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Total Clicks", value: totalClicks.toLocaleString(), color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Overall CTR", value: `${overallCtr}%`, color: "text-primary", bg: "bg-primary/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 neu-card ${bg}`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-card rounded-3xl neu-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{editingId ? "Edit Banner" : "New Banner"}</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image upload */}
          <div>
            <label className="text-sm font-semibold block mb-2">Banner Image <span className="text-destructive">*</span></label>
            {form.imageUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={form.imageUrl} alt="Preview" className="w-full h-44 object-cover" />
                <button
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                  onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/60 transition-colors text-center">
                {uploading ? (
                  <>
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading…</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-9 h-9 text-muted-foreground/50" />
                    <span className="text-sm font-medium text-muted-foreground">Click to upload banner image</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5 MB</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Title / Subtitle / Button Text */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "title" as const, label: "Title", placeholder: "Bold headline text" },
              { key: "subtitle" as const, label: "Subtitle", placeholder: "Supporting description" },
              { key: "buttonText" as const, label: "Button Text", placeholder: "Shop Now" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1">{label}</label>
                <Input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="bg-background neu-inset border-none"
                />
              </div>
            ))}
          </div>

          {/* Redirect Type + Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Redirect Type <span className="text-destructive">*</span></label>
              <select
                value={form.redirectType}
                onChange={e => setForm(f => ({ ...f, redirectType: e.target.value as BannerForm["redirectType"], redirectValue: "" }))}
                className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer"
              >
                {(["category", "shop", "product", "internal", "external"] as const).map(t => (
                  <option key={t} value={t}>{redirectTypeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                {redirectTypeLabels[form.redirectType]} <span className="text-destructive">*</span>
              </label>
              {form.redirectType === "category" ? (
                <select
                  value={form.redirectValue}
                  onChange={e => setForm(f => ({ ...f, redirectValue: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer"
                >
                  <option value="">Select a category…</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={form.redirectValue}
                  onChange={e => setForm(f => ({ ...f, redirectValue: e.target.value }))}
                  placeholder={redirectValuePlaceholders[form.redirectType]}
                  className="bg-background neu-inset border-none"
                />
              )}
            </div>
          </div>

          {/* Display Order + Active */}
          <div className="flex flex-wrap items-end gap-5">
            <div className="w-36">
              <label className="text-sm font-medium block mb-1">Display Order</label>
              <Input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                className="bg-background neu-inset border-none"
              />
            </div>
            <div className="flex items-center gap-3 pb-1">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm text-muted-foreground">{form.isActive ? "Active — visible to users" : "Inactive — hidden"}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : editingId ? "Update Banner" : "Create Banner"}
            </Button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No hero banners yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first banner to display on the homepage.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">All Banners ({banners.length})</h3>
            <span className="text-xs text-muted-foreground">Sorted by display order</span>
          </div>
          <div className="divide-y divide-border/50">
            {banners.map(b => {
              const ctr = b.views > 0 ? ((b.clicks / b.views) * 100).toFixed(1) : "0.0";
              return (
                <div key={b._id} className="p-4 flex items-center gap-4">
                  <div className="w-20 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                    <img src={b.imageUrl} alt={b.title ?? "Banner"} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {b.title || <span className="text-muted-foreground italic">(No title)</span>}
                      </p>
                      <Badge className={`text-[10px] border-none shrink-0 px-2 py-0 ${b.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {b.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {redirectTypeLabels[b.redirectType]} → {b.redirectValue}
                      {b.buttonText && <span className="ml-2 text-primary/70">· "{b.buttonText}"</span>}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {b.views.toLocaleString()} views
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" /> {b.clicks.toLocaleString()} clicks
                      </span>
                      <span className="text-xs font-semibold text-primary">CTR {ctr}%</span>
                      <span className="text-xs text-muted-foreground">Order #{b.displayOrder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleActive(b)}
                      title={b.isActive ? "Deactivate" : "Activate"}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${b.isActive ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${b.isActive ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b._id)}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
