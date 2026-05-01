import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background absolute inset-0 z-50">
        <div className="w-20 h-20 bg-primary mx-auto rounded-3xl neu-card flex items-center justify-center text-primary-foreground font-bold text-4xl animate-pulse">
          S
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
