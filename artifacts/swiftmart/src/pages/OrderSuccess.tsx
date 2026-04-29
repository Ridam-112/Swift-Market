import { useRoute, Link } from "wouter";
import { CheckCircle2, Package, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/currency";

export default function OrderSuccess() {
  const [, params] = useRoute("/order/success/:id");
  const id = params?.id || "Unknown";

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl neu-card text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-primary/10 -z-10" />
        
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)] text-white">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for shopping with SwiftMart. Your order will be delivered soon.
        </p>

        <div className="space-y-4 text-left bg-background p-4 rounded-2xl neu-inset mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Order ID</div>
              <div className="font-bold">{id}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground font-medium">Estimated Arrival</div>
              <div className="font-bold">10-15 Minutes</div>
            </div>
          </div>
        </div>

        <Link href="/">
          <Button className="w-full rounded-full h-12 font-bold shadow-none neu-card">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
