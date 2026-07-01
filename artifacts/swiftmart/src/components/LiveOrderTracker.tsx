import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, ChefHat, Package, Bike, PartyPopper, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ─── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    key: "placed",
    label: "Placed",
    icon: Clock,
    message: "Order received — waiting for the shop to accept.",
    etaMinutes: 0,
  },
  {
    key: "accepted",
    label: "Accepted",
    icon: CheckCircle2,
    message: "Shop accepted your order and is getting ready.",
    etaMinutes: 3,
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: ChefHat,
    message: "Your items are being prepared fresh.",
    etaMinutes: 5,
  },
  {
    key: "packed",
    label: "Packed",
    icon: Package,
    message: "All packed and waiting for the delivery partner.",
    etaMinutes: 8,
  },
  {
    key: "out_for_delivery",
    label: "On the way",
    icon: Bike,
    message: "Delivery partner is heading to your door! 🛵",
    etaMinutes: 10,
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: PartyPopper,
    message: "Enjoy your order! 🎉",
    etaMinutes: 15,
  },
];

const ACTIVE_STATUSES = new Set(["placed", "accepted", "preparing", "packed", "out_for_delivery"]);

interface ApiOrder {
  _id: string;
  status: string;
  createdAt: string;
}

interface Props {
  orderId: string;
  initialStatus: string;
  createdAt: string;
  /** Called whenever status changes (e.g. to update parent state) */
  onStatusChange?: (status: string) => void;
  compact?: boolean;
}

// ─── ETA helper ───────────────────────────────────────────────────────────────
function getEtaLabel(status: string, createdAt: string): string {
  if (status === "delivered" || status === "cancelled") return "";
  const step = STEPS.find((s) => s.key === status);
  if (!step) return "";
  const elapsed = (Date.now() - new Date(createdAt).getTime()) / 60000;
  // Total expected delivery ~15 min from placement
  const remaining = Math.max(1, Math.round(15 - elapsed));
  if (status === "out_for_delivery") return `Arriving in ~${remaining} min`;
  return `~${remaining} min remaining`;
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LiveOrderTracker({ orderId, initialStatus, createdAt, onStatusChange, compact = false }: Props) {
  const [status, setStatus]       = useState(initialStatus);
  const prevStatus                = useRef(initialStatus);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = () => {
    api
      .get<{ success: boolean; order: ApiOrder }>(`/orders/${orderId}`)
      .then((d) => {
        const newStatus = d.order?.status ?? status;
        if (newStatus !== prevStatus.current) {
          prevStatus.current = newStatus;
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        }
      })
      .catch(() => {/* silent — keep showing last known status */});
  };

  useEffect(() => {
    // Start polling only for active orders
    if (ACTIVE_STATUSES.has(status)) {
      intervalRef.current = setInterval(poll, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, status]);

  const currentIdx = STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === "cancelled";
  const currentStep = isCancelled ? null : STEPS[currentIdx];
  const etaLabel = getEtaLabel(status, createdAt);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 text-red-500 text-sm font-medium">
        <XCircle className="w-4 h-4 shrink-0" />
        Order cancelled
      </div>
    );
  }
  if (currentIdx < 0) return null;

  // ─── Compact mode (used inside order cards) ──────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-2 py-1">
        <CompactStepper currentIdx={currentIdx} status={status} />
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-muted-foreground leading-relaxed flex-1 pr-4"
            >
              {currentStep?.message}
            </motion.p>
          </AnimatePresence>
          {etaLabel && (
            <span className="text-xs font-semibold text-primary whitespace-nowrap shrink-0">
              {etaLabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ─── Full mode (used on OrderSuccess page) ───────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Big stepper */}
      <FullStepper currentIdx={currentIdx} />

      {/* Status message card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-4"
        >
          {currentStep && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <currentStep.icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-foreground">{currentStep?.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{currentStep?.message}</p>
          </div>
          {etaLabel && (
            <span className="ml-auto text-xs font-bold text-primary whitespace-nowrap pt-0.5 shrink-0">
              {etaLabel}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Live polling indicator */}
      {ACTIVE_STATUSES.has(status) && (
        <div className="flex items-center gap-1.5 justify-center">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[11px] text-muted-foreground">Updating live</span>
        </div>
      )}
    </div>
  );
}

// ─── Compact stepper (horizontal dots + lines) ────────────────────────────────
function CompactStepper({ currentIdx, status }: { currentIdx: number; status: string }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const done    = idx < currentIdx;
        const active  = idx === currentIdx;
        const isLast  = idx === STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-500",
                done   ? "bg-primary"              :
                active ? "bg-primary ring-2 ring-primary/30" : "bg-muted"
              )}>
                {active && (
                  <motion.div
                    className="w-full h-full rounded-full bg-primary"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[8px] mt-0.5 text-center leading-tight whitespace-nowrap font-medium",
                active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"
              )}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={cn(
                "flex-1 h-px mx-0.5 mb-3 transition-all duration-700",
                idx < currentIdx ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Full stepper (vertical with icons + checkmarks) ─────────────────────────
function FullStepper({ currentIdx }: { currentIdx: number }) {
  return (
    <div className="flex items-center justify-between px-1">
      {STEPS.map((step, idx) => {
        const done   = idx < currentIdx;
        const active = idx === currentIdx;
        const isLast = idx === STEPS.length - 1;
        const Icon   = step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center shrink-0 relative">
              {/* Circle */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                done   ? "bg-primary text-primary-foreground shadow-sm"        :
                active ? "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.2)]" :
                         "bg-muted text-muted-foreground"
              )}>
                {done ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Pulse ring for active */}
              {active && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              )}

              {/* Label */}
              <span className={cn(
                "text-[9px] mt-1 font-semibold text-center leading-tight whitespace-nowrap",
                active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-1 mb-4 h-0.5 overflow-hidden bg-muted rounded-full">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: idx < currentIdx ? "100%" : "0%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
