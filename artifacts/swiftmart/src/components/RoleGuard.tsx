import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function RoleGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole: 'customer' | 'vendor' }) {
  const { user, role } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    } else if (role !== requiredRole) {
      setLocation(requiredRole === 'customer' ? "/" : "/vendor");
    }
  }, [user, role, requiredRole, setLocation]);

  if (!user || role !== requiredRole) return null;

  return <>{children}</>;
}
