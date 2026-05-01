import { Clock } from "lucide-react";

export function DeliveryBanner() {
  return (
    <div className="bg-primary/10 rounded-2xl p-4 neu-card relative overflow-hidden my-4 border border-primary/20">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="flex items-center gap-3 relative z-10">
        <div className="bg-primary text-primary-foreground w-12 h-12 rounded-xl flex items-center justify-center neu-card shadow-[0_4px_12px_var(--primary)/0.3]">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-primary-foreground dark:text-primary">Delivery in 10 mins</h3>
          <p className="text-sm text-primary-foreground/80 dark:text-muted-foreground font-medium">To your selected location</p>
        </div>
      </div>
    </div>
  );
}
