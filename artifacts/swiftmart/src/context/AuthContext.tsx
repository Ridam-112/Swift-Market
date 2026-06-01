import React, { createContext, useState, useEffect } from "react";
import { User, Address, VendorApplication, AdminCustomer, PlatformOrder, Report, TransactionLog } from "@/types";
import { mockAdminCustomers, mockPlatformOrders, mockReports, mockTransactions } from "@/data/adminData";
import { api, setTokens, clearTokens } from "@/lib/api";

export type UserRole = 'customer' | 'vendor' | 'admin' | 'super_admin';

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  role: 'customer' | 'vendor';
  isAdmin: boolean;
  isLoading: boolean;
  selectedDeliveryAddress: Address | null;
  setSelectedDeliveryAddress: (address: Address | null) => void;
  login: (phone: string, name: string) => void;
  logout: () => void;
  setRole: (role: 'customer' | 'vendor') => void;
  updateUser: (user: Partial<User>) => void;
  addAddress: (address: Address) => void;
  deleteAddress: (id: string) => void;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (otp: string, phone: string) => Promise<{ isNewUser: boolean; user?: User }>;
  loginWithGoogle: () => { isNewUser: boolean; user?: User; mockEmail?: string; mockName?: string };
  completeOnboarding: (name: string, phone: string, address: Address, email?: string) => Promise<void>;

  applications: VendorApplication[];
  submitVendorApplication: (app: Omit<VendorApplication, 'id' | 'userId' | 'userName' | 'userPhone' | 'submittedAt' | 'status'>) => void;
  approveApplication: (applicationId: string) => void;
  rejectApplication: (applicationId: string, reason: string) => void;

  adminCustomers: AdminCustomer[];
  banCustomer: (customerId: string) => void;
  unbanCustomer: (customerId: string) => void;
  bannedVendorIds: string[];
  banVendor: (vendorId: string) => void;
  unbanVendor: (vendorId: string) => void;
  removeVendor: (vendorId: string) => void;

  platformOrders: PlatformOrder[];
  updateOrderStatus: (orderId: string, status: PlatformOrder['status']) => void;
  refundOrder: (orderId: string) => void;
  reports: Report[];
  resolveReport: (reportId: string) => void;
  ignoreReport: (reportId: string) => void;
  transactions: TransactionLog[];
}

interface ApiUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: string;
  vendorStatus?: string;
  addresses?: Address[];
}

