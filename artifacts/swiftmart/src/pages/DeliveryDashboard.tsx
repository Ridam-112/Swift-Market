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
  ToggleLeft, ToggleRight, Truck, ChevronRight,
  RefreshCw, AlertCircle, Banknote, CreditCard, ShieldCheck,
  TrendingUp, Map,
} from "lucide-react";
import DeliveryMapSheet from "@/components/DeliveryMapSheet";

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
  shopAddress: { line1?: string; line2?: string; city?: string; pincode?: string };
  items: { name: string; qty: number; price: number }[];
  netAmount: number;
  deliveryCharge: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  address: { line1?: string; line2?: string; city?: string; pincode?: string };
  createdAt: string;
}

type Section = "overview" | "orders";

interface CodConfirm {
  orderId: string;
  amount: number;
}

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

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function PaymentBadge({ method, status }: { method: string; status: string }) {
  const isCod = (method ?? "COD").toUpperCase() === "COD";
  const isPaid = status === "paid";

  if (!isCod) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <CreditCard className="w-3 h-3" /> Online · Paid
      </span>
    );
  }

  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <ShieldCheck className="w-3 h-3" /> COD · Collected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <Banknote className="w-3 h-3" /> COD · Collect Cash
    </span>
  );
}

function OrderCard({
  order,
  onUpdateStatus,
  onRequestCodConfirm,
  onOpenMap,
  updating,
}: {
  order: DeliveryOrder;
  onUpdateStatus: (orderId: string, status: string, confirmCash?: boolean) => void;
  onRequestCodConfirm: (orderId: string, amount: number) => void;
  onOpenMap: (orderId: string) => void;
  updating: string | null;
}) {
  const address = order.address ?? {};
  const addressStr = [address.line1, address.line2, address.city, address.pincode]
    .filter(Boolean).join(", ");

  const canPickUp = ["packed", "confirmed", "accepted", "preparing"].includes(order.status);
  const canDeliver = order.status === "out_for_delivery";
  const isActive = canPickUp || canDeliver;
  const isCod = (order.paymentMethod ?? "COD").toUpperCase() === "COD";
  const needsCashCollection = order.status === "delivered" && isCod && order.paymentStatus !== "paid";

  return (
    <div className={`bg-card rounded-3xl p-4 space-y-4 ${isActive ? "ring-2 ring-primary/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{order.shopName}</p>
          <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-start gap-2">
          <Package className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{order.customerName}</span>
          <a href={`tel:${order.customerPhone}`} className="text-primary font-medium flex items-center gap-1 ml-auto">
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

      <div className="space-y-3 pt-1 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium">{formatINR(order.netAmount)} total</p>
            <p className="text-xs font-semibold text-primary">Your cut: {formatINR(order.deliveryCharge)}</p>
          </div>
          <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
        </div>

        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 text-xs gap-1 px-3 shadow-none"
              onClick={() => onOpenMap(order._id)}
            >
              <Map className="w-3 h-3" /> Map
            </Button>
          )}
          {canPickUp && (
            <Button
              size="sm"
              className="flex-1 rounded-xl h-9 text-xs shadow-none"
              disabled={updating === order._id}
              onClick={() => onUpdateStatus(order._id, "out_for_delivery")}
            >
              {updating === order._id
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <><Truck className="w-3 h-3 mr-1" />Picked Up</>}
            </Button>
          )}
          {canDeliver && (
            <Button
              size="sm"
              className="flex-1 rounded-xl h-9 text-xs shadow-none bg-green-600 hover:bg-green-700 text-white"
              disabled={updating === order._id}
              onClick={() => {
                if (isCod) {
                  onRequestCodConfirm(order._id, order.netAmount);
                } else {
                  onUpdateStatus(order._id, "delivered");
                }
              }}
            >
              {updating === order._id
                ? <RefreshCw className="w-3 h-3 animate-spin" />
                : <><CheckCircle className="w-3 h-3 mr-1" />Delivered</>}
            </Button>
          )}
        </div>

        {needsCashCollection && (
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold"
            onClick={() => onRequestCodConfirm(order._id, order.netAmount)}
          >
            <Banknote className="w-3.5 h-3.5" />
            Confirm Cash Collected · {formatINR(order.netAmount)}
          </button>
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
  const todayOrders = orders.filter(o => o.status === "delivered" && isToday(o.createdAt));
  const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.deliveryCharge ?? 0), 0);

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Delivered", value: partner.ordersDelivered, icon: CheckCircle, color: "text-green-500" },
          { label: "Today", value: todayOrders.length, icon: Clock, color: "text-blue-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 neu-card text-center space-y-1">
            <Icon className={`w-5 h-5 mx-auto ${color}`} />
            <p className="font-bold text-xl">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Earnings", value: formatINR(partner.totalEarnings), icon: IndianRupee, color: "text-primary" },
          { label: "Today's Revenue", value: formatINR(todayEarnings), icon: TrendingUp, color: "text-emerald-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 neu-card text-center space-y-1">
            <Icon className={`w-5 h-5 mx-auto ${color}`} />
            <p className="font-bold text-lg">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> Active Orders
            <Badge className="ml-auto">{activeOrders.length}</Badge>
          </h3>
          <p className="text-xs text-muted-foreground -mt-1">Tap "Picked Up" once you collect, then "Delivered" when done.</p>
          {activeOrders.slice(0, 3).map(o => {
            const isCod = (o.paymentMethod ?? "COD").toUpperCase() === "COD";
            return (
              <div key={o._id} className="bg-card rounded-2xl p-4 ring-2 ring-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{o.shopName}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? ""}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{o.customerName} · {o.customerPhone}</p>
                <p className="text-xs text-muted-foreground">{[o.address?.line1, o.address?.city].filter(Boolean).join(", ")}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-primary">{formatINR(o.netAmount)}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isCod ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                    {isCod ? "COD" : "Online"}
                  </span>
                </div>
              </div>
            );
          })}
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
  onRequestCodConfirm,
  onOpenMap,
  updating,
}: {
  orders: DeliveryOrder[];
  onUpdateStatus: (orderId: string, status: string, confirmCash?: boolean) => void;
  onRequestCodConfirm: (orderId: string, amount: number) => void;
  onOpenMap: (orderId: string) => void;
  updating: string | null;
}) {
  const active = orders.filter(o =>
    ["packed", "confirmed", "accepted", "preparing", "out_for_delivery"].includes(o.status)
  );
  const needsPayment = orders.filter(o =>
    o.status === "delivered" && (o.paymentMethod ?? "COD").toUpperCase() === "COD" && o.paymentStatus !== "paid"
  );
  const past = orders.filter(o => !active.includes(o) && !needsPayment.includes(o));

  return (
    <div className="space-y-6">
      {needsPayment.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Banknote className="w-4 h-4" /> Awaiting Cash Confirmation ({needsPayment.length})
          </h3>
          {needsPayment.map(o => (
            <OrderCard key={o._id} order={o} onUpdateStatus={onUpdateStatus} onRequestCodConfirm={onRequestCodConfirm} onOpenMap={onOpenMap} updating={updating} />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 text-primary">
            <Truck className="w-4 h-4" /> Active ({active.length})
          </h3>
          {active.map(o => (
            <OrderCard key={o._id} order={o} onUpdateStatus={onUpdateStatus} onRequestCodConfirm={onRequestCodConfirm} onOpenMap={onOpenMap} updating={updating} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="w-4 h-4" /> History ({past.length})
          </h3>
          {past.map(o => (
            <OrderCard key={o._id} order={o} onUpdateStatus={onUpdateStatus} onRequestCodConfirm={onRequestCodConfirm} onOpenMap={onOpenMap} updating={updating} />
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
  const [codConfirm, setCodConfirm] = useState<CodConfirm | null>(null);
  const [mapOrderId, setMapOrderId] = useState<string | null>(null);

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
    const interval = setInterval(fetchData, 10000);
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

  const handleUpdateStatus = async (orderId: string, status: string, confirmCash?: boolean) => {
    setUpdating(orderId);
    try {
      const body: Record<string, unknown> = { status };
      if (confirmCash !== undefined) body["confirmCash"] = confirmCash;
      const data = await api.patch<{ success: boolean }>(`/delivery/me/orders/${orderId}/status`, body);
      if (data.success) {
        if (status === "delivered") {
          toast.success(confirmCash ? "Delivered & cash collected! 💰" : "Order marked as delivered!");
        } else {
          toast.success("Order picked up!");
        }
        await fetchData();
      }
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(null);
    }
  };

  const handleCodDeliver = async (confirmCash: boolean) => {
    if (!codConfirm) return;
    const { orderId } = codConfirm;
    setCodConfirm(null);
    await handleUpdateStatus(orderId, "delivered", confirmCash);
  };

  const handleCodConfirmPaymentOnly = async (orderId: string) => {
    setUpdating(orderId);
    try {
      const data = await api.patch<{ success: boolean }>(`/delivery/me/orders/${orderId}/confirm-payment`, {});
      if (data.success) {
        toast.success("Cash collection confirmed!");
        await fetchData();
      }
    } catch {
      toast.error("Failed to confirm payment");
    } finally {
      setUpdating(null);
    }
  };

  const handleExit = () => setLocation("/profile");

  const handleOpenMap = (orderId: string) => setMapOrderId(orderId);
  const handleCloseMap = () => setMapOrderId(null);

  // Picked up from within the map: update status then keep map open so it
  // automatically transitions to show the customer's location.
  const handleMapPickedUp = async (orderId: string) => {
    await handleUpdateStatus(orderId, "out_for_delivery");
    // Map stays open — orders state is refreshed by fetchData inside handleUpdateStatus
  };

  // Delivered from within the map: OTP was already verified inside DeliveryMapSheet,
  // so just refresh data. The sheet handles its own close.
  const handleMapDelivered = (_orderId: string) => {
    fetchData();
  };

  const mapOrder = mapOrderId ? orders.find(o => o._id === mapOrderId) ?? null : null;

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
                  onRequestCodConfirm={(orderId, amount) => {
                    const order = orders.find(o => o._id === orderId);
                    if (order?.status === "delivered") {
                      handleCodConfirmPaymentOnly(orderId);
                    } else {
                      setCodConfirm({ orderId, amount });
                    }
                  }}
                  onOpenMap={handleOpenMap}
                  updating={updating}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delivery Map Sheet */}
      {mapOrder && (
        <DeliveryMapSheet
          isOpen={!!mapOrder}
          onClose={handleCloseMap}
          order={mapOrder}
          onPickedUp={handleMapPickedUp}
          onDelivered={handleMapDelivered}
          updating={updating}
        />
      )}

      {/* COD Cash Confirmation Modal */}
      <AnimatePresence>
        {codConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCodConfirm(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 space-y-5 shadow-2xl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Banknote className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Collect Cash on Delivery</h2>
                  <p className="text-muted-foreground text-sm">Order total: <span className="font-bold text-foreground">{formatINR(codConfirm.amount)}</span></p>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-200">
                <p className="font-semibold">This is a Cash on Delivery order.</p>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">Please collect <strong>{formatINR(codConfirm.amount)}</strong> from the customer before marking as delivered. Did you collect the cash?</p>
              </div>

              <div className="space-y-2.5">
                <Button
                  className="w-full h-14 rounded-2xl text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-none"
                  onClick={() => handleCodDeliver(true)}
                  disabled={!!updating}
                >
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Yes, I collected {formatINR(codConfirm.amount)}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-2xl text-sm"
                  onClick={() => setCodConfirm(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
