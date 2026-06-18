import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { registerPushNotifications, getPushPermissionState } from "@/lib/pushNotifications";
import { toast } from "sonner";

const DISMISSED_KEY = "swiftmart_notif_prompt_dismissed";

export function NotificationPrompt({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current) return;
    prompted.current = true;

    // Don't show if:  unsupported, already granted/denied, or user dismissed before
    const check = async () => {
      const state = await getPushPermissionState();
      if (state !== "default") return;
      if (localStorage.getItem(`${DISMISSED_KEY}_${userId}`)) return;

      // Small delay so the app fully renders before showing the sheet
      setTimeout(() => setVisible(true), 1500);
    };

    void check();
  }, [userId]);

  const dismiss = () => {
    localStorage.setItem(`${DISMISSED_KEY}_${userId}`, "1");
    setVisible(false);
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const ok = await registerPushNotifications();
      if (ok) {
        toast.success("Notifications enabled! You'll get alerts even when the app is closed.");
      } else {
        const state = await getPushPermissionState();
        if (state === "denied") {
          toast.error("Blocked — please allow notifications in browser settings.");
        }
      }
    } finally {
      setLoading(false);
      dismiss();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[201] bg-card rounded-t-3xl p-6 pb-10 shadow-2xl max-w-lg mx-auto"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />

            {/* Dismiss X */}
            <button
              onClick={dismiss}
              className="absolute top-5 right-5 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center neu-inset">
                <Bell className="w-8 h-8 text-primary" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground">Stay in the loop</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Get instant alerts for order updates, offers, and delivery status — just like Swiggy &amp; Zomato.
                </p>
              </div>

              <div className="w-full space-y-3 mt-2">
                <Button
                  className="w-full h-12 rounded-2xl font-bold text-base shadow-none"
                  onClick={handleEnable}
                  disabled={loading}
                >
                  {loading ? "Enabling…" : "🔔  Enable Notifications"}
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
