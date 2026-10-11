import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link } from "wouter";
import { CheckCircle2, Package, Clock, ShoppingBag, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveOrderTracker } from "@/components/LiveOrderTracker";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface ApiOrder {
  _id: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  netAmount?: number;
}

import { SEO } from "@/components/SEO";

export default function OrderSuccess() {
  const [, params] = useRoute("/order/success/:id");
  const id = params?.id ?? "";

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [status, setStatus] = useState("placed");
  const [splashDone, setSplashDone] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("6296118949@fam");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

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

      {/* Green animated splash overlay — portalled to body to escape motion.main transform */}
      {createPortal(
        <AnimatePresence>
          {!splashDone && (
            <motion.div
              key="splash"
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-emerald-500"
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
        </AnimatePresence>,
        document.body
      )}

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

            {/* UPI Payment Card (If ordered via UPI) */}
            {order?.paymentMethod?.toUpperCase().includes("UPI") && (
              <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
                  <QrCode className="w-4 h-4" />
                  <span>Scan to Pay via UPI ({order.netAmount ? `₹${order.netAmount}` : "Order Total"})</span>
                </div>
                <div className="flex justify-center">
                  <img
                    src="/assets/upi_qr.png"
                    alt="SwiftMart UPI QR Code"
                    className="w-44 h-auto rounded-xl shadow-md border border-amber-500/30 bg-white p-1"
                  />
                </div>
                <div className="bg-background/80 rounded-xl p-2.5 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between bg-card px-3 py-1.5 rounded-lg border border-border">
                    <span className="font-semibold text-foreground text-xs">
                      UPI ID: <span className="font-mono text-primary font-bold">6296118949@fam</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUpi ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                    ⚠️ QR কোড আপনার WhatsApp নম্বরেও পাঠানো হয়েছে। পেমেন্ট করার পর অনুগ্রহ করে স্ক্রিনশট (Screenshot) পাঠিয়ে দিন।
                  </p>
                </div>
                <a
                  href={`https://wa.me/916296118949?text=${encodeURIComponent(`Hi SwiftMart, here is the payment screenshot for Order #${shortId} (Amount: ₹${order.netAmount || ""})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md transition-transform active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.087-.179.182-.077.357.101.174.451.744.968 1.205.666.594 1.228.778 1.402.865.174.087.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
                  </svg>
                  Send Payment Screenshot on WhatsApp
                </a>
              </div>
            )}

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
