import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";
import { 
  LayoutDashboard, Store, Users, FileText, TrendingUp, Ban, CheckCircle, 
  XCircle, Clock, Search, Shield, Star, ShoppingBag, Trash2, Eye, 
  ChevronDown, ChevronUp, Award, Building2, CreditCardIcon, User, AlertCircle
} from "lucide-react";
import { VendorApplication, VendorStatus, Vendor } from "@/types";
import { vendors } from "@/data/vendors";
import { platformRevenue } from "@/data/adminData";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

type TabValue = 'overview' | 'requests' | 'shops' | 'customers';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');

  return (
    <div className="pb-24 pt-4 px-4 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col space-y-2 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 neu-inset border-none gap-1 py-1">
            <Shield className="w-3 h-3" /> Admin
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">SwiftMart Platform</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:border-b md:border-border md:pb-0">
        <TabButton id="overview" active={activeTab} onClick={setActiveTab} icon={LayoutDashboard} label="Overview" />
        <RequestsTabButton id="requests" active={activeTab} onClick={setActiveTab} />
        <TabButton id="shops" active={activeTab} onClick={setActiveTab} icon={Store} label="Shops" />
        <TabButton id="customers" active={activeTab} onClick={setActiveTab} icon={Users} label="Customers" />
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'requests' && <ShopRequestsTab />}
            {activeTab === 'shops' && <ShopsTab />}
            {activeTab === 'customers' && <CustomersTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ id, active, onClick, icon: Icon, label, badge }: any) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl md:rounded-b-none md:rounded-t-xl text-sm font-medium whitespace-nowrap transition-all ${
        isActive 
          ? 'bg-primary text-primary-foreground neu-card md:neu-none md:bg-transparent md:border-b-2 md:border-primary md:text-primary md:shadow-none' 
          : 'bg-background text-muted-foreground neu-inset md:neu-none md:bg-transparent md:hover:bg-muted/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge > 0 && (
        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-foreground/20 text-primary-foreground md:bg-primary md:text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function RequestsTabButton({ id, active, onClick }: any) {
  const { applications } = useAuth();
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  return <TabButton id={id} active={active} onClick={onClick} icon={FileText} label="Shop Requests" badge={pendingCount} />;
}

function OverviewTab() {
  const { applications, adminCustomers, bannedVendorIds } = useAuth();
  
  const allShops = useMemo(() => {
    return [
      ...vendors,
      ...applications.filter(a => a.status === 'approved').map(a => ({
        id: a.id,
        storeName: a.storeName,
        ownerName: a.ownerName,
        category: a.storeCategory,
        tagline: a.storeDescription,
        rating: 0,
        totalOrders: 0,
        isOpen: false,
        eta: "N/A",
        image: `/assets/cat-${a.storeCategory}.png`,
        pincode: "N/A",
        city: "N/A",
        phone: a.userPhone,
        status: 'active',
        joinedAt: a.submittedAt,
        revenue: 0,
        commission: 0
      }))
    ];
  }, [applications]);

  const activeShops = allShops.filter(v => !bannedVendorIds.includes(v.id));
  
  const totalRevenue = activeShops.reduce((sum, v) => sum + (v.revenue || 0), 0);
  const platformComm = activeShops.reduce((sum, v) => sum + (v.commission || 0), 0);

  const topShops = [...activeShops].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 3);

  const formatLargeValue = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return formatINR(val);
  };

  const recentActivity = [
    { id: 1, type: 'order', icon: ShoppingBag, title: "New order placed", desc: "ORD-1005 at Sharma Kirana", time: "10 mins ago", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { id: 2, type: 'shop', icon: Store, title: "New shop approved", desc: "Fresh Mart", time: "2 hours ago", color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/20" },
    { id: 3, type: 'customer', icon: Users, title: "New customer joined", desc: "Priya Singh", time: "5 hours ago", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
    { id: 4, type: 'order', icon: ShoppingBag, title: "New order placed", desc: "ORD-1004 at StyleZone", time: "1 day ago", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20" },
    { id: 5, type: 'ban', icon: Ban, title: "Shop banned", desc: "Super Store", time: "1 day ago", color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20" },
    { id: 6, type: 'customer', icon: Users, title: "New customer joined", desc: "Amit Patel", time: "2 days ago", color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatLargeValue(totalRevenue)} icon={TrendingUp} color="text-green-600" />
        <StatCard title="Platform Commission" value={formatLargeValue(platformComm)} icon={Award} color="text-amber-600" />
        <StatCard title="Active Shops" value={activeShops.length} icon={Store} color="text-blue-600" />
        <StatCard title="Total Customers" value={adminCustomers.length} icon={Users} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card p-6 rounded-3xl neu-card">
          <h3 className="text-lg font-bold text-foreground mb-4">Revenue This Week</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
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
                <Area type="monotone" dataKey="commission" name="Commission" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorComm)" />
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
                    <p className="text-sm font-bold text-foreground">{formatLargeValue(shop.revenue || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl neu-card">
            <h3 className="text-lg font-bold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent hidden-before">
              {recentActivity.map((activity, i) => (
                <div key={activity.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${activity.bg} ${activity.color}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.desc} · {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-card p-4 md:p-6 rounded-2xl neu-card flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`w-5 h-5 ${color} opacity-80`} />
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ShopRequestsTab() {
  const { applications, approveApplication, rejectApplication } = useAuth();
  const [filter, setFilter] = useState<VendorStatus | 'all'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredApplications = applications.filter(app => filter === 'all' || app.status === filter);

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const handleApprove = (id: string) => {
    approveApplication(id);
    toast.success("Application approved");
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectApplication(id, rejectReason);
    setRejectingId(null);
    setRejectReason("");
    toast.success("Application rejected");
  };

  return (
    <div className="space-y-6">
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
                    <span className="font-mono text-foreground">{app.panNumber.substring(0,2)}***{app.panNumber.substring(5,6)}***{app.panNumber.substring(9)}</span>
                    {app.gstNumber && (
                      <>
                        <span className="text-muted-foreground">GST:</span>
                        <span className="font-mono text-foreground">{app.gstNumber.substring(0,2)}***{app.gstNumber.substring(12)}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <CreditCardIcon className="w-4 h-4" /> Payment Details
                  </div>
                  <div className="text-sm grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">UPI:</span>
                    <span className="text-foreground">{app.upiId}</span>
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-mono text-foreground">****{app.bankAccountNumber.slice(-4)}</span>
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
                        <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }} className="flex-1">
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)} className="flex-1 bg-red-600 hover:bg-red-700 shadow-none neu-card text-white">
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

function ShopsTab() {
  const { applications, bannedVendorIds, banVendor, unbanVendor, removeVendor } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [banningId, setBanningId] = useState<string | null>(null);
  
  const allShops = useMemo(() => {
    return [
      ...vendors,
      ...applications.filter(a => a.status === 'approved').map(a => ({
        id: a.id,
        storeName: a.storeName,
        ownerName: a.ownerName,
        category: a.storeCategory,
        tagline: a.storeDescription,
        rating: 0,
        totalOrders: 0,
        isOpen: false,
        eta: "N/A",
        image: `/assets/cat-${a.storeCategory}.png`,
        pincode: "N/A",
        city: "N/A",
        phone: a.userPhone,
        status: 'active',
        joinedAt: a.submittedAt,
        revenue: 0,
        commission: 0
      }))
    ];
  }, [applications]);

  const filteredShops = allShops.filter(shop => {
    const isMatch = shop.storeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    return isMatch;
  });

  const handleBan = (id: string) => {
    banVendor(id);
    setBanningId(null);
    toast.success("Shop has been banned");
  };

  const handleUnban = (id: string) => {
    unbanVendor(id);
    toast.success("Shop has been unbanned");
  };

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to permanently remove this shop?")) {
      removeVendor(id);
      toast.success("Shop removed permanently");
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search shops by name or owner..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-11 h-12 bg-card neu-inset rounded-2xl border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>

      <div className="space-y-4">
        {filteredShops.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No shops found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredShops.map(shop => {
            const isBanned = bannedVendorIds.includes(shop.id);
            return (
              <div key={shop.id} className="bg-card p-5 rounded-3xl neu-card flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <img src={shop.image} alt={shop.storeName} className="w-16 h-16 rounded-xl object-cover bg-muted" />
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{shop.storeName}</h3>
                    <p className="text-sm text-muted-foreground">{shop.ownerName}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">{shop.category}</Badge>
                  </div>
                </div>

                <div className="flex gap-4 md:gap-8 justify-between md:justify-center px-2 py-3 bg-background rounded-xl neu-inset md:neu-none md:bg-transparent md:p-0">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders</p>
                    <p className="font-bold text-foreground">{shop.totalOrders}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
                    <p className="font-bold text-foreground">{formatINR(shop.revenue || 0)}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comm</p>
                    <p className="font-bold text-green-600">{formatINR(shop.commission || 0)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between md:justify-end flex-1 md:flex-none">
                  <Badge className={`px-2 py-1 border-none ${isBanned ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}`}>
                    {isBanned ? 'Banned' : 'Active'}
                  </Badge>
                  
                  <div className="flex gap-2">
                    {isBanned ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleUnban(shop.id)} className="border-green-200 text-green-600 hover:bg-green-50 h-8 rounded-lg">
                          Unban
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRemove(shop.id)} className="h-8 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : banningId === shop.id ? (
                      <div className="flex gap-2 bg-background p-1 rounded-lg neu-inset">
                        <Button size="sm" variant="ghost" onClick={() => setBanningId(null)} className="h-7 text-xs">Cancel</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleBan(shop.id)} className="h-7 text-xs">Confirm Ban</Button>
                      </div>
                    ) : (
                      <>
                        <Link href={`/shop/${shop.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline" onClick={() => setBanningId(shop.id)} className="border-red-200 text-red-600 hover:bg-red-50 h-8 rounded-lg">
                          Ban Shop
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CustomersTab() {
  const { adminCustomers, banCustomer, unbanCustomer } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all'|'active'|'banned'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCustomers = adminCustomers.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2);
  const getColors = (name: string) => {
    const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
    const idx = name.length % colors.length;
    return colors[idx];
  };

  const isNewCustomer = (joinedAt: string) => {
    const joined = new Date(joinedAt).getTime();
    const now = new Date().getTime();
    return (now - joined) < 7 * 24 * 60 * 60 * 1000;
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 rounded-sm">{part}</span> 
            : part
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search customers by name or phone..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-card neu-inset rounded-2xl border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-2 bg-card p-1 rounded-2xl neu-inset">
          {(['all', 'active', 'banned'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl neu-inset text-muted-foreground border border-dashed border-border/50">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-card rounded-3xl neu-card overflow-hidden transition-all">
              <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getColors(customer.name)}`}>
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{highlightText(customer.name, searchQuery)}</h3>
                    <p className="text-sm text-muted-foreground">{highlightText(customer.phone, searchQuery)} · {customer.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(customer.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap flex-1 md:justify-center">
                  <Badge variant="outline" className="bg-background neu-inset border-none text-xs text-muted-foreground">
                    {customer.totalOrders} orders
                  </Badge>
                  <Badge variant="outline" className="bg-background neu-inset border-none text-xs text-muted-foreground">
                    {formatINR(customer.totalSpent)} spent
                  </Badge>
                  {customer.lastOrderAt && (
                    <Badge variant="outline" className="bg-background neu-inset border-none text-xs text-muted-foreground">
                      Last order: {Math.floor((new Date().getTime() - new Date(customer.lastOrderAt).getTime()) / (1000 * 3600 * 24))}d ago
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 justify-between md:justify-end flex-1 md:flex-none">
                  <div className="flex gap-2">
                    {customer.status === 'banned' && <Badge className="bg-red-100 text-red-800 border-none hover:bg-red-100">Banned</Badge>}
                    {customer.status === 'active' && isNewCustomer(customer.joinedAt) && <Badge className="bg-blue-100 text-blue-800 border-none hover:bg-blue-100">New</Badge>}
                    {customer.status === 'active' && customer.totalOrders === 0 && <Badge className="bg-gray-100 text-gray-800 border-none hover:bg-gray-100">No Orders</Badge>}
                    {customer.status === 'active' && !isNewCustomer(customer.joinedAt) && customer.totalOrders > 0 && <Badge className="bg-green-100 text-green-800 border-none hover:bg-green-100">Active</Badge>}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                    className="rounded-xl bg-background neu-inset"
                  >
                    View Details {expandedId === customer.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === customer.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/50 bg-background/50 overflow-hidden"
                  >
                    <div className="p-5 space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4" /> Order History
                        </h4>
                        {customer.orders.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No orders placed yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {customer.orders.map(order => (
                              <div key={order.id} className="bg-background p-3 rounded-2xl neu-inset text-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-medium text-foreground">{order.id}</span>
                                    <span className="text-muted-foreground text-xs">{new Date(order.placedAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-muted-foreground text-xs">
                                    {order.items[0]?.name} {order.items.length > 1 ? `& ${order.items.length - 1} more` : ''}
                                  </p>
                                  <p className="text-xs font-medium text-primary mt-1">{order.vendorName}</p>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                  <div>
                                    <p className="font-bold text-foreground">{formatINR(order.total)}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">{order.paymentMethod}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px] uppercase">
                                    {order.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-4 border-t border-border/50">
                        {customer.status === 'banned' ? (
                          <Button onClick={() => { unbanCustomer(customer.id); toast.success("Customer unbanned"); }} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 rounded-xl">
                            Unban Customer
                          </Button>
                        ) : (
                          <Button onClick={() => { banCustomer(customer.id); toast.success("Customer banned"); }} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-none neu-card">
                            Ban Customer
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}