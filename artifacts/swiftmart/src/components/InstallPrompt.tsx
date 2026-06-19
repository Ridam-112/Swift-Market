import { useState, useEffect, useRef } from "react";
import { Download, X, Zap, Bell, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "swiftmart_install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [visible, setVisible]       = useState(false);
  const [installing, setInstalling] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      // Small delay so the app settles before showing the sheet
      setTimeout(() => setVisible(true), 3000);
    };

    const installed = () => {
      setVisible(false);
      deferredPrompt.current = null;
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    setInstalling(true);
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        deferredPrompt.current = null;
        setVisible(false);
      } else {
        dismiss();
      }
    } finally {
      setInstalling(false);
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
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm"
            onClick={dismiss}
          />

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

            <button
              onClick={dismiss}
              className="absolute top-5 right-5 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-5">
              {/* App icon */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                <img src="/logo.png" alt="SwiftMart" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground">Install SwiftMart</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Add to your home screen for the full app experience — instant access, no browser bar.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: Zap,      label: "Faster loading"  },
                  { icon: Bell,     label: "Push alerts"     },
                  { icon: Wifi,     label: "Works offline"   },
                  { icon: Download, label: "No app store"    },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="w-full space-y-3 mt-1">
                <Button
                  className="w-full h-12 rounded-2xl font-bold text-base shadow-none"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? "Opening…" : "📲  Install App"}
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