function apiUserToFrontend(apiUser: ApiUser): User {
  const id = apiUser.id || (apiUser as ApiUser & { _id?: string })._id || "";
  return {
    id,
    name: apiUser.name,
    phone: apiUser.phone,
    email: apiUser.email ?? "",
    addresses: apiUser.addresses ?? [],
    isVendorRegistered: apiUser.vendorStatus === 'approved' || apiUser.vendorStatus === 'pending',
    vendorStatus: (apiUser.vendorStatus as User['vendorStatus']) ?? 'none',
  };
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [role, setRoleState] = useState<'customer' | 'vendor'>('customer');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<Address | null>(null);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [adminCustomers] = useState<AdminCustomer[]>(mockAdminCustomers);
  const [bannedVendorIds, setBannedVendorIds] = useState<string[]>([]);
  const [platformOrders] = useState<PlatformOrder[]>(mockPlatformOrders);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [transactions] = useState<TransactionLog[]>(mockTransactions);

  useEffect(() => {
    const savedUser = localStorage.getItem("sm_user");
    const savedRole = localStorage.getItem("sm_role");
    const savedDashRole = localStorage.getItem("swiftmart_role");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
        if (parsed.addresses?.length > 0) setSelectedDeliveryAddress(parsed.addresses[0]);
      } catch { /* ignore */ }
    }
    if (savedRole) setUserRole(savedRole as UserRole);
    if (savedDashRole) setRoleState(savedDashRole as 'customer' | 'vendor');

    const { access } = api.getTokens();
    if (access) {
      api.get<{ success: boolean; user: ApiUser }>("/auth/me")
        .then(d => {
          const u = apiUserToFrontend(d.user);
          setUser(u);
          setUserRole(d.user.role);
          localStorage.setItem("sm_user", JSON.stringify(u));
          localStorage.setItem("sm_role", d.user.role);
          if (u.addresses?.length > 0) setSelectedDeliveryAddress(u.addresses[0]);
        })
        .catch(() => {
          if (!savedUser) {
            clearTokens();
            setUser(null);
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, []);

  const login = (phone: string, name: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: "",
      addresses: [],
      isVendorRegistered: false,
      vendorStatus: 'none',
    };
    setUser(newUser);
    setRoleState('customer');
    setSelectedDeliveryAddress(null);
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
    setUserRole('customer');
    setRoleState('customer');
    setSelectedDeliveryAddress(null);
    localStorage.removeItem("swiftmart_cart");
    localStorage.removeItem("swiftmart_role");
  };

  const setRole = (newRole: 'customer' | 'vendor') => {
    if (newRole === 'customer') {
      setRoleState(newRole);
      localStorage.setItem("swiftmart_role", newRole);
    } else if (user?.vendorStatus === 'approved' || userRole === 'vendor') {
      setRoleState(newRole);
      localStorage.setItem("swiftmart_role", newRole);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem("sm_user", JSON.stringify(updated));
    }
  };

  const addAddress = (address: Address) => {
    if (user) updateUser({ addresses: [...user.addresses, address] });
  };

  const deleteAddress = (id: string) => {
    if (user) updateUser({ addresses: user.addresses.filter(a => a.id !== id) });
  };

  const loginWithPhone = async (phone: string): Promise<void> => {
    await api.post<{ success: boolean; message: string }>("/auth/send-otp", { phone });
  };

  const verifyOtp = async (otp: string, phone: string): Promise<{ isNewUser: boolean; user?: User }> => {
    const data = await api.post<{
      success: boolean;
      isNewUser: boolean;
      accessToken: string;
      refreshToken: string;
      user: ApiUser;
    }>("/auth/verify-otp", { phone, otp });

    setTokens(data.accessToken, data.refreshToken);
    const u = apiUserToFrontend(data.user);
    setUser(u);
    setUserRole(data.user.role);
    localStorage.setItem("sm_user", JSON.stringify(u));
    localStorage.setItem("sm_role", data.user.role);

    if (u.addresses?.length > 0) setSelectedDeliveryAddress(u.addresses[0]);

    const dashRole = data.user.role === 'vendor' ? 'vendor' : 'customer';
    setRoleState(dashRole);
    localStorage.setItem("swiftmart_role", dashRole);

    return { isNewUser: data.isNewUser, user: u };
  };

  const loginWithGoogle = () => {
    const mockEmail = `user${Math.floor(Math.random() * 1000)}@gmail.com`;
    const mockName = `User ${Math.floor(Math.random() * 1000)}`;
    return { isNewUser: true, mockEmail, mockName };
  };

  const completeOnboarding = async (name: string, phone: string, address: Address, email?: string): Promise<void> => {
    const { access } = api.getTokens();
    if (access) {
      try {
        const data = await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", {
          name,
          email: email ?? "",
          addresses: [address],
        });
        const u = apiUserToFrontend(data.user);
        setUser(u);
        setUserRole(data.user.role);
        localStorage.setItem("sm_user", JSON.stringify(u));
        setSelectedDeliveryAddress(address);
        return;
      } catch { /* fallback to local */ }
    }
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: email ?? "",
      addresses: [address],
      isVendorRegistered: false,
      vendorStatus: 'none',
    };
    setUser(newUser);
    localStorage.setItem("sm_user", JSON.stringify(newUser));
    setSelectedDeliveryAddress(address);
  };

  const submitVendorApplication = (appData: Omit<VendorApplication, 'id' | 'userId' | 'userName' | 'userPhone' | 'submittedAt' | 'status'>) => {
    if (!user) return;
    const newApp: VendorApplication = {
      ...appData,
      id: `va_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    setApplications(prev => [...prev, newApp]);
    updateUser({ vendorStatus: 'pending', vendorApplicationId: newApp.id, isVendorRegistered: true });

    api.post("/shops", {
      shopName: appData.storeName,
      ownerName: appData.ownerName,
      phone: user.phone,
      shopType: appData.storeCategory,
      description: appData.storeDescription,
      panNumber: appData.panNumber,
      gstNumber: appData.gstNumber,
      bankAccountNumber: appData.bankAccountNumber,
      bankIfscCode: appData.bankIfscCode,
      upiId: appData.upiId,
      address: { line1: "TBD", city: "TBD", pincode: "000000" },
    }).catch(() => { /* ignore API errors, local state updated */ });
  };

  const approveApplication = (applicationId: string) => {
    setApplications(prev => prev.map(app =>
      app.id === applicationId ? { ...app, status: 'approved' } : app
    ));
  };

  const rejectApplication = (applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app =>
      app.id === applicationId ? { ...app, status: 'rejected', rejectionReason: reason } : app
    ));
  };

  const banCustomer = (customerId: string) => {
    api.patch(`/users/${customerId}/ban`).catch(() => {});
  };

  const unbanCustomer = (customerId: string) => {
    api.patch(`/users/${customerId}/unban`).catch(() => {});
  };

  const banVendor = (vendorId: string) => {
    setBannedVendorIds(prev => [...new Set([...prev, vendorId])]);
    api.post(`/shops/${vendorId}/ban`).catch(() => {});
  };

  const unbanVendor = (vendorId: string) => {
    setBannedVendorIds(prev => prev.filter(id => id !== vendorId));
    api.post(`/shops/${vendorId}/unban`).catch(() => {});
  };

  const removeVendor = (vendorId: string) => {
    setApplications(prev => prev.map(app =>
      app.id === vendorId || app.userId === vendorId
        ? { ...app, status: 'rejected', rejectionReason: "Removed by admin" }
        : app
    ));
    api.delete(`/shops/${vendorId}`).catch(() => {});
  };

  const updateOrderStatus = (orderId: string, status: PlatformOrder['status']) => {
    api.patch(`/orders/${orderId}/status`, { status }).catch(() => {});
  };

  const refundOrder = (orderId: string) => {
    api.post(`/orders/${orderId}/refund`).catch(() => {});
  };

  const resolveReport = (reportId: string) => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r));
  const ignoreReport = (reportId: string) => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'ignored' as const } : r));

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user, userRole, role, isAdmin, isLoading, selectedDeliveryAddress, setSelectedDeliveryAddress,
      login, logout, setRole, updateUser, addAddress, deleteAddress,
      loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding,
      applications, submitVendorApplication, approveApplication, rejectApplication,
      adminCustomers, banCustomer, unbanCustomer, bannedVendorIds, banVendor, unbanVendor, removeVendor,
      platformOrders, updateOrderStatus, refundOrder, reports, resolveReport, ignoreReport, transactions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
