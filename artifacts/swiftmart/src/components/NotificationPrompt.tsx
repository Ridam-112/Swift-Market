import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { registerFcmToken, getFcmState } from "@/lib/fcm";
import { toast } from "sonner";

const DISMISSED_KEY = "swiftmart_notif_prompt_dismissed_at";
const REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function NotificationPrompt({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;

    const check = async () => {
      const state = await getFcmState();
      if (state === "unsupported") return;
      if (state === "subscribed") return;
      if (state === "denied") return;

      const dismissedAt = localStorage.getItem(`${DISMISSED_KEY}_${userId}`);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < REMIND_AFTER_MS) return;
        localStorage.removeItem(`${DISMISSED_KEY}_${userId}`);
      }

      setTimeout(() => setVisible(true), 1800);
    };

    void check();
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(`${DISMISSED_KEY}_${userId}`, String(Date.now()));
    setVisible(false);
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await registerFcmToken();
      if (result.success) {
        toast.success("Notifications enabled! You'll get alerts even when the app is closed.");
        localStorage.removeItem(`${DISMISSED_KEY}_${userId}`);
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
      setVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-card rounded-t-3xl p-6 pb-10 shadow-2xl max-w-lg mx-auto"
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-5 right-5 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center neu-inset"
              >
                <Bell className="w-8 h-8 text-primary" />
              </motion.div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground">Stay in the loop</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Get instant alerts for order updates, delivery status, and exclusive offers — even when the app is closed.
                </p>
              </div>
              <div className="w-full space-y-3 mt-2">
                <Button
                  className="w-full h-12 rounded-2xl font-bold text-base shadow-none"
                  onClick={handleEnable}
                  disabled={loading}
                >
                  {loading ? "Enabling…" : "🔔  Allow Notifications"}
                </Button>
                <button
                  onClick={dismiss}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
