import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function RoleGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole: 'customer' | 'vendor' }) {
  const { role, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (requiredRole === 'vendor') {
      if (user?.vendorStatus !== 'approved') {
        setLocation("/vendor-status");
        return;
      }
      if (role !== 'vendor') {
        setLocation("/vendor-status");
        return;
      }
    } else {
      if (role !== 'customer') {
        setLocation("/vendor");
      }
    }
  }, [role, requiredRole, setLocation, user]);

  if (requiredRole === 'vendor' && (role !== 'vendor' || user?.vendorStatus !== 'approved')) return null;
  if (requiredRole === 'customer' && role !== 'customer') return null;

  return <>{children}</>;
}
