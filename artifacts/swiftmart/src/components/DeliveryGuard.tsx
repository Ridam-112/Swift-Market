import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function DeliveryGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setLocation("/auth"); return; }
    api.get<{ success: boolean }>("/delivery/me")
      .then(d => { if (!d.success) setLocation("/profile"); })
      .catch(() => setLocation("/profile"))
      .finally(() => setChecking(false));
  }, [user, isLoading, setLocation]);

  if (isLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
