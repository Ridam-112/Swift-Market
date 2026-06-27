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
  Flag, BarChart2, LogOut, Menu, X, Package, RefreshCw, Bell, BellRing, Send,
  ImageIcon, Plus, Edit2, Tag, Loader2, HelpCircle, MessageSquare, Flame, ArrowUpDown, Home,
  Layers, GripVertical, ToggleLeft, ToggleRight, Grid2X2, ScrollText, MapPin, Truck, Bike,
  type LucideIcon,
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
  image?: string;
  panNumber: string;
  gstNumber?: string;
  bankAccountHolderName?: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  upiId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  rejectionReason?: string;
  certificateType?: string;
  certificateNumber?: string;
  certificateExpiryDate?: string;
  certificateFile?: string;
  certificateStatus?: string;
  certificateRejectReason?: string;
  verificationStatus?: string;
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
  addresses?: Array<{ id?: string; label?: string; line1?: string; line2?: string; city?: string; pincode?: string }>;
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
  deliveryType?: string;
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
    return { date: label, revenue, orders: dayOrders.length };
  });
}


type AdminSection = 'overview' | 'requests' | 'shops' | 'users' | 'orders' | 'reports' | 'analytics' | 'transactions' | 'notifications' | 'hero-banners' | 'coupons' | 'commissions' | 'shop-types' | 'payouts' | 'categories' | 'product-approvals' | 'support' | 'trending-products' | 'delivery-charges' | 'home-sections' | 'service-areas' | 'delivery-partners';

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
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Go to main app">
            <Home className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 font-bold text-primary">
            <Shield className="w-4 h-4 text-primary" />
          </div>
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
              {activeSection === 'shops' && <ShopsManagementTab />}
              {activeSection === 'users' && <UsersTab />}
              {activeSection === 'orders' && <OrdersTab />}
              {activeSection === 'reports' && <ReportsTab />}
              {activeSection === 'analytics' && <AnalyticsTab />}
              {activeSection === 'transactions' && <TransactionsTab />}
              {activeSection === 'notifications' && <AdminNotificationsTab />}
              {activeSection === 'hero-banners' && <HeroBannersTab />}
              {activeSection === 'coupons' && <CouponsTab />}
              {activeSection === 'product-approvals' && <ProductApprovalsTab />}
              {activeSection === 'trending-products' && <TrendingProductsTab />}
              {activeSection === 'commissions' && <CommissionsTab />}
              {activeSection === 'shop-types' && <ShopTypesTab />}
              {activeSection === 'categories' && <CategoriesTab />}
              {activeSection === 'payouts' && <PayoutsTab />}
              {activeSection === 'support' && <SupportTicketsTab />}
              {activeSection === 'delivery-charges' && <DeliveryChargesTab />}
              {activeSection === 'home-sections' && <HomepageSectionsTab />}
              {activeSection === 'service-areas' && <ServiceAreasTab />}
              {activeSection === 'delivery-partners' && <DeliveryPartnersTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ activeSection, setActiveSection, handleLogout }: { activeSection: AdminSection, setActiveSection: (s: AdminSection) => void, handleLogout: () => void }) {
  const [, navigate] = useLocation();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const { reports, user } = useAuth();
  const openReports = reports.filter(r => r.status === 'open').length;

  useEffect(() => {
    api.get<{ success: boolean; stats: { pendingShops: number; pendingOrders: number } }>('/admin/stats')
      .then(d => {
        setPendingRequests(d.stats.pendingShops);
        setPendingOrders(d.stats.pendingOrders);
      })
      .catch(() => {});
  }, []);

  const navItems: { id: AdminSection; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'requests', label: 'Shop Requests', icon: FileText, badge: pendingRequests },
    { id: 'shops', label: 'Shops', icon: Store },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: pendingOrders },
    { id: 'reports', label: 'Reports', icon: Flag, badge: openReports },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'hero-banners', label: 'Hero Banners', icon: ImageIcon },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'product-approvals', label: 'Product Approvals', icon: Package },
    { id: 'trending-products', label: 'Trending Manager', icon: Flame },
    { id: 'commissions', label: 'Commissions', icon: Award },
    { id: 'shop-types', label: 'Shop Types', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'payouts', label: 'Payouts', icon: CreditCard },
    { id: 'support', label: 'Support Tickets', icon: HelpCircle },
  { id: 'delivery-charges', label: 'Delivery Charges', icon: Package },
  { id: 'home-sections', label: 'Home Sections', icon: Layers },
  { id: 'service-areas', label: 'Service Areas', icon: MapPin },
  { id: 'delivery-partners', label: 'Delivery Partners', icon: Truck },
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
          ID: {user?.id ?? "—"}
        </div>
        <Button variant="ghost" onClick={() => navigate("/")} className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl mb-1">
          <Home className="w-4 h-4 mr-2" /> Back to App
        </Button>
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
  const [overviewLoading, setOverviewLoading] = useState(false);

  const loadOverview = useCallback(() => {
    setOverviewLoading(true);
    Promise.all([
      api.get<{ success: boolean; stats: AdminStats }>('/admin/stats').then(d => setAdminStats(d.stats)).catch(() => {}),
      api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=200').then(d => setRecentOrders(d.orders)).catch(() => {}),
    ]).finally(() => setOverviewLoading(false));
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

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
    return activities.slice(0, 5);
  }, [recentOrders, reports, shops]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Overview</h2>
        <button onClick={loadOverview} disabled={overviewLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-card neu-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${overviewLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}
function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
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

const CERT_NAMES: Record<string, string> = {
  fssai: "FSSAI License",
  drug_license: "Drug License",
};

function ShopRequestsTab() {
  const [shops, setShops] = useState<ApiShop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [certRejectingId, setCertRejectingId] = useState<string | null>(null);
  const [certRejectReason, setCertRejectReason] = useState("");

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

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await api.post(`/shops/${id}/verify`);
      toast.success("Vendor compliance verified");
      fetchShops();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to verify");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRejectCert = async (id: string) => {
    if (!certRejectReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    try {
      await api.post(`/shops/${id}/reject-certificate`, { reason: certRejectReason });
      setCertRejectingId(null);
      setCertRejectReason("");
      toast.success("Certificate rejected — vendor notified");
      fetchShops();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject certificate");
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
          filteredApplications.map(app => {
            const rawShop = shops.find(s => s._id === app.id);
            const certName = rawShop?.certificateType ? (CERT_NAMES[rawShop.certificateType] ?? "Certificate") : null;
            return (
            <div key={app.id} className="bg-card p-6 rounded-3xl neu-card space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {rawShop?.image ? (
                    <img src={rawShop.image} alt={app.storeName} className="w-14 h-14 rounded-2xl object-cover bg-muted shrink-0 neu-card" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-muted neu-inset flex items-center justify-center shrink-0 text-2xl">🏪</div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                </div>
                
                <div className="flex flex-col gap-1.5 items-end">
                  {app.status === 'pending' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 neu-inset border-none px-3 py-1"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>}
                  {app.status === 'approved' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 neu-inset border-none px-3 py-1"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>}
                  {app.status === 'rejected' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 neu-inset border-none px-3 py-1"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>}
                  {rawShop?.verificationStatus === 'verified' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 neu-inset border-none px-3 py-1 text-xs"><Shield className="w-3 h-3 mr-1" /> Verified</Badge>}
                  {rawShop?.verificationStatus === 'pending' && app.status === 'approved' && <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 neu-inset border-none px-3 py-1 text-xs"><Clock className="w-3 h-3 mr-1" /> Unverified</Badge>}
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
                    <CreditCard className="w-4 h-4" /> Bank Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    {rawShop?.bankAccountHolderName && (
                      <>
                        <span className="text-muted-foreground">Holder:</span>
                        <span className="text-foreground font-medium">{rawShop.bankAccountHolderName}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-mono text-foreground">{app.bankAccountNumber}</span>
                    <span className="text-muted-foreground">IFSC:</span>
                    <span className="font-mono text-foreground">{app.bankIfscCode}</span>
                    {app.upiId && (
                      <>
                        <span className="text-muted-foreground">UPI:</span>
                        <span className="text-foreground">{app.upiId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {rawShop?.certificateType && (
                <div className="bg-background p-4 rounded-2xl neu-inset space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <FileText className="w-4 h-4" /> {certName}
                    </div>
                    {rawShop.certificateStatus === 'verified' && <Badge className="bg-green-100 text-green-800 text-xs border-none neu-inset px-2 py-0.5"><CheckCircle className="w-3 h-3 mr-1 inline" />Verified</Badge>}
                    {rawShop.certificateStatus === 'pending' && <Badge className="bg-amber-100 text-amber-800 text-xs border-none neu-inset px-2 py-0.5"><Clock className="w-3 h-3 mr-1 inline" />Pending review</Badge>}
                    {rawShop.certificateStatus === 'rejected' && <Badge className="bg-red-100 text-red-800 text-xs border-none neu-inset px-2 py-0.5"><XCircle className="w-3 h-3 mr-1 inline" />Rejected</Badge>}
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    {rawShop.certificateNumber && (
                      <>
                        <span className="text-muted-foreground">Number:</span>
                        <span className="font-mono text-foreground">{rawShop.certificateNumber}</span>
                      </>
                    )}
                    {rawShop.certificateExpiryDate && (
                      <>
                        <span className="text-muted-foreground">Expiry:</span>
                        <span className="text-foreground">{new Date(rawShop.certificateExpiryDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {rawShop.certificateFile && (
                    <a href={rawShop.certificateFile} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                      <Eye className="w-3.5 h-3.5" /> View Document
                    </a>
                  )}
                  {rawShop.certificateStatus === 'pending' && (
                    <div className="pt-2 flex gap-2">
                      {certRejectingId === app.id ? (
                        <div className="w-full space-y-2 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl">
                          <Textarea
                            placeholder="Reason for rejection..."
                            value={certRejectReason}
                            onChange={e => setCertRejectReason(e.target.value)}
                            className="bg-background neu-inset border-red-200 dark:border-red-900 resize-none h-16 text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setCertRejectingId(null); setCertRejectReason(""); }} className="flex-1 rounded-xl text-xs">Cancel</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectCert(app.id)} className="flex-1 bg-red-600 hover:bg-red-700 shadow-none neu-card text-white rounded-xl text-xs">Confirm Reject</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => handleVerify(app.id)} disabled={verifyingId === app.id} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none neu-card text-xs">
                            {verifyingId === app.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verifying…</> : <><CheckCircle className="w-3 h-3 mr-1" />Verify Certificate</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCertRejectingId(app.id)} className="flex-1 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/30 rounded-xl shadow-none neu-inset bg-background text-xs">
                            <XCircle className="w-3 h-3 mr-1" />Reject Doc
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!rawShop?.certificateType && app.status === 'approved' && rawShop?.verificationStatus !== 'verified' && (
                <div className="flex">
                  <Button size="sm" onClick={() => handleVerify(app.id)} disabled={verifyingId === app.id} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-none neu-card text-xs">
                    {verifyingId === app.id ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verifying…</> : <><CheckCircle className="w-3 h-3 mr-1" />Mark Vendor Verified</>}
                  </Button>
                </div>
              )}

              {app.status === 'pending' && (
                <div className="pt-2 border-t border-border space-y-3">
                  {rawShop?.certificateFile && rawShop?.certificateStatus === 'pending' && (
                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>A compliance document is pending review. Approving will automatically verify it, or you can review it above first.</span>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row gap-3">
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
                </div>
              )}

              {app.status === 'rejected' && app.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 mt-2">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{app.rejectionReason}</p>
                </div>
              )}
            </div>
            );
          })
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCustomers = () => {
    setLoadingCustomers(true);
    setFetchError(null);
    api.get<{ success: boolean; users: ApiUser[] }>('/users?role=customer&limit=500')
      .then(async usersData => {
        const allOrders: ApiOrder[] = await api
          .get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=2000')
          .then(d => d.orders ?? [])
          .catch(() => []);
        setCustomers(usersData.users.map(u => {
          const customerOrders = allOrders.filter(o => o.customerId === u._id);
          const totalSpent = customerOrders.reduce((s, o) => s + (o.netAmount ?? o.subtotal ?? 0), 0);
          return {
            id: u._id,
            name: u.name,
            phone: u.phone,
            email: u.email ?? "",
            joinedAt: u.createdAt,
            totalOrders: customerOrders.length,
            totalSpent,
            status: (u.status === 'banned' ? 'banned' : 'active') as 'active' | 'banned',
            addresses: (u.addresses ?? []).map(a => ({
              id: a.id ?? "",
              label: (a.label ?? "Home") as 'Home' | 'Work' | 'Other',
              line1: a.line1 ?? "",
              line2: a.line2,
              city: a.city ?? "",
              pincode: a.pincode ?? "",
            })),
            orders: customerOrders.map(o => ({
              id: `#${o._id.slice(-6).toUpperCase()}`,
              placedAt: o.createdAt,
              vendorId: o.shopId ?? '',
              vendorName: o.shopName ?? 'Shop',
              items: o.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, category: '' })),
              total: o.netAmount ?? o.subtotal ?? o.items.reduce((s, i) => s + i.price * i.qty, 0),
              status: (o.status ?? 'placed') as 'placed' | 'packed' | 'out_for_delivery' | 'delivered',
              paymentMethod: (o.paymentMethod ?? 'COD') as 'UPI' | 'Card' | 'COD',
            })),
          };
        }));
      })
      .catch(err => {
        setFetchError(err instanceof Error ? err.message : "Failed to load customers");
        setCustomers([]);
      })
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

  if (fetchError) {
    return (
      <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-destructive opacity-70" />
        <p className="font-medium text-foreground mb-1">Failed to load customers</p>
        <p className="text-sm mb-4">{fetchError}</p>
        <button onClick={fetchCustomers} className="text-primary text-sm font-medium underline">Retry</button>
      </div>
    );
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
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">First login:</span>{" "}
                        {new Date(c.joinedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Email:</span>{" "}{c.email || 'N/A'}
                      </p>
                      {c.addresses.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-medium text-foreground">Saved Addresses:</p>
                          {c.addresses.map((addr, idx) => (
                            <div key={addr.id || idx} className="text-xs text-muted-foreground bg-background rounded-xl px-3 py-2 neu-inset">
                              <span className="font-semibold text-foreground">{addr.label}</span>
                              {" — "}{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city} – {addr.pincode}
                            </div>
                          ))}
                        </div>
                      )}
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
      eta: "",
      image: "",
      pincode: s.address?.pincode ?? "N/A",
      city: s.address?.city ?? "N/A",
      phone: s.phone,
      status: (s.status === 'banned' ? 'banned' : 'active') as 'active' | 'banned',
      joinedAt: s.createdAt,
      revenue: s.totalRevenue ?? 0,
      commission: 0,
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
                <div className="w-16 h-16 rounded-2xl bg-primary/10 neu-inset flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-primary">{shop.storeName.charAt(0).toUpperCase()}</span>
                </div>
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
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'instant' | 'scheduled'>('all');
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
          deliveryType: (o.deliveryType === 'scheduled' ? 'scheduled' : 'instant') as 'instant' | 'scheduled',
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
    if (deliveryFilter !== 'all' && o.deliveryType !== deliveryFilter) return false;
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
        <div className="flex gap-2 shrink-0">
          {(['all', 'instant', 'scheduled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setDeliveryFilter(f)}
              className={`px-3 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all ${
                deliveryFilter === f
                  ? f === 'scheduled' ? 'bg-violet-600 text-white neu-card' : f === 'instant' ? 'bg-amber-500 text-white neu-card' : 'bg-primary text-primary-foreground neu-card'
                  : 'bg-background text-muted-foreground neu-inset'
              }`}
            >
              {f === 'all' ? '⚡ All types' : f === 'instant' ? '⚡ Instant' : '🕐 Scheduled'}
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
                  {o.deliveryType === 'scheduled' ? (
                    <Badge className="bg-violet-100 text-violet-700 border-none neu-inset px-2.5 py-0.5 dark:bg-violet-900/30 dark:text-violet-300">
                      🕐 Scheduled
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-none neu-inset px-2.5 py-0.5 dark:bg-amber-900/30 dark:text-amber-300">
                      ⚡ Instant
                    </Badge>
                  )}
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

interface AnalyticsData {
  series: { label: string; revenue: number; orders: number; newUsers: number }[];
  topProducts: { name: string; category: string; unitsSold: number; revenue: number }[];
  topShops: { shopId: string; shopName: string; totalRevenue: number; totalOrders: number }[];
}

function AnalyticsTab() {
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback((p: 'Daily' | 'Weekly' | 'Monthly') => {
    setAnalyticsLoading(true);
    api.get<{ success: boolean } & AnalyticsData>(`/admin/analytics?period=${p.toLowerCase()}`)
      .then(d => setAnalyticsData({ series: d.series, topProducts: d.topProducts, topShops: d.topShops }))
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => { loadAnalytics(period); }, [period, loadAnalytics]);

  const data = analyticsData?.series ?? [];
  const topProducts = analyticsData?.topProducts ?? [];
  const topShops = analyticsData?.topShops ?? [];

  const totalRev = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrd = data.reduce((sum, d) => sum + d.orders, 0);
  const totalNewUsers = data.reduce((sum, d) => sum + d.newUsers, 0);
  const maxUnits = topProducts.length > 0 ? topProducts[0].unitsSold : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Platform Analytics</h2>
          <button onClick={() => loadAnalytics(period)} disabled={analyticsLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-card neu-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Revenue" value={formatINR(totalRev)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Total Orders" value={totalOrd} icon={ShoppingBag} color="text-blue-600" />
        <StatCard title="New Users" value={totalNewUsers} icon={Users} color="text-purple-600" />
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
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No order data yet — top products will appear here once orders are placed.
              </div>
            ) : topProducts.map((p, i) => (
              <div key={`${p.name}-${i}`} className="space-y-2">
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
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 border-none bg-background neu-inset capitalize mt-0.5">
                      {p.category.replace('-', ' ')}
                    </Badge>
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
            <p className="text-sm text-muted-foreground">By revenue this period</p>
          </div>
          
          <div className="space-y-4">
            {topShops.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No order data yet — top shops will appear here once orders are placed.
              </div>
            ) : topShops.map((shop) => (
              <div key={shop.shopId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background neu-inset rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted neu-inset flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{shop.shopName}</p>
                    <p className="text-xs text-muted-foreground">{shop.totalOrders} orders</p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                  <p className="font-bold text-foreground">{formatINR(shop.totalRevenue)}</p>
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

  const loadTransactions = useCallback(() => {
    setTxLoading(true);
    const methodMap: Record<string, TransactionLog['method']> = { COD: 'COD', UPI: 'UPI', card: 'Card', wallet: 'UPI' };
    api.get<{ success: boolean; orders: ApiOrder[] }>('/orders?limit=2000')
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

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

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
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-foreground">Transaction Logs</h2>
        <Badge className="bg-primary/10 text-primary neu-inset border-none">{transactions.length} total</Badge>
        <button onClick={loadTransactions} disabled={txLoading} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-card neu-card text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${txLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
  pushSent: number;
  pushFailed: number;
  createdAt: string;
}

interface FcmDiagnostics {
  totalUsers: number;
  activeTokens: number;
  tokensByRole: Record<string, number>;
  tokensByPlatform: Record<string, number>;
  lastBroadcast: {
    title: string;
    pushSent: number;
    pushFailed: number;
    sentCount: number;
    createdAt: string;
  } | null;
  allTimePushSent: number;
  allTimePushFailed: number;
}

function AdminNotificationsTab() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "customers" | "vendors" | "specific">("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [diagnostics, setDiagnostics] = useState<FcmDiagnostics | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(true);

  const fetchDiagnostics = () => {
    setDiagLoading(true);
    setDiagError(null);
    api.get<{ success: boolean } & FcmDiagnostics>("/fcm/diagnostics")
      .then(d => { setDiagnostics(d); setDiagError(null); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AdminNotifications] GET /fcm/diagnostics failed:", msg);
        setDiagnostics(null);
        setDiagError(msg);
      })
      .finally(() => setDiagLoading(false));
  };

  const fetchHistory = () => {
    setLoadingHistory(true);
    setHistoryError(null);
    api.get<{ success: boolean; broadcasts: BroadcastRecord[] }>("/notifications/broadcasts")
      .then(d => { setHistory(d.broadcasts ?? []); setHistoryError(null); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AdminNotifications] GET /notifications/broadcasts failed:", msg);
        setHistory([]);
        setHistoryError(msg);
      })
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    fetchHistory();
    fetchDiagnostics();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Title and message are required"); return; }
    if (targetAudience === "specific" && !targetUserId.trim()) { toast.error("Please enter a User ID"); return; }
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; sentCount: number; pushSent: number; pushFailed: number }>("/notifications/broadcast", {
        title, message, targetAudience, targetUserId: targetAudience === "specific" ? targetUserId : undefined,
      });
      toast.success(
        `Saved to ${res.sentCount} user${res.sentCount !== 1 ? "s" : ""}` +
        (res.pushSent > 0 ? ` · FCM push sent to ${res.pushSent} device${res.pushSent !== 1 ? "s" : ""}` : " · No active FCM devices")
      );
      setTitle(""); setMessage(""); setTargetUserId("");
      fetchHistory();
      fetchDiagnostics();
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

      {/* ── FCM Diagnostics ──────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl neu-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Push Diagnostics (FCM)</h2>
              <p className="text-xs text-muted-foreground">Firebase Cloud Messaging token health</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchDiagnostics}
            disabled={diagLoading}
            className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${diagLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {diagLoading ? (
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : diagnostics ? (
          <>
            {/* Row 1 — main counts */}
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Total Users */}
              <div className="bg-background rounded-2xl neu-inset p-4 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Total Users</span>
                <span className="text-2xl font-bold text-foreground">{diagnostics.totalUsers}</span>
              </div>

              {/* Active FCM tokens */}
              <div className={`rounded-2xl neu-inset p-4 flex flex-col gap-1 ${
                diagnostics.activeTokens === 0
                  ? "bg-red-50 dark:bg-red-950/20"
                  : "bg-green-50 dark:bg-green-950/20"
              }`}>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Active Devices</span>
                <span className={`text-2xl font-bold ${diagnostics.activeTokens === 0 ? "text-red-600" : "text-green-600"}`}>
                  {diagnostics.activeTokens}
                </span>
                <span className="text-[10px] text-muted-foreground">FCM tokens</span>
              </div>

              {/* All-time sent */}
              <div className="bg-background rounded-2xl neu-inset p-4 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">All-time Sent</span>
                <span className="text-2xl font-bold text-green-600">{diagnostics.allTimePushSent}</span>
                <span className="text-[10px] text-muted-foreground">push delivered</span>
              </div>

              {/* All-time failed */}
              <div className="bg-background rounded-2xl neu-inset p-4 flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">All-time Failed</span>
                <span className="text-2xl font-bold text-red-500">{diagnostics.allTimePushFailed}</span>
                <span className="text-[10px] text-muted-foreground">push undelivered</span>
              </div>
            </div>

            {/* Row 2 — role breakdown + last delivery */}
            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* By role */}
              <div className="bg-background rounded-2xl neu-inset p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tokens by Role</p>
                {Object.keys(diagnostics.tokensByRole).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tokens registered yet</p>
                ) : (
                  <div className="space-y-2">
                    {(["customer", "vendor", "admin", "super_admin"] as const).map(role => {
                      const cnt = diagnostics.tokensByRole[role] ?? 0;
                      const max = Math.max(...Object.values(diagnostics.tokensByRole), 1);
                      return (
                        <div key={role} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 capitalize">{role.replace("_", " ")}</span>
                          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(cnt / max) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-6 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Last delivery */}
              <div className="bg-background rounded-2xl neu-inset p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Last Broadcast Result</p>
                {diagnostics.lastBroadcast ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground truncate">{diagnostics.lastBroadcast.title}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-xs text-foreground font-semibold">{diagnostics.lastBroadcast.pushSent}</span>
                        <span className="text-xs text-muted-foreground">delivered</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        <span className="text-xs text-foreground font-semibold">{diagnostics.lastBroadcast.pushFailed}</span>
                        <span className="text-xs text-muted-foreground">failed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-xs text-foreground font-semibold">{diagnostics.lastBroadcast.sentCount}</span>
                        <span className="text-xs text-muted-foreground">in-app</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(diagnostics.lastBroadcast.createdAt).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No broadcasts yet</p>
                )}
              </div>
            </div>

            {diagnostics.activeTokens === 0 && (
              <div className="mx-5 mb-5 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3">
                <span className="text-amber-600 text-base shrink-0">⚠️</span>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>No active FCM tokens.</strong> Users need to open the Notifications page and tap "Enable" to register their device. Push notifications won't deliver until at least one device is registered.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-5 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-red-500 mb-1">Failed to load diagnostics</p>
            {diagError && <p className="text-xs font-mono bg-muted rounded px-2 py-1 mt-1 break-all">{diagError}</p>}
          </div>
        )}
      </div>

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
                placeholder="Paste user ID (UUID)"
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
        ) : historyError ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-red-500 mb-1">Failed to load broadcast history</p>
            <p className="text-xs font-mono bg-muted rounded px-2 py-1 mt-1 break-all">{historyError}</p>
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">
                      📥 {b.sentCount} in-app
                    </span>
                    {(b.pushSent ?? 0) > 0 && (
                      <span className="text-[11px] text-green-600 font-medium">
                        🔔 {b.pushSent} push sent
                      </span>
                    )}
                    {(b.pushFailed ?? 0) > 0 && (
                      <span className="text-[11px] text-red-500 font-medium">
                        ✗ {b.pushFailed} push failed
                      </span>
                    )}
                    {(b.pushSent ?? 0) === 0 && (b.pushFailed ?? 0) === 0 && (
                      <span className="text-[11px] text-muted-foreground">no push devices</span>
                    )}
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

// ─── Coupons Tab ─────────────────────────────────────────────────────────────

interface ApiCoupon {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimumOrder: number;
  maximumDiscount?: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  appliesTo: string;
  createdAt: string;
}

type CouponForm = {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  minimumOrder: string;
  maximumDiscount: string;
  expiryDate: string;
  usageLimit: string;
  isActive: boolean;
};

const emptyCouponForm = (): CouponForm => ({
  code: '',
  type: 'percentage',
  value: '',
  minimumOrder: '0',
  maximumDiscount: '',
  expiryDate: '',
  usageLimit: '0',
  isActive: true,
});

function CouponsTab() {
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; coupons: ApiCoupon[] }>('/coupons');
      setCoupons(data.coupons);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCouponForm());
    setShowForm(true);
  };

  const openEdit = (c: ApiCoupon) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minimumOrder: String(c.minimumOrder),
      maximumDiscount: c.maximumDiscount != null ? String(c.maximumDiscount) : '',
      expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '',
      usageLimit: String(c.usageLimit),
      isActive: c.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Coupon code is required'); return; }
    if (!form.value || Number(form.value) <= 0) { toast.error('Discount value must be positive'); return; }
    if (!form.expiryDate) { toast.error('Expiry date is required'); return; }
    if (form.type === 'percentage' && Number(form.value) > 100) { toast.error('Percentage cannot exceed 100'); return; }

    setSaving(true);
    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: Number(form.value),
      minimumOrder: Number(form.minimumOrder) || 0,
      expiryDate: form.expiryDate,
      usageLimit: Number(form.usageLimit) || 0,
      isActive: form.isActive,
    };
    if (form.type === 'percentage' && form.maximumDiscount) {
      payload.maximumDiscount = Number(form.maximumDiscount);
    }

    try {
      if (editingId) {
        await api.patch<{ success: boolean }>(`/coupons/${editingId}`, payload);
        toast.success('Coupon updated');
      } else {
        await api.post<{ success: boolean }>('/coupons', payload);
        toast.success('Coupon created');
      }
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: ApiCoupon) => {
    try {
      await api.patch<{ success: boolean }>(`/coupons/${c._id}`, { isActive: !c.isActive });
      setCoupons(prev => prev.map(x => x._id === c._id ? { ...x, isActive: !c.isActive } : x));
      toast.success(c.isActive ? 'Coupon disabled' : 'Coupon enabled');
    } catch {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete<{ success: boolean }>(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c._id !== id));
      setDeleteConfirm(null);
      toast.success('Coupon deleted');
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const setField = <K extends keyof CouponForm>(k: K, v: CouponForm[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const typeLabel = (t: string) => t === 'percentage' ? 'Percentage' : t === 'fixed' ? 'Flat' : 'Free Delivery';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Coupons</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage discount coupons for the platform</p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Coupon
        </Button>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-card rounded-3xl neu-card p-6 space-y-5"
          >
            <h3 className="font-bold text-foreground text-lg">
              {editingId ? 'Edit Coupon' : 'Create Coupon'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Coupon Code <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.code}
                  onChange={e => setField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. SAVE20"
                  disabled={!!editingId}
                  className="bg-background neu-inset border-none font-mono tracking-widest uppercase"
                />
                {editingId && (
                  <p className="text-xs text-muted-foreground mt-1">Code cannot be changed after creation.</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-sm font-medium block mb-1">Discount Type <span className="text-destructive">*</span></label>
                <select
                  value={form.type}
                  onChange={e => setField('type', e.target.value as 'percentage' | 'fixed')}
                  disabled={!!editingId}
                  className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Flat (₹)</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Discount Value <span className="text-destructive">*</span>
                  <span className="ml-1 text-muted-foreground font-normal">
                    ({form.type === 'percentage' ? '%' : '₹'})
                  </span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={form.type === 'percentage' ? 100 : undefined}
                  value={form.value}
                  onChange={e => setField('value', e.target.value)}
                  placeholder={form.type === 'percentage' ? '10' : '50'}
                  className="bg-background neu-inset border-none"
                />
              </div>

              {/* Min order */}
              <div>
                <label className="text-sm font-medium block mb-1">Minimum Order (₹)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.minimumOrder}
                  onChange={e => setField('minimumOrder', e.target.value)}
                  placeholder="0"
                  className="bg-background neu-inset border-none"
                />
              </div>

              {/* Max discount — percentage only */}
              {form.type === 'percentage' && (
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Max Discount (₹)
                    <span className="ml-1 text-muted-foreground font-normal text-xs">optional cap</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maximumDiscount}
                    onChange={e => setField('maximumDiscount', e.target.value)}
                    placeholder="e.g. 200"
                    className="bg-background neu-inset border-none"
                  />
                </div>
              )}

              {/* Expiry */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Expiry Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.expiryDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setField('expiryDate', e.target.value)}
                  className="bg-background neu-inset border-none"
                />
              </div>

              {/* Usage limit */}
              <div>
                <label className="text-sm font-medium block mb-1">
                  Usage Limit
                  <span className="ml-1 text-muted-foreground font-normal text-xs">0 = unlimited</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={e => setField('usageLimit', e.target.value)}
                  placeholder="0"
                  className="bg-background neu-inset border-none"
                />
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-3 self-end pb-1">
                <button
                  type="button"
                  onClick={() => setField('isActive', !form.isActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.isActive ? 'Active — usable by customers' : 'Inactive — disabled'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : editingId ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coupon list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No coupons yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first coupon to offer discounts to customers.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">All Coupons ({coupons.length})</h3>
            <span className="text-xs text-muted-foreground">Latest first</span>
          </div>

          {/* Table header — desktop */}
          <div className="hidden md:grid grid-cols-[1fr_90px_90px_100px_100px_80px_80px_110px] gap-3 px-5 py-3 border-b border-border/50 bg-muted/30">
            {['Code', 'Type', 'Value', 'Min Order', 'Expiry', 'Limit', 'Used', 'Status / Actions'].map(h => (
              <span key={h} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border/50">
            {coupons.map(c => {
              const expired = new Date(c.expiryDate) < new Date();
              const exhausted = c.usageLimit > 0 && c.usedCount >= c.usageLimit;
              const isDeleting = deleteConfirm === c._id;

              return (
                <div key={c._id}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_90px_90px_100px_100px_80px_80px_110px] gap-3 px-5 py-4 items-center">
                    <span className="font-mono font-bold text-sm text-foreground tracking-wider">{c.code}</span>
                    <span className="text-sm text-muted-foreground">{typeLabel(c.type)}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {c.type === 'percentage' ? `${c.value}%` : formatINR(c.value)}
                      {c.type === 'percentage' && c.maximumDiscount ? <span className="text-xs text-muted-foreground font-normal ml-1">max {formatINR(c.maximumDiscount)}</span> : null}
                    </span>
                    <span className="text-sm text-muted-foreground">{c.minimumOrder > 0 ? formatINR(c.minimumOrder) : '—'}</span>
                    <span className={`text-sm ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {new Date(c.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-sm text-muted-foreground">{c.usageLimit > 0 ? c.usageLimit : '∞'}</span>
                    <span className={`text-sm font-semibold ${exhausted ? 'text-destructive' : 'text-foreground'}`}>{c.usedCount}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge className={`text-[10px] border-none px-2 py-0 shrink-0 ${
                        expired ? 'bg-red-500/10 text-red-600' :
                        exhausted ? 'bg-amber-500/10 text-amber-600' :
                        c.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {expired ? 'Expired' : exhausted ? 'Exhausted' : c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {!expired && (
                        <button
                          onClick={() => handleToggleActive(c)}
                          title={c.isActive ? 'Disable' : 'Enable'}
                          className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 shrink-0 ${c.isActive ? 'bg-primary' : 'bg-muted'}`}
                          style={{ height: '18px', width: '32px' }}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform duration-200 ${c.isActive ? 'translate-x-3.5' : 'translate-x-0'}`} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c._id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-base text-foreground tracking-wider">{c.code}</span>
                      <Badge className={`text-[10px] border-none px-2 py-0 ${
                        expired ? 'bg-red-500/10 text-red-600' :
                        exhausted ? 'bg-amber-500/10 text-amber-600' :
                        c.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {expired ? 'Expired' : exhausted ? 'Exhausted' : c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>{typeLabel(c.type)} · {c.type === 'percentage' ? `${c.value}%` : formatINR(c.value)}</span>
                      {c.minimumOrder > 0 && <span>Min {formatINR(c.minimumOrder)}</span>}
                      <span className={expired ? 'text-destructive' : ''}>
                        Expires {new Date(c.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      <span>Used {c.usedCount}{c.usageLimit > 0 ? `/${c.usageLimit}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {!expired && (
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${c.isActive ? 'bg-primary' : 'bg-muted'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${c.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      )}
                      <button onClick={() => openEdit(c)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirm(c._id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Delete confirm inline */}
                  {isDeleting && (
                    <div className="px-5 py-3 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                      <span className="text-sm text-destructive font-medium">Delete coupon <span className="font-mono font-bold">{c.code}</span>? This cannot be undone.</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-lg h-8">Cancel</Button>
                        <Button size="sm" onClick={() => handleDelete(c._id)} className="rounded-lg h-8 bg-destructive text-white hover:bg-destructive/90 shadow-none">Delete</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHOPS MANAGEMENT TAB
// ============================================================================

interface ApiShopFull {
  _id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  ownerId: string;
  shopType: string;
  category?: string;
  description?: string;
  image?: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  address?: { line1?: string; city?: string; pincode?: string; state?: string };
  createdAt: string;
}

interface ApiProductFull {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  category: string;
  shopId: string;
  images: string[];
  stock: number;
  unit?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  trending: boolean;
  createdAt: string;
}

type ShopForm = {
  shopName: string;
  ownerPhone: string;
  ownerName: string;
  addressLine1: string;
  addressCity: string;
  addressPincode: string;
  shopType: string;
  description: string;
  isOpen: boolean;
  image: string;
};

const emptyShopForm = (): ShopForm => ({
  shopName: '', ownerPhone: '', ownerName: '', addressLine1: '',
  addressCity: '', addressPincode: '', shopType: 'groceries',
  description: '', isOpen: true, image: '',
});

type ProductForm = {
  name: string;
  description: string;
  price: string;
  discountedPrice: string;
  category: string;
  stock: string;
  unit: string;
  status: 'active' | 'inactive';
  imageUrl: string;
};

const emptyProductForm = (): ProductForm => ({
  name: '', description: '', price: '', discountedPrice: '',
  category: 'groceries', stock: '0', unit: 'piece', status: 'active', imageUrl: '',
});

function ShopsManagementTab() {
  const [subView, setSubView] = useState<'shops' | 'products'>('shops');
  const [selectedShop, setSelectedShop] = useState<ApiShopFull | null>(null);

  if (subView === 'products' && selectedShop) {
    return (
      <ShopProductsPanel
        shop={selectedShop}
        onBack={() => { setSubView('shops'); setSelectedShop(null); }}
      />
    );
  }

  return (
    <ShopListPanel
      onManageProducts={(shop) => { setSelectedShop(shop); setSubView('products'); }}
    />
  );
}

function ShopListPanel({ onManageProducts }: { onManageProducts: (shop: ApiShopFull) => void }) {
  const [shops, setShops] = useState<ApiShopFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'banned'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShopForm>(emptyShopForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changingOwnerId, setChangingOwnerId] = useState<string | null>(null);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerNameInput, setOwnerNameInput] = useState('');
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; shops: ApiShopFull[] }>('/shops?limit=200');
      setShops(data.shops);
    } catch {
      toast.error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredShops = useMemo(() => shops.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.shopName.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.phone.includes(q);
    }
    return true;
  }), [shops, statusFilter, search]);

  const setF = <K extends keyof ShopForm>(k: K, v: ShopForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyShopForm());
    setShowForm(true);
    setChangingOwnerId(null);
  };

  const openEdit = (s: ApiShopFull) => {
    setEditingId(s._id);
    setForm({
      shopName: s.shopName,
      ownerPhone: s.phone,
      ownerName: s.ownerName,
      addressLine1: s.address?.line1 ?? '',
      addressCity: s.address?.city ?? '',
      addressPincode: s.address?.pincode ?? '',
      shopType: s.shopType,
      description: s.description ?? '',
      isOpen: s.isOpen,
      image: s.image ?? '',
    });
    setShowForm(true);
    setChangingOwnerId(null);
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { access } = api.getTokens();
      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access ?? ''}` },
        body: fd,
      });
      const data = await res.json() as { success: boolean; imageUrl: string };
      if (data.success) setF('image', data.imageUrl);
      else toast.error('Upload failed');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingLogo(false); }
  };

  const handleSave = async () => {
    if (!form.shopName.trim()) { toast.error('Shop name is required'); return; }
    if (!form.ownerPhone.trim()) { toast.error('Owner phone is required'); return; }
    if (!form.ownerName.trim()) { toast.error('Owner name is required'); return; }
    if (!form.addressLine1.trim() || !form.addressCity.trim() || !form.addressPincode.trim()) {
      toast.error('Full address (line, city, pincode) is required'); return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/shops/${editingId}`, {
          shopName: form.shopName,
          ownerName: form.ownerName,
          phone: form.ownerPhone,
          shopType: form.shopType,
          category: form.shopType,
          description: form.description,
          isOpen: form.isOpen,
          image: form.image || undefined,
          address: { line1: form.addressLine1, city: form.addressCity, pincode: form.addressPincode },
        });
        toast.success('Shop updated');
      } else {
        await api.post('/shops/admin-create', {
          shopName: form.shopName,
          ownerName: form.ownerName,
          phone: form.ownerPhone,
          shopType: form.shopType,
          category: form.shopType,
          description: form.description,
          image: form.image || undefined,
          address: { line1: form.addressLine1, city: form.addressCity, pincode: form.addressPincode },
        });
        toast.success('Shop created and owner account set up');
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOpen = async (shop: ApiShopFull) => {
    setTogglingId(shop._id);
    try {
      await api.patch(`/shops/${shop._id}/toggle-open`, {});
      setShops(prev => prev.map(s => s._id === shop._id ? { ...s, isOpen: !s.isOpen } : s));
      toast.success(shop.isOpen ? 'Shop closed' : 'Shop opened');
    } catch (e) {
      toast.error((e as Error).message ?? 'Failed to toggle');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/shops/${id}`);
      setShops(prev => prev.filter(s => s._id !== id));
      setDeleteConfirm(null);
      toast.success('Shop deleted');
    } catch {
      toast.error('Failed to delete shop');
    }
  };

  const handleChangeOwner = async (shopId: string) => {
    if (!ownerPhone.trim()) { toast.error('Phone is required'); return; }
    setOwnerSaving(true);
    try {
      await api.patch(`/shops/${shopId}/owner`, {
        phone: ownerPhone.trim(),
        ownerName: ownerNameInput.trim() || undefined,
      });
      toast.success('Owner changed successfully');
      setChangingOwnerId(null);
      setOwnerPhone('');
      setOwnerNameInput('');
      load();
    } catch (e) {
      toast.error((e as Error).message ?? 'Failed to change owner');
    } finally {
      setOwnerSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    approved: 'bg-emerald-500/10 text-emerald-600',
    pending: 'bg-amber-500/10 text-amber-600',
    rejected: 'bg-red-500/10 text-red-600',
    banned: 'bg-slate-500/10 text-slate-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Shop Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Create, edit and manage all shops on the platform</p>
        </div>
        <Button
          onClick={openCreate}
          className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Shop
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, owner or phone…"
            className="pl-9 bg-background neu-inset border-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'approved', 'pending', 'rejected', 'banned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground neu-card'
                  : 'bg-background neu-inset text-muted-foreground hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-card rounded-3xl neu-card p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Shop' : 'Create New Shop'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Shop Logo</label>
              {form.image ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border/50">
                  <img src={form.image} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    onClick={() => setF('image', '')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl p-5 cursor-pointer hover:border-primary/60 transition-colors text-center w-24 h-24">
                  {uploadingLogo ? (
                    <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                      <span className="text-[10px] text-muted-foreground leading-tight">Upload logo</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                    disabled={uploadingLogo}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Shop Name <span className="text-destructive">*</span></label>
                <Input value={form.shopName} onChange={e => setF('shopName', e.target.value)} placeholder="e.g. Fresh Mart" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category / Type <span className="text-destructive">*</span></label>
                <select
                  value={form.shopType}
                  onChange={e => setF('shopType', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Owner Phone <span className="text-destructive">*</span></label>
                <Input
                  value={form.ownerPhone}
                  onChange={e => setF('ownerPhone', e.target.value)}
                  placeholder="10-digit mobile number"
                  className="bg-background neu-inset border-none"
                  disabled={!!editingId}
                />
                {editingId && <p className="text-xs text-muted-foreground mt-1">Use "Change Owner" in the list to reassign ownership.</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Owner Name <span className="text-destructive">*</span></label>
                <Input value={form.ownerName} onChange={e => setF('ownerName', e.target.value)} placeholder="Owner full name" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Address Line 1 <span className="text-destructive">*</span></label>
                <Input value={form.addressLine1} onChange={e => setF('addressLine1', e.target.value)} placeholder="Street / Area / Locality" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">City <span className="text-destructive">*</span></label>
                <Input value={form.addressCity} onChange={e => setF('addressCity', e.target.value)} placeholder="City" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Pincode <span className="text-destructive">*</span></label>
                <Input value={form.addressPincode} onChange={e => setF('addressPincode', e.target.value)} placeholder="e.g. 733101" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Short shop description" className="bg-background neu-inset border-none" />
              </div>
              <div className="flex items-center gap-3 self-end pb-1">
                <button
                  type="button"
                  onClick={() => setF('isOpen', !form.isOpen)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isOpen ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.isOpen ? 'Open for orders' : 'Closed'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploadingLogo}
                className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : editingId ? 'Update Shop' : 'Create Shop'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : filteredShops.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No shops found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== 'all' ? 'Try clearing your filters.' : 'Click "New Shop" to create the first shop.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">All Shops ({filteredShops.length})</h3>
            <button onClick={load} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {filteredShops.map(shop => {
              const isDeleting = deleteConfirm === shop._id;
              const isChangingOwner = changingOwnerId === shop._id;
              const isToggling = togglingId === shop._id;
              return (
                <div key={shop._id}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/50">
                        {shop.image
                          ? <img src={shop.image} alt={shop.shopName} className="w-full h-full object-cover" />
                          : <Store className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{shop.shopName}</p>
                        <p className="text-xs text-muted-foreground truncate">{shop.ownerName} · {shop.phone}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[shop.address?.city, shop.address?.pincode].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Badge className={`text-[10px] border-none px-2 py-0 capitalize ${statusColors[shop.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {shop.status}
                      </Badge>
                      <Badge className={`text-[10px] border-none px-2 py-0 ${shop.isOpen ? 'bg-green-500/10 text-green-600' : 'bg-slate-500/10 text-slate-500'}`}>
                        {shop.isOpen ? 'Open' : 'Closed'}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{shop.totalOrders ?? 0} orders</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {shop.status === 'approved' && (
                        <button
                          onClick={() => handleToggleOpen(shop)}
                          disabled={isToggling}
                          title={shop.isOpen ? 'Close shop' : 'Open shop'}
                          className={`p-2 rounded-xl transition-colors ${shop.isOpen ? 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500' : 'hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600'}`}
                        >
                          {isToggling ? <RefreshCw className="w-4 h-4 animate-spin" /> : shop.isOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => onManageProducts(shop)} title="Manage products" className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setChangingOwnerId(isChangingOwner ? null : shop._id); setOwnerPhone(''); setOwnerNameInput(''); }}
                        title="Change owner"
                        className={`p-2 rounded-xl hover:bg-muted transition-colors ${isChangingOwner ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                      >
                        <User className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(shop)} title="Edit" className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(shop._id)} title="Delete" className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isChangingOwner && (
                    <div className="px-4 pb-4 bg-muted/30 border-t border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2">Assign New Owner</p>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[160px]">
                          <label className="text-xs font-medium block mb-1">New Owner Phone <span className="text-destructive">*</span></label>
                          <Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="10-digit phone" className="bg-background neu-inset border-none h-9 text-sm" />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                          <label className="text-xs font-medium block mb-1">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <Input value={ownerNameInput} onChange={e => setOwnerNameInput(e.target.value)} placeholder="Auto-filled if account exists" className="bg-background neu-inset border-none h-9 text-sm" />
                        </div>
                        <Button size="sm" onClick={() => handleChangeOwner(shop._id)} disabled={ownerSaving} className="rounded-xl h-9 shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
                          {ownerSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Assign'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setChangingOwnerId(null)} className="rounded-xl h-9">Cancel</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">A new vendor account will be created automatically if the phone doesn't exist.</p>
                    </div>
                  )}

                  {isDeleting && (
                    <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                      <span className="text-sm text-destructive font-medium">Delete <span className="font-bold">{shop.shopName}</span>? All products will also be removed.</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-lg h-8">Cancel</Button>
                        <Button size="sm" onClick={() => handleDelete(shop._id)} className="rounded-lg h-8 bg-destructive text-white hover:bg-destructive/90 shadow-none">Delete</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type CommForm = { type: 'percentage' | 'fixed'; rate: string; isActive: boolean };
const emptyCommForm = (): CommForm => ({ type: 'percentage', rate: '', isActive: true });

function ShopProductsPanel({ shop, onBack }: { shop: ApiShopFull; onBack: () => void }) {
  const [products, setProducts] = useState<ApiProductFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState('');

  // Per-product commission state
  const [productRules, setProductRules] = useState<Record<string, CommissionRuleRecord | undefined>>({});
  const [commEditId, setCommEditId] = useState<string | null>(null);
  const [commForm, setCommForm] = useState<CommForm>(emptyCommForm());
  const [commSaving, setCommSaving] = useState<string | null>(null);

  const loadCommissions = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0) return;
    try {
      const data = await api.get<{ success: boolean; rules: CommissionRuleRecord[] }>('/commissions?level=product');
      const map: Record<string, CommissionRuleRecord | undefined> = {};
      for (const r of data.rules ?? []) {
        if (r.targetId && productIds.includes(r.targetId)) {
          map[r.targetId] = r;
        }
      }
      setProductRules(map);
    } catch { /* non-fatal */ }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; products: ApiProductFull[] }>(
        `/products?shopId=${shop._id}&status=all&limit=200`
      );
      setProducts(data.products);
      await loadCommissions(data.products.map(p => p._id));
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [shop._id, loadCommissions]);

  const openCommEdit = (p: ApiProductFull) => {
    const rule = productRules[p._id];
    setCommForm(rule
      ? { type: rule.type, rate: String(rule.rate), isActive: rule.isActive }
      : emptyCommForm()
    );
    setCommEditId(p._id);
  };

  const handleSaveCommission = async (p: ApiProductFull) => {
    const rate = Number(commForm.rate);
    if (isNaN(rate) || rate < 0) { toast.error('Enter a valid commission rate'); return; }
    setCommSaving(p._id);
    try {
      const existingRule = productRules[p._id];
      if (existingRule) {
        await api.patch(`/commissions/${existingRule._id}`, { type: commForm.type, rate, isActive: commForm.isActive });
        toast.success('Commission updated');
      } else {
        await api.post('/commissions', {
          level: 'product',
          type: commForm.type,
          rate,
          isActive: commForm.isActive,
          targetId: p._id,
          targetName: p.name,
        });
        toast.success('Product commission set');
      }
      setCommEditId(null);
      await loadCommissions(products.map(q => q._id));
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setCommSaving(null);
    }
  };

  const handleRemoveCommission = async (p: ApiProductFull) => {
    const rule = productRules[p._id];
    if (!rule) return;
    setCommSaving(p._id);
    try {
      await api.delete(`/commissions/${rule._id}`);
      toast.success('Product commission removed');
      setCommEditId(null);
      setProductRules(prev => { const n = { ...prev }; delete n[p._id]; return n; });
    } catch {
      toast.error('Remove failed');
    } finally {
      setCommSaving(null);
    }
  };

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const setF = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm(emptyProductForm()); setShowForm(true); };

  const openEdit = (p: ApiProductFull) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      discountedPrice: p.discountedPrice != null ? String(p.discountedPrice) : '',
      category: p.category,
      stock: String(p.stock),
      unit: p.unit ?? 'piece',
      status: p.status === 'inactive' ? 'inactive' : 'active',
      imageUrl: p.images?.[0] ?? '',
    });
    setShowForm(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { access } = api.getTokens();
      const res = await fetch('/api/upload/product-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access ?? ''}` },
        body: fd,
      });
      const data = await res.json() as { success: boolean; imageUrl: string };
      if (data.success) setF('imageUrl', data.imageUrl);
      else toast.error('Upload failed');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingImage(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error('Price must be a positive number'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined,
      category: form.category,
      stock: Number(form.stock) || 0,
      unit: form.unit.trim() || 'piece',
      status: form.status,
      images: form.imageUrl ? [form.imageUrl] : [],
      shopId: shop._id,
    };
    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product added');
      }
      setShowForm(false);
      loadProducts();
    } catch (e) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      setDeleteConfirm(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleUpdateStock = async (productId: string) => {
    const stock = parseInt(stockInput);
    if (isNaN(stock) || stock < 0) { toast.error('Invalid stock value'); return; }
    try {
      await api.patch(`/products/${productId}`, { stock });
      setProducts(prev => prev.map(p => p._id === productId ? { ...p, stock } : p));
      setEditingStockId(null);
      toast.success('Stock updated');
    } catch {
      toast.error('Failed to update stock');
    }
  };

  const statusBadgeClass = (s: string) => {
    if (s === 'active') return 'bg-emerald-500/10 text-emerald-600';
    if (s === 'out_of_stock') return 'bg-amber-500/10 text-amber-600';
    return 'bg-slate-500/10 text-slate-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Back to shops">
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{shop.shopName}</h2>
              <Badge className={`text-[10px] border-none px-2 ${shop.isOpen ? 'bg-green-500/10 text-green-600' : 'bg-slate-500/10 text-slate-500'}`}>
                {shop.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Product Management · {shop.ownerName}</p>
          </div>
        </div>
        <Button onClick={openCreate} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-card rounded-3xl neu-card p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">Product Image</label>
              {form.imageUrl ? (
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-border/50">
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors" onClick={() => setF('imageUrl', '')}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl p-5 cursor-pointer hover:border-primary/60 transition-colors text-center w-28 h-28">
                  {uploadingImage ? <RefreshCw className="w-6 h-6 text-primary animate-spin" /> : <><ImageIcon className="w-7 h-7 text-muted-foreground/50" /><span className="text-xs text-muted-foreground">Upload</span></>}
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} disabled={uploadingImage} />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Product Name <span className="text-destructive">*</span></label>
                <Input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Basmati Rice 1kg" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category <span className="text-destructive">*</span></label>
                <select value={form.category} onChange={e => setF('category', e.target.value)} className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Price (₹) <span className="text-destructive">*</span></label>
                <Input type="number" min={0} value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Discounted Price (₹) <span className="text-muted-foreground font-normal text-xs">optional</span></label>
                <Input type="number" min={0} value={form.discountedPrice} onChange={e => setF('discountedPrice', e.target.value)} placeholder="Leave blank for no discount" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Stock</label>
                <Input type="number" min={0} value={form.stock} onChange={e => setF('stock', e.target.value)} placeholder="0" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Unit</label>
                <Input value={form.unit} onChange={e => setF('unit', e.target.value)} placeholder="kg / piece / litre / pack" className="bg-background neu-inset border-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1">Description</label>
                <Input value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Brief product description" className="bg-background neu-inset border-none" />
              </div>
              <div className="flex items-center gap-3 self-end pb-1">
                <button
                  type="button"
                  onClick={() => setF('status', form.status === 'active' ? 'inactive' : 'active')}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.status === 'active' ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.status === 'active' ? 'Active — visible to customers' : 'Inactive — hidden'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || uploadingImage} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : editingId ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : products.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Add Product" to list the first product for this shop.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">Products ({products.length})</h3>
            <button onClick={loadProducts} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {products.map(p => {
              const isDeleting = deleteConfirm === p._id;
              const isEditingStock = editingStockId === p._id;
              const cat = categories.find((c: { id: string }) => c.id === p.category);
              return (
                <div key={p._id}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50 flex items-center justify-center">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{(cat as { emoji?: string })?.emoji ?? ''} {(cat as { name?: string })?.name ?? p.category} · {p.unit ?? 'piece'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {p.discountedPrice ? (
                            <>{formatINR(p.discountedPrice)} <span className="text-muted-foreground line-through font-normal">{formatINR(p.price)}</span></>
                          ) : formatINR(p.price)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 hidden sm:block">
                      {isEditingStock ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} value={stockInput}
                            onChange={e => setStockInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleUpdateStock(p._id); if (e.key === 'Escape') setEditingStockId(null); }}
                            className="w-20 h-8 text-sm bg-background neu-inset border-none text-center"
                            autoFocus
                          />
                          <button onClick={() => handleUpdateStock(p._id)} className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingStockId(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingStockId(p._id); setStockInput(String(p.stock)); }}
                          className="text-sm font-semibold hover:text-primary transition-colors text-right"
                          title="Click to edit stock"
                        >
                          {p.stock}<span className="text-xs font-normal text-muted-foreground ml-1">in stock</span>
                        </button>
                      )}
                    </div>
                    <Badge className={`text-[10px] border-none px-2 py-0 shrink-0 hidden md:flex ${statusBadgeClass(p.status)}`}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(p)} title="Edit product" className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button
                        onClick={() => commEditId === p._id ? setCommEditId(null) : openCommEdit(p)}
                        title="Set product commission"
                        className={`p-2 rounded-xl transition-colors ${commEditId === p._id ? 'bg-primary/10 text-primary' : productRules[p._id] ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        <Award className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(p._id)} title="Delete" className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Inline commission editor */}
                  {commEditId === p._id && (
                    <div className="mx-4 mb-3 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-primary">Product Commission</p>
                        {productRules[p._id] && (
                          <button
                            onClick={() => handleRemoveCommission(p)}
                            disabled={commSaving === p._id}
                            className="text-xs text-destructive hover:underline disabled:opacity-50"
                          >
                            Remove rule
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={commForm.type}
                          onChange={e => setCommForm(f => ({ ...f, type: e.target.value as 'percentage' | 'fixed' }))}
                          className="h-8 px-2 rounded-lg bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer"
                        >
                          <option value="percentage">% Percentage</option>
                          <option value="fixed">₹ Fixed</option>
                        </select>
                        <Input
                          type="number"
                          min={0}
                          step={commForm.type === 'percentage' ? '0.1' : '1'}
                          value={commForm.rate}
                          onChange={e => setCommForm(f => ({ ...f, rate: e.target.value }))}
                          placeholder={commForm.type === 'percentage' ? 'e.g. 12' : 'e.g. 50'}
                          className="w-28 h-8 text-sm bg-background neu-inset border-none text-center"
                        />
                        <span className="text-xs text-muted-foreground">{commForm.type === 'percentage' ? '%' : '₹'}</span>
                        <button
                          type="button"
                          onClick={() => setCommForm(f => ({ ...f, isActive: !f.isActive }))}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ${commForm.isActive ? 'bg-primary' : 'bg-muted'}`}
                          title={commForm.isActive ? 'Enabled' : 'Disabled'}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${commForm.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                        <span className="text-xs text-muted-foreground">{commForm.isActive ? 'Active' : 'Disabled'}</span>
                        <div className="flex gap-1.5 ml-auto">
                          <Button size="sm" variant="outline" onClick={() => setCommEditId(null)} className="rounded-lg h-8 text-xs">Cancel</Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveCommission(p)}
                            disabled={commSaving === p._id || !commForm.rate}
                            className="rounded-lg h-8 text-xs shadow-none bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {commSaving === p._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Save'}
                          </Button>
                        </div>
                      </div>
                      {productRules[p._id] && (
                        <p className="text-[11px] text-muted-foreground">
                          Current: {productRules[p._id]!.type === 'fixed'
                            ? `₹${productRules[p._id]!.rate} fixed`
                            : `${productRules[p._id]!.rate}% of item total`
                          } · {productRules[p._id]!.isActive ? 'Active' : 'Disabled'}
                        </p>
                      )}
                    </div>
                  )}

                  {isDeleting && (
                    <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                      <span className="text-sm text-destructive font-medium">Delete <span className="font-bold">{p.name}</span>?</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-lg h-8">Cancel</Button>
                        <Button size="sm" onClick={() => handleDelete(p._id)} className="rounded-lg h-8 bg-destructive text-white hover:bg-destructive/90 shadow-none">Delete</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMMISSIONS TAB
// ============================================================================

interface CommissionRuleRecord {
  _id: string;
  level: "global" | "shop_type" | "category" | "vendor" | "product";
  type: "percentage" | "fixed";
  targetId?: string;
  targetName?: string;
  rate: number;
  isActive: boolean;
  createdAt: string;
}

const LEVEL_LABELS: Record<string, string> = {
  global: "Global (all orders)",
  shop_type: "Shop Type",
  category: "Category",
  vendor: "Vendor / Shop",
  product: "Product",
};

function levelBadgeClass(level: string) {
  switch (level) {
    case "global": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "shop_type": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "category": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "vendor": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "product": return "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300";
    default: return "bg-muted text-muted-foreground";
  }
}

const BLANK_RULE = { level: "global" as CommissionRuleRecord["level"], type: "percentage" as CommissionRuleRecord["type"], targetId: "", targetName: "", rate: "5", isActive: true };

function CommissionsTab() {
  const [rules, setRules] = useState<CommissionRuleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK_RULE);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ success: boolean; rules: CommissionRuleRecord[] }>("/commissions");
      setRules(d.rules ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setF = <K extends keyof typeof BLANK_RULE>(k: K, v: (typeof BLANK_RULE)[K]) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(BLANK_RULE); setEditingId(null); setShowForm(true); };
  const openEdit = (r: CommissionRuleRecord) => {
    setForm({ level: r.level, type: r.type ?? "percentage", targetId: r.targetId ?? "", targetName: r.targetName ?? "", rate: String(r.rate), isActive: r.isActive });
    setEditingId(r._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.rate || isNaN(Number(form.rate)) || Number(form.rate) < 0) { toast.error("Enter a valid rate"); return; }
    if (form.level !== "global" && !form.targetId.trim() && !form.targetName.trim()) { toast.error("Target ID or name required for non-global rules"); return; }
    setSaving(true);
    try {
      const payload = { level: form.level, type: form.type, targetId: form.targetId || undefined, targetName: form.targetName || undefined, rate: Number(form.rate), isActive: form.isActive };
      if (editingId) { await api.patch(`/commissions/${editingId}`, payload); toast.success("Rule updated"); }
      else { await api.post("/commissions", payload); toast.success("Rule created"); }
      setShowForm(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/commissions/${id}`); toast.success("Rule deleted"); setDeleteConfirmId(null); load(); }
    catch { toast.error("Delete failed"); }
  };

  const handleToggleActive = async (r: CommissionRuleRecord) => {
    try { await api.patch(`/commissions/${r._id}`, { isActive: !r.isActive }); load(); }
    catch { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Rules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Higher-specificity rules override lower ones. Default is 5% when no rules exist.</p>
        </div>
        <Button onClick={openAdd} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Rule
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card rounded-3xl neu-card p-6 space-y-4">
            <h3 className="font-bold text-foreground">{editingId ? "Edit Rule" : "New Commission Rule"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Level</label>
                <select value={form.level} onChange={e => { setF("level", e.target.value as CommissionRuleRecord["level"]); setF("targetId", ""); setF("targetName", ""); }}
                  className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer">
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Type</label>
                <select value={form.type} onChange={e => setF("type", e.target.value as CommissionRuleRecord["type"])}
                  className="w-full h-10 px-3 rounded-xl bg-background neu-inset border-none text-sm text-foreground appearance-none cursor-pointer">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              {form.level !== "global" && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-1">Target ID <span className="text-xs text-muted-foreground font-normal">(slug / shop ID)</span></label>
                    <Input value={form.targetId} onChange={e => setF("targetId", e.target.value)} placeholder="e.g. grocery, shop-id-123" className="bg-background neu-inset border-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Target Name <span className="text-xs text-muted-foreground font-normal">(label)</span></label>
                    <Input value={form.targetName} onChange={e => setF("targetName", e.target.value)} placeholder="e.g. Grocery, Fresh Mart" className="bg-background neu-inset border-none" />
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Rate {form.type === "percentage" ? "(%)" : "(₹ fixed)"}</label>
                <Input type="number" min={0} step={form.type === "percentage" ? "0.1" : "1"} value={form.rate} onChange={e => setF("rate", e.target.value)} placeholder={form.type === "percentage" ? "5" : "50"} className="bg-background neu-inset border-none" />
              </div>
              <div className="flex items-center gap-3 self-end pb-1">
                <button type="button" onClick={() => setF("isActive", !form.isActive)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isActive ? "bg-primary" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.isActive ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : editingId ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No commission rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">A default 5% rate applies. Add rules to customise per level.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">Rules ({rules.length})</h3>
            <button onClick={load} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-border/50">
            {rules.map(r => (
              <div key={r._id}>
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${levelBadgeClass(r.level)}`}>{LEVEL_LABELS[r.level] ?? r.level}</span>
                      {r.targetName && <span className="text-sm font-semibold text-foreground">{r.targetName}</span>}
                      {r.targetId && !r.targetName && <span className="text-sm font-mono text-muted-foreground">{r.targetId}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.type === "fixed" ? `₹${r.rate} fixed per order` : `${r.rate}% of order value`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleActive(r)} className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${r.isActive ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${r.isActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <button onClick={() => openEdit(r)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteConfirmId(r._id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {deleteConfirmId === r._id && (
                  <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                    <span className="text-sm text-destructive font-medium">Delete this rule?</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-lg h-8">Cancel</Button>
                      <Button size="sm" onClick={() => handleDelete(r._id)} className="rounded-lg h-8 bg-destructive text-white hover:bg-destructive/90 shadow-none">Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SHOP TYPES TAB
// ============================================================================

interface ApiShopTypeRecord {
  _id: string;
  name: string;
  slug: string;
  commissionRate?: number;
  isActive: boolean;
}

function ShopTypesTab() {
  const [shopTypes, setShopTypes] = useState<ApiShopTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addRate, setAddRate] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingRate, setEditingRate] = useState<{ id: string; value: string } | null>(null);
  const [deleteConfirmId2, setDeleteConfirmId2] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ success: boolean; shopTypes: ApiShopTypeRecord[] }>("/shop-types");
      setShopTypes(d.shopTypes ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (st: ApiShopTypeRecord) => {
    setSaving(st._id);
    try { await api.patch(`/shop-types/${st._id}`, { isActive: !st.isActive }); load(); }
    catch { toast.error("Update failed"); } finally { setSaving(null); }
  };

  const handleSaveRate = async (id: string) => {
    if (!editingRate) return;
    const rate = Number(editingRate.value);
    if (isNaN(rate) || rate < 0) { toast.error("Invalid rate"); return; }
    setSaving(id);
    try { await api.patch(`/shop-types/${id}`, { commissionRate: rate }); setEditingRate(null); load(); }
    catch { toast.error("Update failed"); } finally { setSaving(null); }
  };

  const handleCreate = async () => {
    if (!addName.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      await api.post("/shop-types", { name: addName.trim(), commissionRate: addRate ? Number(addRate) : undefined });
      toast.success("Shop type created"); setAddName(""); setAddRate(""); setShowAddForm(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Create failed"); } finally { setCreating(false); }
  };

  const handleDeleteType = async (id: string) => {
    try { await api.delete(`/shop-types/${id}`); toast.success("Deleted"); setDeleteConfirmId2(null); load(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shop Types</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enable or disable shop types and set their default commission rates.</p>
        </div>
        <Button onClick={() => setShowAddForm(v => !v)} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> Add Type
        </Button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card rounded-3xl neu-card p-6 space-y-4">
            <h3 className="font-bold text-foreground">New Shop Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name <span className="text-destructive">*</span></label>
                <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. Bakery" className="bg-background neu-inset border-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Commission Rate (%) <span className="text-muted-foreground font-normal text-xs">optional</span></label>
                <Input type="number" min={0} max={100} value={addRate} onChange={e => setAddRate(e.target.value)} placeholder="5" className="bg-background neu-inset border-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="rounded-xl shadow-none neu-card bg-primary text-primary-foreground hover:bg-primary/90">
                {creating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating…</> : "Create Type"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : shopTypes.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No shop types yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add shop types to categorise vendor shops and control visibility.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">All Types ({shopTypes.length})</h3>
            <button onClick={load} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-border/50">
            {shopTypes.map(st => (
              <div key={st._id}>
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{st.name}</p>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{st.slug}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {editingRate?.id === st._id ? (
                        <div className="flex items-center gap-1.5">
                          <Input type="number" min={0} max={100} value={editingRate.value}
                            onChange={e => setEditingRate({ id: st._id, value: e.target.value })}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveRate(st._id); if (e.key === "Escape") setEditingRate(null); }}
                            className="w-20 h-7 text-xs bg-background neu-inset border-none text-center" autoFocus />
                          <span className="text-xs text-muted-foreground">%</span>
                          <button onClick={() => handleSaveRate(st._id)} disabled={saving === st._id} className="p-1 rounded-lg bg-primary text-primary-foreground"><CheckCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingRate(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingRate({ id: st._id, value: String(st.commissionRate ?? "") })} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                          {st.commissionRate != null ? `${st.commissionRate}% commission` : "No rate set — click to add"}
                          <Edit2 className="w-3 h-3 opacity-60" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
                      {st.isActive ? "Active" : "Disabled"}
                    </span>
                    <button onClick={() => handleToggle(st)} disabled={saving === st._id} className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${st.isActive ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${st.isActive ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <button onClick={() => setDeleteConfirmId2(st._id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {deleteConfirmId2 === st._id && (
                  <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20 flex items-center justify-between gap-3">
                    <span className="text-sm text-destructive font-medium">Delete <span className="font-bold">{st.name}</span>?</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId2(null)} className="rounded-lg h-8">Cancel</Button>
                      <Button size="sm" onClick={() => handleDeleteType(st._id)} className="rounded-lg h-8 bg-destructive text-white hover:bg-destructive/90 shadow-none">Delete</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PAYOUTS TAB
// ============================================================================

interface ApiPayoutRecord {
  _id: string;
  vendorId: string;
  vendorName: string;
  shopId: string;
  amount: number;
  orderTotal?: number;
  commissionAmount?: number;
  status: "pending" | "processing" | "paid" | "failed";
  ordersIncluded: string[];
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

const PAYOUT_FILTER_STATUSES = ["all", "pending", "processing", "paid", "failed"] as const;

function payoutBadgeClass(status: string) {
  switch (status) {
    case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "paid": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "failed": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

function PayoutsTab() {
  const [payouts, setPayouts] = useState<ApiPayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const d = await api.get<{ success: boolean; payouts: ApiPayoutRecord[] }>(`/payouts${q}`);
      setPayouts(d.payouts ?? []);
    } catch { } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`/payouts/${id}/status`, { status, notes: notesMap[id] || undefined });
      toast.success(`Marked as ${status}`); load();
    } catch { toast.error("Update failed"); } finally { setUpdatingId(null); }
  };

  const totalPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendor Payouts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and process pending vendor payouts generated from orders.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Pending Payout", value: formatINR(totalPending), sub: `${payouts.filter(p => p.status === "pending").length} payouts`, color: "text-amber-600" },
          { label: "Total Paid Out", value: formatINR(totalPaid), sub: `${payouts.filter(p => p.status === "paid").length} payouts`, color: "text-green-600" },
          { label: "Total Records", value: String(payouts.length), sub: "across all statuses", color: "text-foreground" },
        ].map(c => (
          <div key={c.label} className="bg-card rounded-2xl neu-card p-4">
            <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
            <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {PAYOUT_FILTER_STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors capitalize ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-card neu-card text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "All" : s}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}</div>
      ) : payouts.length === 0 ? (
        <div className="bg-card rounded-3xl neu-card p-16 text-center">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-25" />
          <p className="font-semibold text-muted-foreground">No payouts {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}</p>
          <p className="text-sm text-muted-foreground mt-1">Payouts are created automatically when orders are placed.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          <div className="divide-y divide-border/50">
            {payouts.map(p => (
              <div key={p._id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{p.vendorName}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${payoutBadgeClass(p.status)}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.ordersIncluded.length} order{p.ordersIncluded.length !== 1 ? "s" : ""} · {new Date(p.createdAt).toLocaleDateString("en-IN")}
                      {p.paidAt && ` · Paid ${new Date(p.paidAt).toLocaleDateString("en-IN")}`}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{p.notes}"</p>}
                    {(p.orderTotal != null || p.commissionAmount != null) && (
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {p.orderTotal != null && (
                          <span className="text-xs text-muted-foreground">Order total: <span className="font-medium text-foreground">{formatINR(p.orderTotal)}</span></span>
                        )}
                        {p.commissionAmount != null && (
                          <span className="text-xs text-muted-foreground">Commission: <span className="font-medium text-destructive">−{formatINR(p.commissionAmount)}</span></span>
                        )}
                        <span className="text-xs text-muted-foreground">Vendor payable: <span className="font-medium text-emerald-600">{formatINR(p.amount)}</span></span>
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-bold text-emerald-600 shrink-0">{formatINR(p.amount)}</p>
                </div>
                {p.status !== "paid" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input placeholder="Notes (optional)" value={notesMap[p._id] ?? ""} onChange={e => setNotesMap(m => ({ ...m, [p._id]: e.target.value }))}
                      className="flex-1 h-8 text-xs bg-background neu-inset border-none min-w-[120px]" />
                    {p.status === "pending" && (
                      <Button size="sm" onClick={() => handleUpdateStatus(p._id, "processing")} disabled={updatingId === p._id} className="rounded-lg h-8 shadow-none">
                        {updatingId === p._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Processing"}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleUpdateStatus(p._id, "paid")} disabled={updatingId === p._id} className="rounded-lg h-8 bg-green-600 hover:bg-green-700 text-white shadow-none">
                      {updatingId === p._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Mark Paid"}
                    </Button>
                    {p.status !== "failed" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p._id, "failed")} disabled={updatingId === p._id} className="rounded-lg h-8 text-destructive border-destructive/30 hover:bg-destructive/5 shadow-none">Fail</Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ApiCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  commissionRate: number;
  emoji?: string;
  color?: string;
  createdAt: string;
}

function CategoriesTab() {
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", description: "", commissionRate: "5", emoji: "", color: "#f59e0b" });
  const [creating, setCreating] = useState(false);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; categories: ApiCategory[] }>("/categories/all");
      setCats(data.categories ?? []);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleToggle = async (cat: ApiCategory) => {
    setTogglingId(cat._id);
    try {
      await api.patch(`/categories/${cat._id}`, { isActive: !cat.isActive });
      setCats(prev => prev.map(c => c._id === cat._id ? { ...c, isActive: !cat.isActive } : c));
      toast.success(`"${cat.name}" ${cat.isActive ? "disabled" : "enabled"}`);
    } catch {
      toast.error("Failed to update category");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveRate = async (cat: ApiCategory) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0) { toast.error("Enter a valid rate"); return; }
    try {
      await api.patch(`/categories/${cat._id}`, { commissionRate: rate });
      setCats(prev => prev.map(c => c._id === cat._id ? { ...c, commissionRate: rate } : c));
      setEditingId(null);
      toast.success("Commission rate updated");
    } catch {
      toast.error("Failed to update rate");
    }
  };

  const handleDelete = async (cat: ApiCategory) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    setDeletingId(cat._id);
    try {
      await api.delete(`/categories/${cat._id}`);
      setCats(prev => prev.filter(c => c._id !== cat._id));
      toast.success("Category deleted");
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim()) { toast.error("Name and slug are required"); return; }
    const rate = parseFloat(createForm.commissionRate);
    if (isNaN(rate) || rate < 0) { toast.error("Enter a valid commission rate"); return; }
    setCreating(true);
    try {
      const data = await api.post<{ success: boolean; category: ApiCategory }>("/categories", {
        name: createForm.name.trim(),
        slug: createForm.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        description: createForm.description.trim(),
        commissionRate: rate,
        isActive: true,
        emoji: createForm.emoji.trim() || "🛍️",
        color: createForm.color || "#f59e0b",
      });
      setCats(prev => [data.category, ...prev]);
      setCreateForm({ name: "", slug: "", description: "", commissionRate: "5", emoji: "", color: "#f59e0b" });
      setShowCreate(false);
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setCreating(false);
    }
  };

  const displayed = cats.filter(c =>
    filterActive === "all" ? true : filterActive === "active" ? c.isActive : !c.isActive
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Enable / disable categories and set per-category commission rates</p>
        </div>
        <Button onClick={() => setShowCreate(v => !v)} className="rounded-xl shadow-none gap-2">
          <Plus className="w-4 h-4" />New Category
        </Button>
      </div>

      {showCreate && (
        <div className="neu-card rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Create Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name *</label>
              <Input value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))}
                placeholder="e.g. Electronics"
                className="h-9 neu-inset border-none bg-background" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Slug * (auto-generated)</label>
              <Input value={createForm.slug}
                onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. electronics"
                className="h-9 neu-inset border-none bg-background" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Emoji (shown on customer page)</label>
              <Input value={createForm.emoji}
                onChange={e => setCreateForm(f => ({ ...f, emoji: e.target.value }))}
                placeholder="e.g. 📱"
                className="h-9 neu-inset border-none bg-background" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Color (bubble background)</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={createForm.color}
                  onChange={e => setCreateForm(f => ({ ...f, color: e.target.value }))}
                  className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent" />
                <span className="text-xs text-muted-foreground font-mono">{createForm.color}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Commission Rate (%)</label>
              <Input type="number" min="0" value={createForm.commissionRate}
                onChange={e => setCreateForm(f => ({ ...f, commissionRate: e.target.value }))}
                className="h-9 neu-inset border-none bg-background" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                className="h-9 neu-inset border-none bg-background" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating} className="rounded-xl shadow-none">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl shadow-none">Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {(["all", "active", "inactive"] as const).map(f => (
          <Button key={f} size="sm" variant={filterActive === f ? "default" : "outline"}
            onClick={() => setFilterActive(f)} className="rounded-lg shadow-none capitalize">
            {f}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {displayed.length} categor{displayed.length === 1 ? "y" : "ies"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No categories found</div>
      ) : (
        <div className="space-y-3">
          {displayed.map(cat => (
            <div key={cat._id} className="neu-card rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: cat.color ? `${cat.color}22` : 'hsl(var(--muted))' }}>
                {cat.emoji || "🛍️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">{cat.name}</span>
                  <Badge variant={cat.isActive ? "default" : "secondary"} className="text-xs">
                    {cat.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{cat.slug}</span>
                </div>
                {cat.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {editingId === cat._id ? (
                  <>
                    <Input type="number" min="0" value={editRate}
                      onChange={e => setEditRate(e.target.value)}
                      className="w-24 h-8 text-xs neu-inset border-none bg-background"
                      placeholder="Rate %" />
                    <Button size="sm" onClick={() => handleSaveRate(cat)} className="rounded-lg h-8 shadow-none">Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-lg h-8 shadow-none">Cancel</Button>
                  </>
                ) : (
                  <button
                    onClick={() => { setEditingId(cat._id); setEditRate(String(cat.commissionRate)); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                  >
                    <Edit2 className="w-3 h-3" />
                    {cat.commissionRate}% commission
                  </button>
                )}

                <Button size="sm" variant="outline"
                  onClick={() => handleToggle(cat)}
                  disabled={togglingId === cat._id}
                  className={`rounded-lg h-8 shadow-none gap-1.5 ${
                    cat.isActive
                      ? "text-destructive border-destructive/30 hover:bg-destructive/5"
                      : "text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950"
                  }`}
                >
                  {togglingId === cat._id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : cat.isActive
                      ? <><EyeOff className="w-3 h-3" />Disable</>
                      : <><Eye className="w-3 h-3" />Enable</>
                  }
                </Button>

                <Button size="sm" variant="outline"
                  onClick={() => handleDelete(cat)}
                  disabled={deletingId === cat._id}
                  className="rounded-lg h-8 shadow-none text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  {deletingId === cat._id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Trash2 className="w-3 h-3" />
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AdminReviewProduct {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountedPrice?: number;
  images?: string[];
  image?: string;
  stock: number;
  unit?: string;
  shopId: string;
  shopName: string;
  status: "pending" | "active" | "inactive" | "rejected" | "out_of_stock";
  createdAt: string;
}

const APPROVAL_STATUS_CONFIG = {
  pending:      { label: "Pending",   className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  active:       { label: "Active",    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  inactive:     { label: "Inactive",  className: "bg-muted text-muted-foreground" },
  rejected:     { label: "Rejected",  className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  out_of_stock: { label: "No Stock",  className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" },
} as const;

const REJECTION_REASONS = [
  "Wrong category selected",
  "Incomplete product information",
  "Duplicate product",
  "Restricted product",
  "Poor quality images",
  "Other",
] as const;

function ProductApprovalsTab() {
  const [products, setProducts] = useState<AdminReviewProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "active" | "rejected" | "all">("pending");
  const [actingId, setActingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<AdminReviewProduct | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(REJECTION_REASONS[0]);
  const [rejectCustom, setRejectCustom] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchProducts = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; products: AdminReviewProduct[] }>(
        `/products/admin-review?status=${s}&limit=100`
      );
      setProducts(data.products ?? []);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(statusFilter); }, [statusFilter, fetchProducts]);

  const handleApprove = async (p: AdminReviewProduct) => {
    setActingId(p._id);
    try {
      await api.patch(`/products/${p._id}/approval`, { action: "approve" });
      setProducts(prev => prev.filter(x => x._id !== p._id));
      toast.success(`"${p.name}" approved — now visible to customers`);
    } catch {
      toast.error("Failed to approve product");
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (p: AdminReviewProduct) => {
    setRejectTarget(p);
    setRejectReason(REJECTION_REASONS[0]);
    setRejectCustom("");
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const finalReason = rejectReason === "Other" ? rejectCustom.trim() : rejectReason;
    if (!finalReason) { toast.error("Please enter a rejection reason"); return; }
    setSubmittingReject(true);
    try {
      await api.patch(`/products/${rejectTarget._id}/approval`, {
        action: "reject",
        rejectionReason: finalReason,
      });
      setProducts(prev => prev.filter(x => x._id !== rejectTarget._id));
      toast.success(`"${rejectTarget.name}" rejected`);
      setRejectTarget(null);
    } catch {
      toast.error("Failed to reject product");
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleDelete = async (p: AdminReviewProduct) => {
    if (!confirm(`Permanently delete "${p.name}"?`)) return;
    setDeletingId(p._id);
    try {
      await api.delete(`/products/${p._id}`);
      setProducts(prev => prev.filter(x => x._id !== p._id));
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const tabs: { key: typeof statusFilter; label: string }[] = [
    { key: "pending",  label: "Pending" },
    { key: "active",   label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all",      label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Product Approvals</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Review vendor product submissions before they go live</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {tabs.map(t => (
          <Button key={t.key} size="sm" variant={statusFilter === t.key ? "default" : "outline"}
            onClick={() => setStatusFilter(t.key)} className="rounded-lg shadow-none">
            {t.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {statusFilter === "pending" ? "No products awaiting approval" : "No products found"}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => {
            const thumb = p.images?.[0] ?? p.image;
            const cfg = APPROVAL_STATUS_CONFIG[p.status] ?? APPROVAL_STATUS_CONFIG.pending;
            const isActing = actingId === p._id;
            const isDeleting = deletingId === p._id;
            return (
              <div key={p._id} className="neu-card rounded-2xl p-4 flex gap-4 items-start flex-wrap">
                {/* Image */}
                <div className="w-16 h-16 rounded-xl bg-background neu-inset p-1.5 flex-shrink-0 overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={p.name} className="w-full h-full object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{p.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Store className="w-3 h-3" />{p.shopName}</span>
                    <span className="capitalize">{p.category}</span>
                    <span className="text-primary font-semibold text-sm">{formatINR(p.price)}</span>
                    <span>Stock: {p.stock}</span>
                  </div>
                  {p.status === "rejected" && (p as AdminReviewProduct & { rejectionReason?: string }).rejectionReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Reason: {(p as AdminReviewProduct & { rejectionReason?: string }).rejectionReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {p.status !== "active" && (
                    <Button size="sm" onClick={() => handleApprove(p)} disabled={isActing || isDeleting}
                      className="rounded-lg h-8 shadow-none bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                      {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approve
                    </Button>
                  )}
                  {p.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => openRejectModal(p)} disabled={isActing || isDeleting}
                      className="rounded-lg h-8 shadow-none text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 gap-1.5">
                      <XCircle className="w-3 h-3" />Reject
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(p)} disabled={isActing || isDeleting}
                    className="rounded-lg h-8 shadow-none text-destructive border-destructive/30 hover:bg-destructive/5">
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { if (!submittingReject) setRejectTarget(null); }}>
          <div className="bg-card rounded-2xl neu-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-foreground">Reject Product</h3>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">"{rejectTarget.name}"</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Rejection Reason *</label>
              <div className="space-y-2">
                {REJECTION_REASONS.map(r => (
                  <label key={r} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${rejectReason === r ? "bg-destructive/10 border border-destructive/30" : "bg-background neu-inset hover:bg-muted"}`}>
                    <input type="radio" name="rejectReason" value={r} checked={rejectReason === r}
                      onChange={() => setRejectReason(r)} className="accent-destructive shrink-0" />
                    <span className="text-sm text-foreground">{r}</span>
                  </label>
                ))}
              </div>
              {rejectReason === "Other" && (
                <Input
                  value={rejectCustom}
                  onChange={e => setRejectCustom(e.target.value)}
                  placeholder="Describe the reason..."
                  className="mt-2 neu-inset border-none bg-background"
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={submittingReject}
                className="flex-1 rounded-xl shadow-none">Cancel</Button>
              <Button onClick={submitReject} disabled={submittingReject}
                className="flex-1 rounded-xl shadow-none bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2">
                {submittingReject ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Support Tickets Tab ──────────────────────────────────────────────────────

interface SupportTicket {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminNote?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

function SupportTicketsTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved' | 'closed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; tickets: SupportTicket[] }>("/support");
      if (data.success) setTickets(data.tickets);
    } catch {
      toast.error("Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);
  const openCount = tickets.filter(t => t.status === 'open').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;

  const categoryLabel: Record<string, string> = {
    general: 'General', order: 'Order', payment: 'Payment',
    delivery: 'Delivery', product: 'Product', vendor: 'Vendor',
    account: 'Account', other: 'Other',
  };

  const statusColor = (s: string) => {
    if (s === 'open') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (s === 'resolved') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const categoryColor = (c: string) => {
    const map: Record<string, string> = {
      order: 'bg-blue-100 text-blue-800',
      payment: 'bg-purple-100 text-purple-800',
      delivery: 'bg-amber-100 text-amber-800',
      product: 'bg-teal-100 text-teal-800',
      vendor: 'bg-orange-100 text-orange-800',
      account: 'bg-pink-100 text-pink-800',
    };
    return map[c] ?? 'bg-slate-100 text-slate-800';
  };

  const handleAction = async (id: string, action: 'resolve' | 'close') => {
    setActing(id + action);
    try {
      await api.patch<{ success: boolean }>(`/support/${id}/${action}`, { adminNote: noteInputs[id] ?? '' });
      toast.success(action === 'resolve' ? 'Ticket marked as resolved' : 'Ticket closed');
      setExpandedId(null);
      await fetchTickets();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <div className="flex gap-2">
            <Badge className="bg-red-100 text-red-800 border-none">{openCount} Open</Badge>
            <Badge className="bg-green-100 text-green-800 border-none hidden sm:inline-flex">{resolvedCount} Resolved</Badge>
            <Badge className="bg-slate-100 text-slate-700 border-none hidden sm:inline-flex">{closedCount} Closed</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void fetchTickets()} className="text-primary">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['all', 'open', 'resolved', 'closed'] as const).map(f => (
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center p-16 bg-card rounded-3xl neu-inset text-muted-foreground">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No {filter === 'all' ? '' : filter} tickets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ticket => (
            <div key={ticket.id} className="bg-card rounded-3xl neu-card overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                className="w-full p-5 flex items-start gap-4 text-left"
              >
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{ticket.subject}</span>
                    <Badge className={`${statusColor(ticket.status)} border-none text-xs px-2 py-0.5 capitalize`}>
                      {ticket.status}
                    </Badge>
                    <Badge className={`${categoryColor(ticket.category)} border-none text-xs px-2 py-0.5`}>
                      {categoryLabel[ticket.category] ?? ticket.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <User className="w-3 h-3" />
                    <span>{ticket.userName || 'Unknown'}</span>
                    <span>·</span>
                    <span>{ticket.userPhone}</span>
                    <span>·</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                {expandedId === ticket.id ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
              </button>

              {/* Expanded content */}
              {expandedId === ticket.id && (
                <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                  <div className="bg-background p-4 rounded-2xl neu-inset text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </div>

                  {ticket.adminNote && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-2xl text-sm">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Admin Note</p>
                      <p className="text-green-800 dark:text-green-300">{ticket.adminNote}</p>
                    </div>
                  )}

                  {ticket.status === 'open' && (
                    <div className="space-y-3">
                      <textarea
                        value={noteInputs[ticket.id] ?? ''}
                        onChange={e => setNoteInputs(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Optional admin note / response to user…"
                        rows={2}
                        className="w-full bg-background neu-inset border-none rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex gap-3">
                        <Button
                          onClick={() => void handleAction(ticket.id, 'resolve')}
                          disabled={acting === ticket.id + 'resolve'}
                          className="flex-1 rounded-xl shadow-none neu-card bg-green-600 text-white hover:bg-green-700"
                          size="sm"
                        >
                          {acting === ticket.id + 'resolve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1.5" /> Mark Resolved</>}
                        </Button>
                        <Button
                          onClick={() => void handleAction(ticket.id, 'close')}
                          disabled={acting === ticket.id + 'close'}
                          variant="outline"
                          className="flex-1 rounded-xl shadow-none neu-inset border-none"
                          size="sm"
                        >
                          {acting === ticket.id + 'close' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1.5" /> Close</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trending Products Manager Tab ───────────────────────────────────────────
type TrendingProduct = {
  _id: string;
  name: string;
  category: string;
  shopName: string;
  images: string[];
  price: number;
  stock: number;
  status: string;
  trending: boolean;
  unitsSold: number;
  revenue: number;
};

type SortKey = 'unitsSold' | 'revenue' | 'name' | 'stock';

function TrendingProductsTab() {
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'most-sold' | 'all'>('most-sold');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('unitsSold');
  const [sortAsc, setSortAsc] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ success: boolean; products: TrendingProduct[] }>('/products/trending-manager?status=all');
      setProducts(data.products ?? []);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const toggleTrending = async (product: TrendingProduct) => {
    setTogglingId(product._id);
    const newVal = !product.trending;
    try {
      await api.patch(`/products/${product._id}`, { trending: newVal });
      setProducts(prev => prev.map(p => p._id === product._id ? { ...p, trending: newVal } : p));
      toast.success(newVal ? `"${product.name}" added to Trending` : `"${product.name}" removed from Trending`);
    } catch {
      toast.error('Failed to update trending status');
    } finally {
      setTogglingId(null);
    }
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  const displayList = useMemo(() => {
    let list = subTab === 'most-sold'
      ? [...products].filter(p => p.unitsSold > 0 || p.trending)
      : [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.shopName ?? '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'unitsSold') diff = b.unitsSold - a.unitsSold;
      else if (sortKey === 'revenue') diff = b.revenue - a.revenue;
      else if (sortKey === 'name') diff = a.name.localeCompare(b.name);
      else if (sortKey === 'stock') diff = b.stock - a.stock;
      return sortAsc ? -diff : diff;
    });

    if (subTab === 'most-sold') list = list.slice(0, 50);
    return list;
  }, [products, subTab, search, sortKey, sortAsc]);

  const trendingCount = products.filter(p => p.trending).length;
  const totalSold = products.reduce((s, p) => s + p.unitsSold, 0);

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => cycleSort(col)}
      className={`flex items-center gap-1 font-semibold transition-colors ${sortKey === col ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === col ? 'opacity-100' : 'opacity-40'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" /> Trending Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control which products appear in the "Trending in Your Area" section
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="neu-inset rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-orange-500">{trendingCount}</div>
            <div className="text-xs text-muted-foreground">Trending now</div>
          </div>
          <div className="neu-inset rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold text-primary">{totalSold.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total sold</div>
          </div>
          <Button onClick={() => void fetchProducts()} variant="outline" size="sm" className="rounded-xl shadow-none neu-card" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 neu-inset rounded-xl w-fit">
        {(['most-sold', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setSubTab(tab); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === tab ? 'bg-primary text-primary-foreground neu-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'most-sold' ? '🔥 Most Sold' : '📦 All Products'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by product name, shop or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl neu-inset border-none shadow-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {search ? 'No products match your search.' : subTab === 'most-sold' ? 'No orders yet — all products will appear in the All Products tab.' : 'No products found.'}
        </div>
      ) : (
        <div className="neu-card rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs">
            <SortBtn col="name" label="Product" />
            <span className="text-muted-foreground font-semibold">Status</span>
            <SortBtn col="unitsSold" label="Units Sold" />
            <SortBtn col="revenue" label="Revenue" />
            <SortBtn col="stock" label="Stock" />
            <span className="text-muted-foreground font-semibold">Trending</span>
          </div>

          <div className="divide-y divide-border">
            {displayList.map((product, idx) => (
              <div
                key={product._id}
                className={`flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-start md:items-center px-5 py-4 transition-colors hover:bg-muted/20 ${
                  product.trending ? 'bg-orange-500/5 border-l-4 border-l-orange-400' : ''
                }`}
              >
                {/* Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    {subTab === 'most-sold' && idx < 3 && (
                      <span className={`absolute -top-2 -left-2 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                      }`}>{idx + 1}</span>
                    )}
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover neu-inset"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl neu-inset flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{product.shopName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    product.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    product.status === 'inactive' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                    product.status === 'out_of_stock' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {product.status === 'out_of_stock' ? 'Out of Stock' : product.status}
                  </span>
                </div>

                {/* Units sold */}
                <div className="text-sm">
                  <span className={`font-semibold ${product.unitsSold > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {product.unitsSold.toLocaleString()}
                  </span>
                  {product.unitsSold > 0 && (
                    <TrendingUp className="inline w-3.5 h-3.5 ml-1 text-green-500" />
                  )}
                </div>

                {/* Revenue */}
                <div className="text-sm font-medium text-foreground">
                  {product.revenue > 0 ? formatINR(product.revenue) : <span className="text-muted-foreground">—</span>}
                </div>

                {/* Stock */}
                <div className={`text-sm font-medium ${product.stock === 0 ? 'text-red-500' : product.stock < 10 ? 'text-yellow-600' : 'text-foreground'}`}>
                  {product.stock}
                </div>

                {/* Trending toggle */}
                <div className="flex items-center">
                  <button
                    onClick={() => void toggleTrending(product)}
                    disabled={togglingId === product._id}
                    title={product.trending ? 'Remove from Trending' : 'Add to Trending'}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      product.trending
                        ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 shadow-md'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-orange-400 hover:text-orange-500 neu-inset'
                    } disabled:opacity-50`}
                  >
                    {togglingId === product._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Flame className={`w-3.5 h-3.5 ${product.trending ? 'text-white' : ''}`} />
                    )}
                    <span className="hidden sm:inline">{product.trending ? 'Trending' : 'Set Trending'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Showing {displayList.length} product{displayList.length !== 1 ? 's' : ''}
            {subTab === 'most-sold' && products.filter(p => p.unitsSold > 0 || p.trending).length > 50 && ' (top 50 by units sold)'}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delivery Charges Tab ─────────────────────────────────────────────────────

interface DeliveryRule {
  _id: string;
  fromPincode: string;
  toPincode: string;
  baseCharge: number;
  rainSurcharge: number;
  label?: string;
}

interface DeliveryChargesApiResponse {
  success: boolean;
  rules: DeliveryRule[];
  rainModeActive: boolean;
}

const EMPTY_RULE = { fromPincode: "", toPincode: "", baseCharge: 0, rainSurcharge: 0, label: "" };

function DeliveryChargesTab() {
  const [rules, setRules] = useState<DeliveryRule[]>([]);
  const [rainModeActive, setRainModeActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rainToggling, setRainToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RULE);
  const [editForm, setEditForm] = useState(EMPTY_RULE);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<DeliveryChargesApiResponse>("/delivery/charges");
      setRules(data.rules);
      setRainModeActive(data.rainModeActive);
    } catch {
      toast.error("Failed to load delivery charges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleRain = async () => {
    setRainToggling(true);
    try {
      await api.post("/delivery/rain-mode", { active: !rainModeActive });
      setRainModeActive(v => !v);
      toast.success(rainModeActive ? "Rain mode disabled" : "Rain mode enabled — surcharge active");
    } catch {
      toast.error("Failed to update rain mode");
    } finally {
      setRainToggling(false);
    }
  };

  const handleAddRule = async () => {
    if (!form.fromPincode || !form.toPincode) {
      toast.error("Both pincodes are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/delivery/charges", {
        fromPincode: form.fromPincode.trim(),
        toPincode: form.toPincode.trim(),
        baseCharge: Number(form.baseCharge),
        rainSurcharge: Number(form.rainSurcharge),
        label: form.label || null,
      });
      setForm(EMPTY_RULE);
      setShowAddForm(false);
      toast.success("Delivery rule added");
      fetchAll();
    } catch {
      toast.error("Failed to add rule");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api.patch(`/delivery/charges/${id}`, {
        fromPincode: editForm.fromPincode.trim(),
        toPincode: editForm.toPincode.trim(),
        baseCharge: Number(editForm.baseCharge),
        rainSurcharge: Number(editForm.rainSurcharge),
        label: editForm.label || null,
      });
      setEditingId(null);
      toast.success("Rule updated");
      fetchAll();
    } catch {
      toast.error("Failed to update rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this delivery rule?")) return;
    try {
      await api.delete(`/delivery/charges/${id}`);
      toast.success("Rule deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const startEdit = (rule: DeliveryRule) => {
    setEditingId(rule._id);
    setEditForm({
      fromPincode: rule.fromPincode,
      toPincode: rule.toPincode,
      baseCharge: rule.baseCharge,
      rainSurcharge: rule.rainSurcharge,
      label: rule.label ?? "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Delivery Charges</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage cross-area delivery fees and rain surcharges
          </p>
        </div>
        <Button onClick={() => { setShowAddForm(true); setForm(EMPTY_RULE); }} className="rounded-xl gap-2 neu-card shadow-none">
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      {/* Rain Mode Toggle */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${rainModeActive ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-border bg-card neu-inset"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rainModeActive ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
            <span className="text-lg">🌧️</span>
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              Rain Mode
              {rainModeActive && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              When active, rain surcharge is added on top of base delivery charges
            </div>
          </div>
        </div>
        <Button
          onClick={handleToggleRain}
          disabled={rainToggling}
          variant={rainModeActive ? "default" : "outline"}
          className="rounded-xl min-w-[100px]"
        >
          {rainToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : rainModeActive ? "Disable" : "Enable"}
        </Button>
      </div>

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="bg-card border border-border rounded-2xl p-5 neu-card space-y-4">
          <h3 className="font-bold text-base">New Delivery Rule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">From Pincode (shop area)</label>
              <Input
                value={form.fromPincode}
                onChange={e => setForm(f => ({ ...f, fromPincode: e.target.value }))}
                placeholder="e.g. 733101"
                className="rounded-xl font-mono"
                maxLength={6}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">To Pincode (customer area)</label>
              <Input
                value={form.toPincode}
                onChange={e => setForm(f => ({ ...f, toPincode: e.target.value }))}
                placeholder="e.g. 733103"
                className="rounded-xl font-mono"
                maxLength={6}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Base Charge (₹)</label>
              <Input
                type="number"
                value={form.baseCharge}
                onChange={e => setForm(f => ({ ...f, baseCharge: Number(e.target.value) }))}
                placeholder="0"
                className="rounded-xl"
                min={0}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">🌧️ Rain Surcharge (₹)</label>
              <Input
                type="number"
                value={form.rainSurcharge}
                onChange={e => setForm(f => ({ ...f, rainSurcharge: Number(e.target.value) }))}
                placeholder="0"
                className="rounded-xl"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Label (optional)</label>
            <Input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Balurghat cross-town"
              className="rounded-xl"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddRule} disabled={saving} className="rounded-xl neu-card shadow-none">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Rule
            </Button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading rules…
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No delivery rules yet</p>
          <p className="text-sm mt-1">Click "Add Rule" to set cross-area delivery charges</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl overflow-hidden neu-card">
          <div className="grid grid-cols-[1fr_1fr_80px_80px_1fr_100px] text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/40 px-5 py-3 gap-3">
            <div>From Pincode</div>
            <div>To Pincode</div>
            <div>Base (₹)</div>
            <div>Rain (₹)</div>
            <div>Label</div>
            <div className="text-right">Actions</div>
          </div>

          {rules.map((rule, idx) => (
            <div
              key={rule._id}
              className={`grid grid-cols-[1fr_1fr_80px_80px_1fr_100px] items-center gap-3 px-5 py-4 ${idx < rules.length - 1 ? "border-b border-border" : ""}`}
            >
              {editingId === rule._id ? (
                <>
                  <Input value={editForm.fromPincode} onChange={e => setEditForm(f => ({ ...f, fromPincode: e.target.value }))} className="rounded-lg font-mono text-sm h-8" maxLength={6} />
                  <Input value={editForm.toPincode} onChange={e => setEditForm(f => ({ ...f, toPincode: e.target.value }))} className="rounded-lg font-mono text-sm h-8" maxLength={6} />
                  <Input type="number" value={editForm.baseCharge} onChange={e => setEditForm(f => ({ ...f, baseCharge: Number(e.target.value) }))} className="rounded-lg text-sm h-8" min={0} />
                  <Input type="number" value={editForm.rainSurcharge} onChange={e => setEditForm(f => ({ ...f, rainSurcharge: Number(e.target.value) }))} className="rounded-lg text-sm h-8" min={0} />
                  <Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="rounded-lg text-sm h-8" placeholder="Label" />
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => handleSaveEdit(rule._id)} disabled={saving} className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-lg hover:opacity-90">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs bg-muted text-foreground px-2 py-1 rounded-lg hover:opacity-90">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-mono font-bold text-sm">{rule.fromPincode}</div>
                  <div className="font-mono font-bold text-sm">{rule.toPincode}</div>
                  <div className="font-semibold text-sm">₹{rule.baseCharge}</div>
                  <div className={`font-semibold text-sm ${rule.rainSurcharge > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                    {rule.rainSurcharge > 0 ? `₹${rule.rainSurcharge}` : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{rule.label || "—"}</div>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteRule(rule._id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {rules.length} rule{rules.length !== 1 ? "s" : ""} · Rain mode is {rainModeActive ? "ON 🌧️" : "OFF"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Homepage Sections Tab ────────────────────────────────────────────────────

interface HomepageSectionRow {
  _id: string;
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  config: {
    categorySlug?: string;
    productIds?: string[];
    limit?: number;
    layout?: string;
  };
}

interface ProductSearchResult {
  _id: string;
  id: string;
  name: string;
  category?: string;
}

const SECTION_TYPES = [
  { value: "trending", label: "Trending Products", icon: "🔥" },
  { value: "new_arrivals", label: "New Arrivals", icon: "✨" },
  { value: "category", label: "By Category", icon: "🗂️" },
  { value: "manual", label: "Manual / Custom", icon: "✋" },
];

const LAYOUT_OPTIONS = [
  { value: "scroll", label: "Horizontal Scroll" },
  { value: "grid", label: "Grid" },
];

interface ApiCategory { _id: string; slug: string; name: string; emoji?: string; }

function HomepageSectionsTab() {
  const [sections, setSections] = useState<HomepageSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSectionRow | null>(null);
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("trending");
  const [formLayout, setFormLayout] = useState("scroll");
  const [formLimit, setFormLimit] = useState(10);
  const [formCategorySlug, setFormCategorySlug] = useState("");
  const [formProductSearch, setFormProductSearch] = useState("");
  const [formProductIds, setFormProductIds] = useState<string[]>([]);
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ success: boolean; sections: HomepageSectionRow[] }>('/homepage-sections/admin')
      .then(d => setSections(d.sections ?? []))
      .catch(() => toast.error("Failed to load sections"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get<{ success: boolean; categories: ApiCategory[] }>('/categories')
      .then(d => setApiCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setEditingSection(null);
    setFormTitle(""); setFormType("trending"); setFormLayout("scroll");
    setFormLimit(10); setFormCategorySlug(""); setFormProductIds([]);
    setFormProductSearch(""); setProductSearchResults([]);
    setShowForm(true);
  }

  function openEdit(s: HomepageSectionRow) {
    setEditingSection(s);
    setFormTitle(s.title); setFormType(s.type);
    setFormLayout(s.config.layout ?? "scroll");
    setFormLimit(s.config.limit ?? 10);
    setFormCategorySlug(s.config.categorySlug ?? "");
    setFormProductIds(s.config.productIds ?? []);
    setFormProductSearch(""); setProductSearchResults([]);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) { toast.error("Title is required"); return; }
    setSaving("form");
    const config: HomepageSectionRow["config"] = { limit: formLimit, layout: formLayout };
    if (formType === "category") config.categorySlug = formCategorySlug;
    if (formType === "manual") config.productIds = formProductIds;

    try {
      if (editingSection) {
        await api.patch(`/homepage-sections/${editingSection._id}`, { title: formTitle, type: formType, config });
        toast.success("Section updated");
      } else {
        const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sortOrder)) + 1 : 0;
        await api.post('/homepage-sections', { title: formTitle, type: formType, config, sortOrder: maxOrder });
        toast.success("Section created");
      }
      setShowForm(false);
      load();
    } catch {
      toast.error("Failed to save section");
    } finally {
      setSaving(null);
    }
  }

  async function handleToggle(s: HomepageSectionRow) {
    setSaving(s._id);
    try {
      await api.patch(`/homepage-sections/${s._id}`, { enabled: !s.enabled });
      setSections(prev => prev.map(x => x._id === s._id ? { ...x, enabled: !x.enabled } : x));
    } catch {
      toast.error("Failed to toggle section");
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(s: HomepageSectionRow) {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    setSaving(s._id + "-del");
    try {
      await api.delete(`/homepage-sections/${s._id}`);
      toast.success("Section deleted");
      setSections(prev => prev.filter(x => x._id !== s._id));
    } catch {
      toast.error("Failed to delete section");
    } finally {
      setSaving(null);
    }
  }

  async function handleMove(s: HomepageSectionRow, dir: -1 | 1) {
    const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(x => x._id === s._id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx]!;
    const newOrder = [
      { id: s.id, sortOrder: swap.sortOrder },
      { id: swap.id, sortOrder: s.sortOrder },
    ];
    try {
      await api.patch('/homepage-sections/reorder', { order: newOrder });
      setSections(prev => prev.map(x => {
        if (x._id === s._id) return { ...x, sortOrder: swap.sortOrder };
        if (x._id === swap._id) return { ...x, sortOrder: s.sortOrder };
        return x;
      }));
    } catch {
      toast.error("Failed to reorder");
    }
  }

  useEffect(() => {
    if (!formProductSearch.trim() || formType !== "manual") { setProductSearchResults([]); return; }
    const t = setTimeout(() => {
      setProductSearchLoading(true);
      api.get<{ success: boolean; products: ProductSearchResult[] }>(`/products?search=${encodeURIComponent(formProductSearch)}&limit=10`)
        .then(d => setProductSearchResults(d.products ?? []))
        .catch(() => {})
        .finally(() => setProductSearchLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [formProductSearch, formType]);

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  const typeLabel = (type: string) => SECTION_TYPES.find(t => t.value === type)?.label ?? type;
  const typeIcon = (type: string) => SECTION_TYPES.find(t => t.value === type)?.icon ?? "📦";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Home Page Sections</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage what product sections appear on the customer home page</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Section
        </Button>
      </div>

      {/* Section List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="neu-card rounded-2xl p-12 text-center">
          <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-muted-foreground">No sections yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Section" to create your first home page section</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s, idx) => (
            <div key={s._id} className={`neu-card rounded-2xl px-5 py-4 flex items-center gap-4 transition-opacity ${!s.enabled ? "opacity-50" : ""}`}>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => handleMove(s, -1)} disabled={idx === 0} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleMove(s, 1)} disabled={idx === sorted.length - 1} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                {typeIcon(s.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{s.title}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">{typeLabel(s.type)}</span>
                  {s.type === "category" && s.config.categorySlug && (
                    <span className="text-xs text-primary font-medium">#{s.config.categorySlug}</span>
                  )}
                  {s.type === "manual" && (
                    <span className="text-xs text-primary font-medium">{(s.config.productIds ?? []).length} products</span>
                  )}
                  <span className="text-xs text-muted-foreground">{s.config.layout ?? "scroll"} · limit {s.config.limit ?? 10}</span>
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(s)}
                disabled={saving === s._id}
                className="shrink-0 transition-colors"
                title={s.enabled ? "Visible on home page" : "Hidden from home page"}
              >
                {saving === s._id ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : s.enabled ? (
                  <ToggleRight className="w-8 h-8 text-primary" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                )}
              </button>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(s)} disabled={saving === s._id + "-del"} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                  {saving === s._id + "-del" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{editingSection ? "Edit Section" : "New Section"}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Section Title</label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Your Daily Needs" className="rounded-xl" />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Section Type</label>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setFormType(t.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${formType === t.value ? "border-primary bg-primary/5" : "border-transparent bg-muted hover:border-muted-foreground/30"}`}
                  >
                    <div className="text-lg mb-0.5">{t.icon}</div>
                    <div className="text-xs font-semibold">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Category picker */}
            {formType === "category" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
                <select
                  value={formCategorySlug}
                  onChange={e => setFormCategorySlug(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Pick a category —</option>
                  {apiCategories.map(c => (
                    <option key={c._id} value={c.slug}>
                      {c.emoji ? `${c.emoji} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
                {apiCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Loading categories…</p>
                )}
              </div>
            )}

            {/* Manual product picker */}
            {formType === "manual" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Products ({formProductIds.length} selected)</label>
                <Input
                  value={formProductSearch}
                  onChange={e => setFormProductSearch(e.target.value)}
                  placeholder="Search products to add…"
                  className="rounded-xl"
                />
                {productSearchLoading && <p className="text-xs text-muted-foreground">Searching…</p>}
                {productSearchResults.length > 0 && (
                  <div className="neu-inset rounded-xl divide-y divide-border max-h-40 overflow-y-auto">
                    {productSearchResults.map(p => (
                      <button
                        key={p._id}
                        onClick={() => {
                          if (!formProductIds.includes(p._id)) setFormProductIds(prev => [...prev, p._id]);
                          setFormProductSearch(""); setProductSearchResults([]);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <Plus className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
                {formProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formProductIds.map(pid => (
                      <span key={pid} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        {pid.slice(0, 8)}…
                        <button onClick={() => setFormProductIds(prev => prev.filter(x => x !== pid))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Layout & Limit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Display Layout</label>
                <select
                  value={formLayout}
                  onChange={e => setFormLayout(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  {LAYOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Max Products</label>
                <Input
                  type="number" min={1} max={40} value={formLimit}
                  onChange={e => setFormLimit(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving === "form"} className="flex-1 rounded-xl">
                {saving === "form" ? <Loader2 className="w-4 h-4 animate-spin" /> : editingSection ? "Save Changes" : "Create Section"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SERVICE AREAS TAB — Pincode / Area / State management
// ============================================================================

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

interface ServicePincodeRow {
  pincode: string;
  area: string;
  state: string;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_PIN_FORM = { pincode: "", area: "", state: "West Bengal" };

function ServiceAreasTab() {
  const [rows, setRows] = useState<ServicePincodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PIN_FORM);
  const [saving, setSaving] = useState(false);
  const [editingRow, setEditingRow] = useState<ServicePincodeRow | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_PIN_FORM);
  const [deletingPin, setDeletingPin] = useState<string | null>(null);
  const [togglingPin, setTogglingPin] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ success: boolean; pincodes: ServicePincodeRow[] }>("/service-pincodes");
      setRows(d.pincodes ?? []);
    } catch {
      toast.error("Failed to load service areas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.pincode.includes(q) ||
      r.area.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const stateGroups = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.state] = (map[r.state] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const activeCount = rows.filter(r => r.isActive).length;

  const handleAdd = async () => {
    if (!/^\d{6}$/.test(form.pincode)) { toast.error("Pincode must be exactly 6 digits"); return; }
    if (!form.area.trim()) { toast.error("Area / Town name is required"); return; }
    if (!form.state) { toast.error("State is required"); return; }
    setSaving(true);
    try {
      await api.post("/service-pincodes", { pincode: form.pincode, area: form.area.trim(), state: form.state });
      toast.success(`Pincode ${form.pincode} added`);
      setForm(EMPTY_PIN_FORM);
      setShowForm(false);
      load();
    } catch {
      toast.error("Failed to add pincode");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    if (!editForm.area.trim()) { toast.error("Area name is required"); return; }
    setSaving(true);
    try {
      await api.patch(`/service-pincodes/${editingRow.pincode}`, { area: editForm.area.trim(), state: editForm.state });
      toast.success("Updated successfully");
      setEditingRow(null);
      load();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row: ServicePincodeRow) => {
    setTogglingPin(row.pincode);
    try {
      await api.patch(`/service-pincodes/${row.pincode}`, { isActive: !row.isActive });
      toast.success(row.isActive ? "Pincode deactivated" : "Pincode activated");
      load();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingPin(null);
    }
  };

  const handleDelete = async (pincode: string) => {
    setDeletingPin(pincode);
    try {
      await api.delete(`/service-pincodes/${pincode}`);
      toast.success(`Pincode ${pincode} removed`);
      load();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeletingPin(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Service Areas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage pincodes, areas and states where SwiftMart delivers
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setForm(EMPTY_PIN_FORM); }} className="rounded-xl gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Pincode
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pincodes", value: rows.length, color: "text-foreground" },
          { label: "Active", value: activeCount, color: "text-green-600" },
          { label: "States Covered", value: stateGroups.length, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* State breakdown pills */}
      {stateGroups.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pincodes by State</p>
          <div className="flex flex-wrap gap-2">
            {stateGroups.map(([state, count]) => (
              <span key={state} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
                <MapPin className="w-3 h-3" />
                {state}
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 min-w-[18px] text-center text-[10px] font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Add New Service Pincode
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Pincode <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. 733101"
                value={form.pincode}
                maxLength={6}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "") }))}
                className="rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Area / Town <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Balurghat"
                value={form.area}
                onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={handleAdd} disabled={saving} className="rounded-xl gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Pincode
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by pincode, area or state…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-base">{search ? "No results found" : "No service areas yet"}</p>
          <p className="text-sm mt-1">{search ? "Try a different search term" : 'Click "Add Pincode" to get started'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pincode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Area / Town</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">State</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(row => (
                  <tr key={row.pincode} className="hover:bg-muted/20 transition-colors">
                    {editingRow?.pincode === row.pincode ? (
                      <>
                        <td className="px-5 py-3 font-mono font-bold text-primary text-base">{row.pincode}</td>
                        <td className="px-5 py-3">
                          <Input
                            value={editForm.area}
                            onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))}
                            className="rounded-lg h-8 text-sm"
                            placeholder="Area / Town"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={editForm.state}
                            onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))}
                            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                          >
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${row.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="rounded-lg h-8 px-3 gap-1 text-xs">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingRow(null)} className="rounded-lg h-8 px-3 text-xs">
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3">
                          <span className="font-mono font-bold text-primary text-base">{row.pincode}</span>
                        </td>
                        <td className="px-5 py-3 font-medium text-foreground">{row.area || <span className="text-muted-foreground italic text-xs">—</span>}</td>
                        <td className="px-5 py-3 text-muted-foreground text-sm">{row.state}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleToggle(row)}
                            disabled={togglingPin === row.pincode}
                            title={row.isActive ? "Click to deactivate" : "Click to activate"}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                              row.isActive
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                            }`}
                          >
                            {togglingPin === row.pincode
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : row.isActive
                                ? <CheckCircle className="w-3 h-3" />
                                : <XCircle className="w-3 h-3" />
                            }
                            {row.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => { setEditingRow(row); setEditForm({ pincode: row.pincode, area: row.area, state: row.state }); }}
                              className="rounded-lg h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handleDelete(row.pincode)}
                              disabled={deletingPin === row.pincode}
                              className="rounded-lg h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
                              title="Delete"
                            >
                              {deletingPin === row.pincode
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                              }
                            </Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            {filtered.length} pincode{filtered.length !== 1 ? "s" : ""}{search ? ` matching "${search}"` : " total"}
            {" · "}{activeCount} active · {stateGroups.length} state{stateGroups.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DELIVERY PARTNERS TAB
// ============================================================================

interface DeliveryPartnerRow {
  _id: string;
  name: string;
  phone: string;
  vehicle?: string;
  status: string;
  isAvailable: boolean;
  ordersDelivered: number;
  totalEarnings: number;
  createdAt: string;
}

const VEHICLE_OPTIONS = ["Bike", "Bicycle", "Scooter", "E-Bike", "On Foot"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

const EMPTY_DP_FORM = { name: "", phone: "", vehicle: "Bike" };

function DeliveryPartnersTab() {
  const [partners, setPartners] = useState<DeliveryPartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_DP_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; vehicle: string; status: string }>({ name: "", phone: "", vehicle: "Bike", status: "active" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ success: boolean; partners: DeliveryPartnerRow[] }>("/delivery");
      setPartners(d.partners ?? []);
    } catch {
      toast.error("Failed to load delivery partners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return partners.filter(p => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.phone.includes(q) || (p.vehicle ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [partners, search, statusFilter]);

  const stats = useMemo(() => ({
    total: partners.length,
    active: partners.filter(p => p.status === "active").length,
    available: partners.filter(p => p.isAvailable && p.status === "active").length,
    totalOrders: partners.reduce((s, p) => s + p.ordersDelivered, 0),
    totalEarnings: partners.reduce((s, p) => s + p.totalEarnings, 0),
  }), [partners]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!/^\d{10}$/.test(form.phone)) { toast.error("Enter a valid 10-digit phone number"); return; }
    setSaving(true);
    try {
      await api.post("/delivery", { name: form.name.trim(), phone: form.phone, vehicle: form.vehicle });
      toast.success(`${form.name} added as delivery partner`);
      setForm(EMPTY_DP_FORM);
      setShowForm(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add partner";
      toast.error(msg.includes("unique") ? "Phone number already registered" : msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p: DeliveryPartnerRow) => {
    setEditingId(p._id);
    setEditForm({ name: p.name, phone: p.phone, vehicle: p.vehicle ?? "Bike", status: p.status });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editForm.name.trim()) { toast.error("Name is required"); return; }
    if (!/^\d{10}$/.test(editForm.phone)) { toast.error("Enter a valid 10-digit phone number"); return; }
    setSaving(true);
    try {
      await api.patch(`/delivery/${editingId}`, { name: editForm.name.trim(), phone: editForm.phone, vehicle: editForm.vehicle, status: editForm.status, updatedAt: new Date().toISOString() });
      toast.success("Partner updated");
      setEditingId(null);
      load();
    } catch {
      toast.error("Failed to update partner");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (p: DeliveryPartnerRow) => {
    setTogglingId(p._id);
    try {
      await api.patch(`/delivery/${p._id}`, { isAvailable: !p.isAvailable, updatedAt: new Date().toISOString() });
      await load();
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (p: DeliveryPartnerRow) => {
    if (!confirm(`Remove ${p.name} from delivery partners?`)) return;
    setDeletingId(p._id);
    try {
      await api.delete(`/delivery/${p._id}`);
      toast.success(`${p.name} removed`);
      load();
    } catch {
      toast.error("Failed to remove partner");
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "active") return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"><CheckCircle className="w-3 h-3" />Active</span>;
    if (status === "suspended") return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><Ban className="w-3 h-3" />Suspended</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"><Clock className="w-3 h-3" />Inactive</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-6 h-6 text-primary" />Delivery Partners</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage delivery agents for SwiftMart Balurghat</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); }} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />Add Partner
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Active", value: stats.active, icon: CheckCircle },
          { label: "Available Now", value: stats.available, icon: Bike },
          { label: "Orders Delivered", value: stats.totalOrders, icon: ShoppingBag },
          { label: "Total Earnings", value: formatINR(stats.totalEarnings), icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-2xl p-4 neu-card flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"><Icon className="w-3.5 h-3.5" />{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-card rounded-2xl neu-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Add New Delivery Partner</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <Input placeholder="e.g. Rahul Das" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone (10 digits) *</label>
                <Input placeholder="9876543210" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vehicle</label>
                <select
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.vehicle}
                  onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))}
                >
                  {VEHICLE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAdd} disabled={saving} className="min-w-[110px]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Partner"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_DP_FORM); }}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search by name or phone…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "active", "inactive", "suspended"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search || statusFilter !== "all" ? "No partners match your filters" : "No delivery partners yet"}</p>
          {!search && statusFilter === "all" && <p className="text-xs mt-1">Click "Add Partner" to get started</p>}
        </div>
      ) : (
        <div className="bg-card rounded-2xl neu-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Partner</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Vehicle</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Available</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Orders</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Earnings</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  editingId === p._id ? (
                    <tr key={p._id} className="border-b border-border bg-primary/5">
                      <td className="px-5 py-3" colSpan={7}>
                        <div className="flex flex-wrap gap-3 items-end">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Name</label>
                            <Input className="h-8 text-sm w-44" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Phone</label>
                            <Input className="h-8 text-sm w-36" maxLength={10} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Vehicle</label>
                            <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm w-28" value={editForm.vehicle} onChange={e => setEditForm(f => ({ ...f, vehicle: e.target.value }))}>
                              {VEHICLE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase">Status</label>
                            <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm w-28" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit} disabled={saving}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">+91 {p.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                          <Bike className="w-3 h-3" />{p.vehicle ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(p.status)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleAvailability(p)}
                          disabled={!!togglingId || p.status !== "active"}
                          className="disabled:opacity-50"
                          title={p.status !== "active" ? "Only active partners can be toggled" : undefined}
                        >
                          {togglingId === p._id
                            ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            : p.isAvailable
                              ? <ToggleRight className="w-6 h-6 text-green-500" />
                              : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{p.ordersDelivered}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatINR(p.totalEarnings)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(p)} title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(p)} disabled={deletingId === p._id} title="Remove">
                            {deletingId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" />
            {filtered.length} partner{filtered.length !== 1 ? "s" : ""}
            {search || statusFilter !== "all" ? ` matching filters` : " total"}
            {" · "}{stats.active} active · {stats.available} available now
          </div>
        </div>
      )}
    </div>
  );
}
