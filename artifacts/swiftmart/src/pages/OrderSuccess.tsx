import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle2, Package, Clock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveOrderTracker } from "@/components/LiveOrderTracker";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface ApiOrder {
  _id: string;
  status: string;
  createdAt: string;
}

import { SEO } from "@/components/SEO";

export default function OrderSuccess() {
  const [, params] = useRoute("/order/success/:id");
  const id = params?.id ?? "";

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [status, setStatus] = useState("placed");
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ success: boolean; order: ApiOrder }>(`/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        setStatus(d.order.status);
      })
      .catch(() => {
        setOrder({ _id: id, status: "placed", createdAt: new Date().toISOString() });
      });
  }, [id]);

  const shortId = id ? id.slice(-8).toUpperCase() : "—";

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 relative overflow-hidden">
      <SEO noIndex />

      {/* Green animated splash overlay */}
      <AnimatePresence>
        {!splashDone && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-500"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
          >
            {/* Expanding ring */}
            <motion.div
              className="absolute w-32 h-32 rounded-full border-4 border-white/40"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            />
            <motion.div
              className="absolute w-32 h-32 rounded-full border-4 border-white/25"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 5.5, opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut", delay: 0.4 }}
            />

            {/* Check icon */}
            <motion.div
              className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
              >
                <CheckCircle2 className="w-14 h-14 text-white" />
              </motion.div>
            </motion.div>

            <motion.h1
              className="text-3xl font-extrabold text-white tracking-tight"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Order Placed!
            </motion.h1>
            <motion.p
              className="text-white/80 mt-2 text-base font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              On its way in ~10 minutes
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card — fades in after splash */}
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={splashDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="bg-card rounded-3xl neu-card overflow-hidden">
          {/* Hero */}
          <div className="bg-emerald-500/10 px-8 pt-10 pb-6 text-center">
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

            {/* Live tracker */}
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
                  <Button className="w-full rounded-full h-11 font-bold shadow-none gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Continue
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
