import { useCart } from "@/hooks/useCart";
import { formatINR } from "@/lib/currency";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, Zap } from "lucide-react";

export function FloatingCartBar() {
  const { totalItems, subtotal } = useCart();
  const [location] = useLocation();

  const isHidden = totalItems === 0 || location === "/cart" || location === "/checkout" || location.startsWith("/admin") || location.startsWith("/vendor");

  return (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-[74px] md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 pointer-events-auto"
        >
          <Link
            href="/cart"
            className="flex items-center justify-between p-3.5 bg-gradient-to-r from-[#1e1b4b] via-[#2d1b69] to-[#3b0764] border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-900/40 text-white active:scale-[0.98] transition-transform backdrop-blur-xl group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/40 border border-purple-400/30 flex items-center justify-center relative">
                <ShoppingBag className="w-5 h-5 text-purple-200" />
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white">{formatINR(subtotal)}</span>
                  <span className="text-[10px] text-purple-200/80 font-medium">({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                  <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>Delivery in 10 mins</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-lg group-hover:bg-purple-100 transition-colors">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-700 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
