import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={cn("bg-card p-4 rounded-2xl neu-card flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-medium text-sm">{title}</span>
        <div className="w-8 h-8 rounded-full bg-background neu-inset flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mt-auto">
        <h3 className="text-2xl font-bold">{value}</h3>
        {trend && (
          <span className={cn("text-xs font-bold", trendUp ? "text-emerald-500" : "text-destructive")}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
