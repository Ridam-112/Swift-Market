import React, { createContext, useState, useEffect } from "react";
import { User, Address, VendorApplication, AdminCustomer, PlatformOrder, Report } from "@/types";
import { mockAdminCustomers, mockPlatformOrders } from "@/data/adminData";
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
  updateAddress: (address: Address) => void;
  updatePincode: (pincode: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (otp: string, phone: string) => Promise<{ isNewUser: boolean; user?: User }>;
  loginWithGoogle: (credential: string) => Promise<{ isNewUser: boolean; user?: User }>;
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
}

interface ApiAddress {
  _id?: string;
  id?: string;
  label: 'Home' | 'Work' | 'Other';
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
}

interface ApiUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: string;
  vendorStatus?: string;
  pincode?: string;
  addresses?: ApiAddress[];
  vendorProfile?: {
    storeName: string;
    storeCategory: string;
    storeDescription: string;
    upiId: string;
    bankAccountNumber: string;
    bankIfscCode: string;
    panNumber: string;
    gstNumber?: string;
  };
}

interface ApiReport {
  _id: string;
  type: 'shop' | 'product';
  targetId: string;
  targetName: string;
  reportedBy: string;
  reporterPhone: string;
  reason: Report['reason'];
  description: string;
  status: 'open' | 'resolved' | 'ignored';
  createdAt: string;
}

function mapApiReport(r: ApiReport): Report {
  return {
    id: r._id,
    type: r.type,
    targetId: r.targetId,
    targetName: r.targetName,
    reportedBy: r.reporterPhone || 'Customer',
    reporterPhone: r.reporterPhone || '',
    reason: r.reason,
    description: r.description,
    reportedAt: r.createdAt,
    status: r.status,
  };
}

function normalizeAddress(addr: ApiAddress): Address {
  return {
    id: addr.id || addr._id || "",
    label: addr.label,
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    pincode: addr.pincode,
  };
}

function apiUserToFrontend(apiUser: ApiUser): User {
  const id = apiUser.id || (apiUser as ApiUser & { _id?: string })._id || "";
  return {
    id,
    name: apiUser.name,
    phone: apiUser.phone,
    email: apiUser.email ?? "",
    pincode: apiUser.pincode ?? "",
    addresses: (apiUser.addresses ?? []).map(normalizeAddress),
    isVendorRegistered: apiUser.vendorStatus === 'approved' || apiUser.vendorStatus === 'pending',
    vendorStatus: (apiUser.vendorStatus as User['vendorStatus']) ?? 'none',
    vendorProfile: apiUser.vendorProfile,
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
  const [reports, setReports] = useState<Report[]>([]);

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const fetchReports = () => {
    api.get<{ success: boolean; reports: ApiReport[] }>("/reports")
      .then(d => setReports(d.reports.map(mapApiReport)))
      .catch(() => {});
  };

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

  useEffect(() => {
    if (!isAdmin || isLoading) return;
    fetchReports();
  }, [isAdmin, isLoading]);

  const login = (phone: string, name: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: "",
      pincode: "",
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
    setReports([]);
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

  const persistAddresses = async (addresses: Address[]) => {
    try {
      const data = await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { addresses });
      const u = apiUserToFrontend(data.user);
      setUser(u);
      localStorage.setItem("sm_user", JSON.stringify(u));
      // After backend saves, addresses get MongoDB _ids. If selectedDeliveryAddress
      // still holds a stale client-generated id, re-sync it to the backend address.
      setSelectedDeliveryAddress(prev => {
        if (!prev || !u.addresses.length) return prev;
        const stillValid = u.addresses.find(a => a.id === prev.id);
        if (stillValid) return stillValid;
        // Match by content (label + line1) to find the freshly-saved address
        const matched = u.addresses.find(a => a.label === prev.label && a.line1 === prev.line1);
        return matched ?? u.addresses[0];
      });
    } catch { /* local state already updated optimistically */ }
  };

  const addAddress = (address: Address) => {
    if (!user) return;
    const updated = [...user.addresses, address];
    updateUser({ addresses: updated });
    void persistAddresses(updated);
  };

  const deleteAddress = (id: string) => {
    if (!user) return;
    const updated = user.addresses.filter(a => a.id !== id);
    updateUser({ addresses: updated });
    void persistAddresses(updated);
  };

  const updateAddress = (address: Address) => {
    if (!user) return;
    const updated = user.addresses.map(a => a.id === address.id ? address : a);
    updateUser({ addresses: updated });
    void persistAddresses(updated);
  };

  const updatePincode = async (pincode: string): Promise<void> => {
    try {
      await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { pincode });
    } catch { /* ignore, still update locally */ }
    updateUser({ pincode });
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

  const loginWithGoogle = async (credential: string): Promise<{ isNewUser: boolean; user?: User }> => {
    const data = await api.post<{
      success: boolean;
      isNewUser: boolean;
      accessToken: string;
      refreshToken: string;
      user: ApiUser;
    }>("/auth/google", { credential });

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

  const completeOnboarding = async (name: string, phone: string, address: Address, email?: string): Promise<void> => {
    const data = await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", {
      name,
      email: email ?? "",
      pincode: address.pincode,
      addresses: [address],
    });
    const u = apiUserToFrontend(data.user);
    setUser(u);
    setUserRole(data.user.role);
    localStorage.setItem("sm_user", JSON.stringify(u));
    localStorage.setItem("sm_role", data.user.role);
    // Use the API-returned address (normalized _id → id) so selectedDeliveryAddress.id
    // matches user.addresses[0].id in Checkout.
    setSelectedDeliveryAddress(u.addresses.length > 0 ? u.addresses[0] : address);
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
      category: appData.storeCategory,
      subcategory: appData.storeSubcategory,
      description: appData.storeDescription,
      panNumber: appData.panNumber,
      gstNumber: appData.gstNumber,
      bankAccountNumber: appData.bankAccountNumber,
      bankIfscCode: appData.bankIfscCode,
      upiId: appData.upiId,
      address: {
        line1: appData.storeAddress || "",
        line2: appData.storeArea || "",
        city: appData.storeCity || "",
        pincode: appData.storePincode || "",
        state: "West Bengal",
      },
    }).catch(() => { /* ignore API errors, local state updated */ });

    if (appData.storePincode) {
      api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { pincode: appData.storePincode })
        .then(d => {
          const u = apiUserToFrontend(d.user);
          setUser(u);
          localStorage.setItem("sm_user", JSON.stringify(u));
        })
        .catch(() => {
          updateUser({ pincode: appData.storePincode });
        });
    }
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

  const resolveReport = (reportId: string) => {
    api.patch(`/reports/${reportId}/resolve`)
      .then(() => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r)))
      .catch(() => {});
  };

  const ignoreReport = (reportId: string) => {
    api.patch(`/reports/${reportId}/ignore`)
      .then(() => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'ignored' as const } : r)))
      .catch(() => {});
  };

  return (
    <AuthContext.Provider value={{
      user, userRole, role, isAdmin, isLoading, selectedDeliveryAddress, setSelectedDeliveryAddress,
      login, logout, setRole, updateUser, addAddress, deleteAddress, updateAddress, updatePincode,
      loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding,
      applications, submitVendorApplication, approveApplication, rejectApplication,
      adminCustomers, banCustomer, unbanCustomer, bannedVendorIds, banVendor, unbanVendor, removeVendor,
      platformOrders, updateOrderStatus, refundOrder, reports, resolveReport, ignoreReport,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
