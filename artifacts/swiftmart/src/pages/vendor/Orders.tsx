import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, AlertCircle, CheckCircle2, XCircle, ChevronDown, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ApiOrderItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  category: string;
}

interface ApiOrder {
  _id: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  items: ApiOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  netAmount: number;
  status: string;
  paymentMethod: string;
  address: { label: string; line1: string; city: string; pincode: string };
  createdAt: string;
}

interface ApiShop {
  _id: string;
  shopName: string;
  ownerId: string;
}

const STATUS_FLOW: Record<string, { label: string; next: string[]; color: string }> = {
  placed:           { label: 'Placed',           next: ['accepted', 'cancelled'], color: 'text-blue-500 bg-blue-500/10' },
  accepted:         { label: 'Accepted',          next: ['preparing', 'cancelled'], color: 'text-amber-500 bg-amber-500/10' },
  preparing:        { label: 'Preparing',         next: ['packed', 'cancelled'], color: 'text-orange-500 bg-orange-500/10' },
  packed:           { label: 'Packed',            next: ['out_for_delivery'], color: 'text-indigo-500 bg-indigo-500/10' },
  out_for_delivery: { label: 'Out for Delivery',  next: ['delivered'], color: 'text-purple-500 bg-purple-500/10' },
  delivered:        { label: 'Delivered',         next: [], color: 'text-emerald-500 bg-emerald-500/10' },
  cancelled:        { label: 'Cancelled',         next: [], color: 'text-red-500 bg-red-500/10' },
  refunded:         { label: 'Refunded',          next: [], color: 'text-pink-500 bg-pink-500/10' },
};

function statusLabel(s: string) {
  return STATUS_FLOW[s]?.label ?? s;
}
function statusColor(s: string) {
  return STATUS_FLOW[s]?.color ?? 'text-muted-foreground bg-background';
}

export default function VendorOrders() {
  const { user, isLoading: authLoading } = useAuth();

  const [shopId, setShopId] = useState<string | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.get<{ success: boolean; orders: ApiOrder[] }>(`/orders?shopId=${sid}&limit=200`);
      setOrders(d.orders);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load orders";
      setError(msg.includes("buffering") ? "Database connecting — please retry." : msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const pollOrders = useCallback(async (sid: string) => {
    try {
      const d = await api.get<{ success: boolean; orders: ApiOrder[] }>(`/orders?shopId=${sid}&limit=200`);
      setOrders(d.orders);
    } catch {
      // silently ignore background poll errors
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api.get<{ success: boolean; shops: ApiShop[] }>(`/shops?ownerId=${user.id}`)
      .then(d => {
        const shop = d.shops[0];
        if (shop) {
          setShopId(shop._id);
          fetchOrders(shop._id);
        } else {
          setError("No shop found for your account.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Could not load your shop. Please try again.");
        setLoading(false);
      });
  }, [user, authLoading, fetchOrders]);

  useEffect(() => {
    if (!shopId) return;
    const id = setInterval(() => pollOrders(shopId), 5000);
    return () => clearInterval(id);
  }, [shopId, pollOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order ${newStatus === 'cancelled' ? 'rejected' : `updated to ${statusLabel(newStatus)}`}`);
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        {[1, 2, 3].map(i => <div key={i} className="h-52 w-full bg-muted rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto">
        <SectionHeader title="Incoming Orders" />
        <div className="mt-6 flex flex-col items-center gap-3 p-8 bg-card rounded-2xl neu-inset text-center">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-muted-foreground text-sm">{error}</p>
          {shopId && (
            <button onClick={() => fetchOrders(shopId)} className="text-primary text-sm font-medium flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader title="Incoming Orders" />
          {shopId && (
            <Button variant="ghost" size="sm" onClick={() => fetchOrders(shopId)} className="text-muted-foreground">
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          )}
        </div>
        <EmptyState
          icon={ClipboardList}
          title="No incoming orders"
          description="You don't have any orders to process right now."
        />
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled', 'refunded'].includes(o.status));

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader title="Incoming Orders" />
        {shopId && (
          <Button variant="ghost" size="sm" onClick={() => fetchOrders(shopId)} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        )}
      </div>

      {activeOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Active Orders ({activeOrders.length})</h3>
          {activeOrders.map(order => <OrderCard key={order._id} order={order} onUpdate={updateStatus} updatingId={updatingId} />)}
        </div>
      )}

      {pastOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Past Orders ({pastOrders.length})</h3>
          {pastOrders.map(order => <OrderCard key={order._id} order={order} onUpdate={updateStatus} updatingId={updatingId} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onUpdate, updatingId }: {
  order: ApiOrder;
  onUpdate: (id: string, status: string) => void;
  updatingId: string | null;
}) {
  const isUpdating = updatingId === order._id;
  const flow = STATUS_FLOW[order.status];
  const nextStatuses = flow?.next ?? [];
  const isTerminal = nextStatuses.length === 0;

  const progressionStatuses = nextStatuses.filter(s => s !== 'cancelled');
  const canCancel = nextStatuses.includes('cancelled');
  const isPlaced = order.status === 'placed';

  return (
    <div className="bg-card p-5 rounded-2xl neu-card space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-base font-mono">#{order._id.slice(-8).toUpperCase()}</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              {order.paymentMethod}
            </span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", statusColor(order.status))}>
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{order.customerName} · {order.customerPhone}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="mt-2 text-xs bg-background p-2 rounded-lg neu-inset">
            <span className="font-medium text-foreground">{order.address.label}</span>
            {' · '}
            <span className="text-muted-foreground">{order.address.line1}, {order.address.city} - {order.address.pincode}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:items-end shrink-0">
          {/* Accept/Reject for new orders */}
          {isPlaced && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-none"
                onClick={() => onUpdate(order._id, 'accepted')}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl shadow-none"
                onClick={() => onUpdate(order._id, 'cancelled')}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                Reject
              </Button>
            </div>
          )}

          {/* Progression dropdown for non-placed active orders */}
          {!isPlaced && !isTerminal && progressionStatuses.length > 0 && (
            <div className="relative">
              <select
                value={order.status}
                onChange={(e) => onUpdate(order._id, e.target.value)}
                disabled={isUpdating}
                className="appearance-none bg-background neu-inset border-none pl-3 pr-8 py-2 rounded-xl text-sm font-bold capitalize focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50"
              >
                <option value={order.status}>{statusLabel(order.status)}</option>
                {progressionStatuses.map(s => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
            </div>
          )}

          {/* Cancel button for non-placed orders that support it */}
          {!isPlaced && canCancel && !isTerminal && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl"
              onClick={() => onUpdate(order._id, 'cancelled')}
              disabled={isUpdating}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 text-sm">Items ({order.items.length})</h4>
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-background rounded-lg neu-inset p-1.5 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-sm line-clamp-1">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">{item.qty} × {formatINR(item.price)}</div>
                </div>
              </div>
              <div className="font-bold text-sm">
                {formatINR(item.price * item.qty)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-border flex justify-between items-center">
        <span className="font-bold text-sm text-muted-foreground">
          Total · {order.deliveryCharge > 0 ? `incl. ₹${order.deliveryCharge} delivery` : 'free delivery'}
        </span>
        <span className="font-bold text-lg text-primary">{formatINR(order.netAmount)}</span>
      </div>
    </div>
  );
}
