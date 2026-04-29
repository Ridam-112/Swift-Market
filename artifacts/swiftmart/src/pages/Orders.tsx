import { useState, useEffect } from "react";
import { mockOrders } from "@/data/orders";
import { formatINR } from "@/lib/currency";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { PackageX, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function Orders() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'placed': return { label: 'Placed', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'packed': return { label: 'Packed', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'out_for_delivery': return { label: 'Out for Delivery', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
      case 'delivered': return { label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      default: return { label: status, icon: Clock, color: 'text-muted-foreground', bg: 'bg-background' };
    }
  };

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
      </div>
    );
  }

  if (mockOrders.length === 0) {
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
        {mockOrders.map(order => {
          const status = getStatusDisplay(order.status);
          const StatusIcon = status.icon;

          return (
            <div key={order.id} className="bg-card p-4 rounded-2xl neu-card space-y-4">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="font-bold">{order.id}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(order.placedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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
                      <div className="w-10 h-10 rounded-xl bg-background neu-inset p-1.5 flex-shrink-0">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="font-medium line-clamp-1">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">Qty: {item.qty}</div>
                      </div>
                    </div>
                    <div className="font-bold">{formatINR(item.product.price * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="font-bold text-lg">{formatINR(order.total)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
