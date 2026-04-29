import { useState } from "react";
import { mockOrders } from "@/data/orders";
import { formatINR } from "@/lib/currency";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardList, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function VendorOrders() {
  const [orders, setOrders] = useState(mockOrders);

  const updateStatus = (orderId: string, newStatus: any) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`Order ${orderId} updated to ${newStatus.replace(/_/g, ' ')}`);
  };

  if (orders.length === 0) {
    return (
      <EmptyState 
        icon={ClipboardList}
        title="No incoming orders"
        description="You don't have any orders to process right now."
      />
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto space-y-6">
      <SectionHeader title="Incoming Orders" />

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-card p-5 rounded-2xl neu-card space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{order.id}</h3>
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                    {order.paymentMethod}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Placed: {new Date(order.placedAt).toLocaleString('en-IN')}
                </p>
                <div className="mt-2 text-sm bg-background p-2 rounded-lg neu-inset">
                  <span className="font-medium text-foreground">{order.address.label}</span>
                  <br />
                  <span className="text-muted-foreground line-clamp-1">{order.address.line1}, {order.address.city} - {order.address.pincode}</span>
                </div>
              </div>
              
              <div className="sm:text-right">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="relative inline-block">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="appearance-none bg-background neu-inset border-none pl-3 pr-8 py-2 rounded-xl text-sm font-bold capitalize focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="placed">Placed</option>
                    <option value="packed">Packed</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-3">Order Items ({order.items.length})</h4>
              <div className="space-y-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-background rounded-lg neu-inset p-1">
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="font-medium text-sm line-clamp-1">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.qty} × {formatINR(item.product.price)}</div>
                      </div>
                    </div>
                    <div className="font-bold text-sm">
                      {formatINR(item.product.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center bg-primary/5 p-3 rounded-xl mt-4">
              <span className="font-bold">Total Amount</span>
              <span className="font-bold text-lg text-primary">{formatINR(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
