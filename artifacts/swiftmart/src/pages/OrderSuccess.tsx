import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle2, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveOrderTracker } from "@/components/LiveOrderTracker";
import { api } from "@/lib/api";

interface ApiOrder {
  _id: string;
  status: string;
  createdAt: string;
}

export default function OrderSuccess() {
  const [, params] = useRoute("/order/success/:id");
  const id = params?.id ?? "";

  const [order, setOrder]   = useState<ApiOrder | null>(null);
  const [status, setStatus] = useState("placed");

  useEffect(() => {
    if (!id) return;
    api
      .get<{ success: boolean; order: ApiOrder }>(`/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        setStatus(d.order.status);
      })
      .catch(() => {
        // Fallback: treat as freshly placed
        setOrder({ _id: id, status: "placed", createdAt: new Date().toISOString() });
      });
  }, [id]);

  const shortId = id ? id.slice(-8).toUpperCase() : "—";

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl neu-card overflow-hidden">
        {/* Top hero area */}
        <div className="bg-primary/10 px-8 pt-10 pb-6 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(16,185,129,0.35)] text-white">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Order Placed!</h1>
          <p className="text-sm text-muted-foreground">
            Sit back — your order is on its way in ~10 min.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Order meta */}
          <div className="flex items-center gap-4 bg-background p-4 rounded-2xl neu-inset">
            <div className="flex items-center gap-2.5 flex-1">
              <Package className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Order ID</div>
                <div className="font-bold font-mono text-sm">#{shortId}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-1">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">ETA</div>
                <div className="font-bold text-sm">~10 min</div>
              </div>
            </div>
          </div>

          {/* Live tracker — shown once we have order data */}
          {order && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                Live tracking
              </p>
              <div className="bg-background rounded-2xl neu-inset p-4">
                <LiveOrderTracker
                  orderId={order._id}
                  initialStatus={order.status}
                  createdAt={order.createdAt}
                  onStatusChange={setStatus}
                />
              </div>
            </div>
          )}

          {/* CTA */}
          {status === "delivered" ? (
            <Link href="/orders">
              <Button className="w-full rounded-full h-12 font-bold shadow-none">
                View Order History
              </Button>
            </Link>
          ) : (
            <div className="flex gap-3">
              <Link href="/orders" className="flex-1">
                <Button variant="outline" className="w-full rounded-full h-11 font-semibold shadow-none">
                  Track Orders
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full rounded-full h-11 font-bold shadow-none">
                  Keep Shopping
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
