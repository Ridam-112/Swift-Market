import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function RoleGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole: 'customer' | 'vendor' }) {
  const { role } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (role !== requiredRole) {
      setLocation(requiredRole === 'customer' ? "/" : "/vendor");
    }
  }, [role, requiredRole, setLocation]);

  if (role !== requiredRole) return null;

  return <>{children}</>;
}
