import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function RoleGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole: 'customer' | 'vendor' }) {
  const { role, user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAdmin) return;
    if (requiredRole === 'vendor') {
      if (user?.vendorStatus !== 'approved' || role !== 'vendor') {
        setLocation("/vendor-status");
      }
    }
  }, [role, requiredRole, setLocation, user, isAdmin]);

  if (isAdmin) return <>{children}</>;
  if (requiredRole === 'vendor' && (role !== 'vendor' || user?.vendorStatus !== 'approved')) return null;

  return <>{children}</>;
}
