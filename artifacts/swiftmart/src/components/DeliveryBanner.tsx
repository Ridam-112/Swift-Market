import { Clock, Truck } from "lucide-react";

export function DeliveryBanner() {
  return (
    <div className="bg-primary/10 rounded-2xl p-4 neu-card relative overflow-hidden my-4 border border-primary/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground w-12 h-12 rounded-xl flex items-center justify-center neu-card shadow-md shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base md:text-lg text-foreground dark:text-primary">
                Express Delivery in 30–45 Mins
              </h3>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
                ⚡ Local Q-Commerce
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Across Balurghat • Heavy &amp; bulky items deliver in 1–3 days
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 px-3 py-1.5 rounded-xl border border-border/50 neu-inset">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          <span>Heavy logistics fleet</span>
        </div>
      </div>
    </div>
  );
}

