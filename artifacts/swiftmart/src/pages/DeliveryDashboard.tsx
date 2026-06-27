import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bike, Package, CheckCircle, Clock, MapPin, Phone, User,
  LogOut, Menu, X, LayoutDashboard, ClipboardList, IndianRupee,
  ToggleLeft, ToggleRight, Truck, TrendingUp, ChevronRight,
  RefreshCw, AlertCircle,
} from "lucide-react";

interface DeliveryPartner {
  _id: string;
  name: string;
  phone: string;
  vehicle?: string;
  isAvailable: boolean;
  status: string;
  totalEarnings: number;
  ordersDelivered: number;
  currentOrderId?: string;
}

interface DeliveryOrder {
  _id: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  items: { name: string; qty: number; price: number }[];
  netAmount: number;
  deliveryCharge: number;
  status: string;
  address: { line1?: string; line2?: string; city?: string; pincode?: string };
  createdAt: string;
  paymentMethod: string;
}

type Section = "overview" | "orders";

const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  accepted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  preparing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  confirmed: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  packed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  out_for_delivery: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function OrderCard({
  order,
  onUpdateStatus,
  updating,
}: {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: string) => void;
  updating: string | null;
}) {
  const address = order.address ?? {};
  const addressStr = [address.line1, address.line2, address.city, address.pincode]
    .filter(Boolean).join(", ");

  const canPickUp = order.status === "packed" || order.status === "confirmed" || order.status === "accepted" || order.status === "preparing";
  const canDeliver = order.status === "out_for_delivery";
  const isActive = canPickUp || canDeliver;

  return (
    <div className={`bg-card rounded-3xl p-4 space-y-4 ${isActive ? "ring-2 ring-primary/30" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-sm">{order.shopName}</p>
          <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-start gap-2">
          <Package className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</span>
        </div>
        <div className="flex items-start gap-2">
          <User className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{order.customerName}</span>
          <a href={`tel:${order.customerPhone}`} className="text-primary font-medium flex items-center gap-1">
            <Phone className="w-3 h-3" />{order.customerPhone}
          </a>
        </div>
        {addressStr && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{addressStr}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">{order.paymentMethod} · {formatINR(order.netAmount)}</p>
          <p className="text-xs font-medium text-primary">Your cut: {formatINR(order.deliveryCharge)}</p>
        </div>
        {canPickUp && (
          <Button
            size="sm"
            className="rounded-xl h-8 text-xs shadow-none"
            disabled={updating === order._id}
            onClick={() => onUpdateStatus(order._id, "out_for_delivery")}
          >
            {updating === order._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><Truck className="w-3 h-3 mr-1" />Picked Up</>}
          </Button>
        )}
        {canDeliver && (
          <Button
            size="sm"
            className="rounded-xl h-8 text-xs shadow-none bg-green-600 hover:bg-green-700 text-white"
            disabled={updating === order._id}
            onClick={() => onUpdateStatus(order._id, "delivered")}
          >
            {updating === order._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" />Delivered</>}
          </Button>
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  partner,
  orders,
  onToggleAvailability,
  toggling,
  onNavigate,
}: {
  partner: DeliveryPartner;
  orders: DeliveryOrder[];
  onToggleAvailability: () => void;
  toggling: boolean;
  onNavigate: (s: Section) => void;
}) {
  const activeOrders = orders.filter(o =>
    ["packed", "confirmed", "accepted", "preparing", "out_for_delivery"].includes(o.status)
  );
  const todayDelivered = orders.filter(o => {
    if (o.status !== "delivered") return false;
    const today = new Date();
    const d = new Date(o.createdAt);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  }).length;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="bg-card rounded-3xl p-5 neu-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${partner.isAvailable ? "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{partner.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{partner.vehicle ?? "Delivery Partner"}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${partner.isAvailable ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
            {partner.isAvailable ? "Online" : "Offline"}
          </div>
        </div>

        <div className="bg-background rounded-2xl p-4 neu-inset flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Availability</p>
            <p className="text-xs text-muted-foreground">
              {partner.isAvailable ? "You are receiving orders" : "You are not receiving orders"}
            </p>
          </div>
          <button
            onClick={onToggleAvailability}
            disabled={toggling || partner.status !== "active"}
            className="disabled:opacity-50"
          >
            {partner.isAvailable
              ? <ToggleRight className="w-10 h-10 text-green-500" />
              : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
          </button>
        </div>

        {partner.status === "suspended" && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Your account has been suspended. Contact admin.
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Delivered", value: partner.ordersDelivered, icon: CheckCircle, color: "text-green-500" },
          { label: "Today", value: todayDelivered, icon: Clock, color: "text-blue-500" },
          { label: "Earnings", value: formatINR(partner.totalEarnings), icon: IndianRupee, color: "text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 neu-card text-center space-y-1">
            <Icon className={`w-5 h-5 mx-auto ${color}`} />
            <p className="font-bold text-lg">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> Active Orders
            <Badge className="ml-auto">{activeOrders.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground -mt-1">Tap "Picked Up" once you collect, then "Delivered" when done.</p>
          {activeOrders.slice(0, 3).map(o => (
            <div key={o._id} className="bg-card rounded-2xl p-4 ring-2 ring-primary/20 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{o.shopName}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? ""}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{o.customerName} · {o.customerPhone}</p>
              <p className="text-xs text-muted-foreground">{[o.address?.line1, o.address?.city].filter(Boolean).join(", ")}</p>
            </div>
          ))}
          {activeOrders.length > 3 && (
            <Button variant="ghost" size="sm" className="w-full text-primary" onClick={() => onNavigate("orders")}>
              View all {activeOrders.length} active orders <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {activeOrders.length === 0 && (
        <div className="bg-card rounded-3xl p-8 text-center space-y-2 neu-card">
          <Truck className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-muted-foreground">No active orders</p>
          <p className="text-xs text-muted-foreground">
            {partner.isAvailable ? "Stay online to receive orders from admin." : "Go online to start receiving orders."}
          </p>
        </div>
      )}
    </div>
  );
}

function OrdersTab({
  orders,
  onUpdateStatus,
  updating,
}: {
  orders: DeliveryOrder[];
  onUpdateStatus: (orderId: string, status: string) => void;
  updating: string | null;
}) {
  const active = orders.filter(o =>
    ["packed", "confirmed", "accepted", "preparing", "out_for_delivery"].includes(o.status)
  );
  const past = orders.filter(o => !active.includes(o));

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 text-primary">
            <Truck className="w-4 h-4" /> Active ({active.length})
          </h3>
          {active.map(o => (
            <OrderCard key={o._id} order={o} onUpdateStatus={onUpdateStatus} updating={updating} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="w-4 h-4" /> History ({past.length})
          </h3>
          {past.map(o => (
            <OrderCard key={o._id} order={o} onUpdateStatus={onUpdateStatus} updating={updating} />
          ))}
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-card rounded-3xl p-10 text-center space-y-2 neu-card">
          <Package className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-semibold text-muted-foreground">No orders assigned yet</p>
          <p className="text-xs text-muted-foreground">Admin will assign orders to you.</p>
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "My Orders", icon: ClipboardList },
];

function SidebarContent({
  active,
  setActive,
  onClose,
  partner,
  onLogout,
}: {
  active: Section;
  setActive: (s: Section) => void;
  onClose?: () => void;
  partner: DeliveryPartner | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 px-2 py-4 mb-4 border-b border-border">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Bike className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{partner?.name ?? "Delivery"}</p>
          <p className="text-xs text-muted-foreground">Delivery Partner</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActive(id); onClose?.(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
              active === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mt-2"
      >
        <LogOut className="w-4 h-4" />
        Exit to App
      </button>
    </div>
  );
}

export default function DeliveryDashboard() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<{ success: boolean; orders: DeliveryOrder[]; partner: DeliveryPartner }>("/delivery/me/orders");
      if (data.success) {
        setOrders(data.orders);
        setPartner(data.partner);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleAvailability = async () => {
    if (!partner) return;
    setToggling(true);
    try {
      const data = await api.patch<{ success: boolean; partner: DeliveryPartner }>("/delivery/me/availability", {});
      if (data.success) {
        setPartner(data.partner);
        toast.success(data.partner.isAvailable ? "You are now Online" : "You are now Offline");
      }
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setToggling(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      const data = await api.patch<{ success: boolean }>(`/delivery/me/orders/${orderId}/status`, { status });
      if (data.success) {
        toast.success(status === "delivered" ? "Order marked as delivered!" : "Order picked up!");
        await fetchData();
      }
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  const handleExit = () => setLocation("/profile");

  const SECTION_TITLES: Record<Section, string> = {
    overview: "Overview",
    orders: "My Orders",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-foreground">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Delivery Panel</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${partner?.isAvailable ? "bg-green-500" : "bg-muted-foreground"}`} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-card border-r border-border md:hidden overflow-y-auto"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <SidebarContent
                active={activeSection}
                setActive={setActiveSection}
                onClose={() => setMobileMenuOpen(false)}
                partner={partner}
                onLogout={handleExit}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-card border-r border-border sticky top-0 flex-col overflow-y-auto">
        <SidebarContent
          active={activeSection}
          setActive={setActiveSection}
          partner={partner}
          onLogout={handleExit}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 h-[100dvh] overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pt-20 md:pt-8 pb-10 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{SECTION_TITLES[activeSection]}</h1>
            <button
              onClick={fetchData}
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeSection === "overview" && partner && (
                <OverviewTab
                  partner={partner}
                  orders={orders}
                  onToggleAvailability={handleToggleAvailability}
                  toggling={toggling}
                  onNavigate={setActiveSection}
                />
              )}
              {activeSection === "orders" && (
                <OrdersTab
                  orders={orders}
                  onUpdateStatus={handleUpdateStatus}
                  updating={updating}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
