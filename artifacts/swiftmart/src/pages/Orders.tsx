import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { LiveOrderTracker } from "@/components/LiveOrderTracker";
import {
  PackageX, Package, Truck, CheckCircle2, Clock, Loader2,
  AlertCircle, RefreshCw, XCircle, Ban, Radio, KeyRound, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion } from "framer-motion";
import RiderTrackingSheet from "@/components/RiderTrackingSheet";

interface ApiOrderItem {
  productId?: string;
  productName: string;
  name?: string;
  qty: number;
  price: number;
  image?: string;
}

interface ApiOrder {
  _id: string;
  shopName?: string;
  items: ApiOrderItem[];
  netAmount?: number;
  subtotal?: number;
  deliveryCharge?: number;
  status: string;
  paymentMethod?: string;
  address?: { label: string; line1: string; city: string; pincode: string };
  createdAt: string;
  deliveryOtp?: string;
}

const ACTIVE_STATUSES = new Set(["placed", "accepted", "preparing", "packed", "out_for_delivery"]);

function getStatusDisplay(status: string) {
  switch (status) {
    case "placed":           return { label: "Placed",           icon: Clock,         color: "text-blue-500",    bg: "bg-blue-500/10"    };
    case "accepted":         return { label: "Accepted",         icon: CheckCircle2,  color: "text-amber-500",   bg: "bg-amber-500/10"   };
    case "preparing":        return { label: "Preparing",        icon: Package,       color: "text-orange-500",  bg: "bg-orange-500/10"  };
    case "packed":           return { label: "Packed",           icon: Package,       color: "text-indigo-500",  bg: "bg-indigo-500/10"  };
    case "out_for_delivery": return { label: "Out for Delivery", icon: Truck,         color: "text-indigo-500",  bg: "bg-indigo-500/10"  };
    case "delivered":        return { label: "Delivered",        icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/10" };
    case "cancelled":        return { label: "Cancelled",        icon: XCircle,       color: "text-red-500",     bg: "bg-red-500/10"     };
    case "refunded":         return { label: "Refunded",         icon: Ban,           color: "text-slate-500",   bg: "bg-slate-500/10"   };
    default:                 return { label: status,             icon: Clock,         color: "text-muted-foreground", bg: "bg-background" };
  }
}

import { SEO } from "@/components/SEO";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders]             = useState<ApiOrder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    api.get<{ success: boolean; orders: ApiOrder[] }>("/orders")
      .then(d => setOrders(d.orders))
      .catch(err => {
        const msg = err instanceof Error ? err.message : "Failed to load orders";
        setError(msg.includes("buffering") || msg.includes("ECONNREFUSED")
          ? "Database connecting — please retry in a moment."
          : msg);
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: "cancelled", cancelReason: "Cancelled by customer" });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: "cancelled" } : o));
      toast.success("Order cancelled");
    } catch {
      toast.error("Could not cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  // Called by LiveOrderTracker when polling detects a status change
  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
  };

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
          <button onClick={fetchOrders} className="text-primary text-sm font-medium flex items-center gap-1">
            <Loader2 className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <EmptyState icon={PackageX} title="Sign in to see orders" description="Please sign in to view your order history." />;
  }

  if (orders.length === 0) {
    return <EmptyState icon={PackageX} title="No orders yet" description="You haven't placed any orders yet. Start shopping!" />;
  }

  // Pin active orders to the top
  const sorted = [
    ...orders.filter(o => ACTIVE_STATUSES.has(o.status)),
    ...orders.filter(o => !ACTIVE_STATUSES.has(o.status)),
  ];

  const activeCount = sorted.filter(o => ACTIVE_STATUSES.has(o.status)).length;

  return (
    <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-6">
      <SEO noIndex />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SectionHeader title="Your Orders" />
          {activeCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              <Radio className="w-2.5 h-2.5" />
              {activeCount} live
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchOrders} className="text-muted-foreground">
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {sorted.map((order, i) => {
          const statusInfo  = getStatusDisplay(order.status);
          const StatusIcon  = statusInfo.icon;
          const total       = order.netAmount ?? order.subtotal ?? order.items.reduce((s, it) => s + it.price * it.qty, 0);
          const isActive    = ACTIVE_STATUSES.has(order.status);
          const canCancel   = order.status === "placed";
          const isCancelling = cancellingId === order._id;

          return (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "bg-card p-4 rounded-2xl neu-card space-y-4",
                isActive && "ring-1 ring-primary/20"
              )}
            >
              {/* Header row */}
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm">#{order._id.slice(-8).toUpperCase()}</span>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                        </span>
                        LIVE
                      </span>
                    )}
                  </div>
                  {order.shopName && <div className="text-xs text-muted-foreground mt-0.5">{order.shopName}</div>}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5", statusInfo.bg, statusInfo.color)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </div>
              </div>

              {/* Live tracker for active orders */}
              {isActive && (
                <div className="py-1">
                  <LiveOrderTracker
                    orderId={order._id}
                    initialStatus={order.status}
                    createdAt={order.createdAt}
                    onStatusChange={(s) => handleStatusChange(order._id, s)}
                    compact
                  />
                </div>
              )}

              {/* OTP badge — show only when rider is on the way */}
              {order.status === "out_for_delivery" && order.deliveryOtp && (
                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Delivery OTP</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Share this with the rider when they arrive</p>
                  </div>
                  <div className="flex gap-1">
                    {order.deliveryOtp.split("").map((d, i) => (
                      <span
                        key={i}
                        className="w-8 h-9 flex items-center justify-center rounded-lg bg-amber-600 text-white text-base font-bold tracking-tight shadow-sm"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const name = item.productName ?? item.name ?? "Product";
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background neu-inset flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{name}</div>
                          <div className="text-xs text-muted-foreground">Qty: {item.qty}</div>
                        </div>
                      </div>
                      <div className="font-bold">{formatINR(item.price * item.qty)}</div>
                    </div>
                  );
                })}
              </div>

              {order.address && (
                <div className="text-xs bg-background neu-inset p-2 rounded-xl text-muted-foreground">
                  📍 {order.address.line1}, {order.address.city} — {order.address.pincode}
                </div>
              )}

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Total {order.paymentMethod && <span className="ml-1 text-xs">· {order.paymentMethod}</span>}
                </div>
                <div className="font-bold text-lg">{formatINR(total)}</div>
              </div>

              {/* Track Rider button — only when out for delivery */}
              {order.status === "out_for_delivery" && (
                <Button
                  size="sm"
                  className="w-full rounded-xl h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  onClick={() => setTrackingOrderId(order._id)}
                >
                  <MapPin className="w-4 h-4" />
                  See where my order is
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-red-200"
                  onClick={() => cancelOrder(order._id)}
                  disabled={isCancelling}
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                  Cancel Order
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Rider tracking sheet */}
      {trackingOrderId && (() => {
        const tracked = orders.find(o => o._id === trackingOrderId);
        return (
          <RiderTrackingSheet
            isOpen={!!trackingOrderId}
            onClose={() => setTrackingOrderId(null)}
            orderId={trackingOrderId}
            shopName={tracked?.shopName}
            deliveryAddress={tracked?.address
              ? { line1: tracked.address.line1, city: tracked.address.city, pincode: tracked.address.pincode }
              : undefined}
          />
        );
      })()}
    </div>
  );
}
