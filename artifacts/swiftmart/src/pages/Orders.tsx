import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { PackageX, Package, Truck, CheckCircle2, Clock, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiOrder {
  _id: string;
  shopName?: string;
  items: { name: string; qty: number; price: number; image?: string }[];
  netAmount?: number;
  subtotal?: number;
  status: string;
  paymentMethod?: string;
  createdAt: string;
}

function getStatusDisplay(status: string) {
  switch (status) {
    case 'placed': return { label: 'Placed', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' };
    case 'accepted':
    case 'preparing':
    case 'packed': return { label: 'Packed', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' };
    case 'out_for_delivery': return { label: 'Out for Delivery', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
    case 'delivered': return { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    default: return { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-background' };
  }
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get<{ success: boolean; orders: ApiOrder[] }>("/orders")
      .then(d => { setOrders(d.orders); setError(null); })
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load orders";
        setError(msg.includes("buffering") || msg.includes("ECONNREFUSED")
          ? "Database connecting — please retry in a moment."
          : msg);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto">
        <SectionHeader title="Your Orders" />
        <div className="mt-6 flex flex-col items-center gap-3 p-8 bg-card rounded-2xl neu-inset text-center">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); api.get<{ success: boolean; orders: ApiOrder[] }>("/orders").then(d => setOrders(d.orders)).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="text-primary text-sm font-medium flex items-center gap-1"
          >
            <Loader2 className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={PackageX}
        title="Sign in to see orders"
        description="Please sign in to view your order history."
      />
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageX}
        title="No orders yet"
        description="You haven't placed any orders yet. Start shopping!"
      />
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-6">
      <SectionHeader title="Your Orders" />

      <div className="space-y-4">
        {orders.map(order => {
          const status = getStatusDisplay(order.status);
          const StatusIcon = status.icon;
          const total = order.netAmount ?? order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.qty, 0);

          return (
            <div key={order._id} className="bg-card p-4 rounded-2xl neu-card space-y-4">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="font-bold font-mono text-sm">#{order._id.slice(-8).toUpperCase()}</div>
                  {order.shopName && (
                    <div className="text-xs text-muted-foreground mt-0.5">{order.shopName}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5", status.bg, status.color)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </div>
              </div>

              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <div className="w-10 h-10 rounded-xl bg-background neu-inset p-1.5 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-background neu-inset flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium line-clamp-1">{item.name}</div>
                        <div className="text-xs text-muted-foreground">Qty: {item.qty}</div>
                      </div>
                    </div>
                    <div className="font-bold">{formatINR(item.price * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Total Amount {order.paymentMethod && <span className="ml-1 text-xs">· {order.paymentMethod}</span>}
                </div>
                <div className="font-bold text-lg">{formatINR(total)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
