import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!isAdmin || !user)) {
      setLocation("/");
    }
  }, [isAdmin, isLoading, user, setLocation]);

  if (isLoading) return null;
  if (!isAdmin || !user) return null;

  return <>{children}</>;
}
