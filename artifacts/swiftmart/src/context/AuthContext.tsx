import React, { createContext, useState, useEffect } from "react";
import { User, Address, VendorApplication, AdminCustomer, PlatformOrder, Report } from "@/types";
import { toast } from "sonner";
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

  // ── Neon Auth (email-based) ──────────────────────────────────────
  signInWithEmail: (email: string, password: string) => Promise<{ needsProfile: boolean; user?: User }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ needsProfile: boolean; user?: User }>;
  signInWithGoogle: (sessionToken: string) => Promise<{ needsProfile: boolean; user?: User }>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string, token: string) => Promise<void>;

  completeOnboarding: (name: string, phone: string, address: Address, email?: string) => Promise<void>;

  // ── Legacy stubs ──────────────────────────────────────────────────
  checkPhone: (phone: string) => Promise<{ exists: boolean; hasPassword: boolean }>;
  loginWithPassword: (phone: string, password: string) => Promise<{ isNewUser: boolean; user?: User }>;
  setPasswordForOtpUser: (phone: string, password: string) => Promise<{ user?: User }>;
  signup: (name: string, phone: string, password: string) => Promise<{ isNewUser: boolean; user?: User }>;
  loginWithGoogle: (token: string, type?: "credential" | "accessToken") => Promise<{ isNewUser: boolean; user?: User }>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (otp: string, phone: string) => Promise<{ isNewUser: boolean; user?: User }>;

  applications: VendorApplication[];
  submitVendorApplication: (app: Omit<VendorApplication, 'id' | 'userId' | 'userName' | 'userPhone' | 'submittedAt' | 'status'>) => Promise<void>;
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
  profilePhoto?: string | null;
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
  const [adminCustomers] = useState<AdminCustomer[]>([]);
  const [bannedVendorIds, setBannedVendorIds] = useState<string[]>([]);
  const [platformOrders] = useState<PlatformOrder[]>([]);
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
          clearTokens();
          setUser(null);
          setUserRole('customer');
        })
        .finally(() => setIsLoading(false));
    } else {
      clearTokens();
      setUser(null);
      setUserRole('customer');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || isLoading) return;
    fetchReports();
  }, [isAdmin, isLoading]);

  // ─── Internal helpers ─────────────────────────────────────────────────────

  const applyAuthResult = (apiUser: ApiUser) => {
    const u = apiUserToFrontend(apiUser);
    setUser(u);
    setUserRole(apiUser.role);
    localStorage.setItem("sm_user", JSON.stringify(u));
    localStorage.setItem("sm_role", apiUser.role);
    if (u.addresses?.length > 0) setSelectedDeliveryAddress(u.addresses[0]);
    const dashRole = apiUser.role === 'vendor' ? 'vendor' : 'customer';
    setRoleState(dashRole);
    localStorage.setItem("swiftmart_role", dashRole);

    api.get<{ success: boolean; user: ApiUser }>("/auth/me")
      .then(d => {
        const fullUser = apiUserToFrontend(d.user);
        setUser(fullUser);
        setUserRole(d.user.role);
        localStorage.setItem("sm_user", JSON.stringify(fullUser));
        localStorage.setItem("sm_role", d.user.role);
        if (fullUser.addresses?.length > 0) setSelectedDeliveryAddress(fullUser.addresses[0]);
      })
      .catch(() => { /* silent */ });

    return u;
  };

  // ─── Auth actions ─────────────────────────────────────────────────────────

  const login = (_phone: string, _name: string) => {
    throw new Error("login() is not implemented — use signInWithEmail()");
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
    localStorage.removeItem("sm_user");
    localStorage.removeItem("sm_role");
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

  const persistAddresses = async (addresses: Address[], rollbackUser?: User) => {
    try {
      const data = await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { addresses });
      const u = apiUserToFrontend(data.user);
      setUser(u);
      localStorage.setItem("sm_user", JSON.stringify(u));
      setSelectedDeliveryAddress(prev => {
        if (!prev || !u.addresses.length) return prev;
        const stillValid = u.addresses.find(a => a.id === prev.id);
        if (stillValid) return stillValid;
        const matched = u.addresses.find(a => a.label === prev.label && a.line1 === prev.line1);
        return matched ?? u.addresses[0];
      });
    } catch {
      if (rollbackUser) {
        setUser(rollbackUser);
        localStorage.setItem("sm_user", JSON.stringify(rollbackUser));
      }
    }
  };

  const addAddress = (address: Address) => {
    if (!user) return;
    const snapshot = { ...user, addresses: [...user.addresses] };
    const updated = [...user.addresses, address];
    updateUser({ addresses: updated });
    void persistAddresses(updated, snapshot);
  };

  const deleteAddress = (id: string) => {
    if (!user) return;
    const snapshot = { ...user, addresses: [...user.addresses] };
    const updated = user.addresses.filter(a => a.id !== id);
    updateUser({ addresses: updated });
    void persistAddresses(updated, snapshot);
  };

  const updateAddress = (address: Address) => {
    if (!user) return;
    const snapshot = { ...user, addresses: [...user.addresses] };
    const updated = user.addresses.map(a => a.id === address.id ? address : a);
    updateUser({ addresses: updated });
    void persistAddresses(updated, snapshot);
  };

  const updatePincode = async (pincode: string): Promise<void> => {
    try {
      await api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { pincode });
    } catch { /* ignore, update locally */ }
    updateUser({ pincode });
  };

  // ─── Email / Google auth (direct API calls) ───────────────────────────────

  const signInWithEmail = async (email: string, password: string): Promise<{ needsProfile: boolean; user?: User }> => {
    const data = await api.post<{ success: boolean; needsProfile: boolean; accessToken: string; refreshToken: string; user: ApiUser }>("/auth/email-login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    const u = applyAuthResult(data.user);
    return { needsProfile: data.needsProfile, user: u };
  };

  const signUpWithEmail = async (name: string, email: string, password: string): Promise<{ needsProfile: boolean; user?: User }> => {
    const data = await api.post<{ success: boolean; needsProfile: boolean; accessToken: string; refreshToken: string; user: ApiUser }>("/auth/email-signup", { name, email, password });
    setTokens(data.accessToken, data.refreshToken);
    const u = applyAuthResult(data.user);
    return { needsProfile: data.needsProfile, user: u };
  };

  const signInWithGoogle = async (idToken: string): Promise<{ needsProfile: boolean; user?: User }> => {
    const data = await api.post<{ success: boolean; isNewUser: boolean; accessToken: string; refreshToken: string; user: ApiUser }>("/auth/google", { credential: idToken });
    setTokens(data.accessToken, data.refreshToken);
    const u = applyAuthResult(data.user);
    return { needsProfile: data.isNewUser && !data.user.phone, user: u };
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await api.post("/auth/email-forgot-password", { email });
  };

  const resetPassword = async (newPassword: string, token: string): Promise<void> => {
    const data = await api.post<{ success: boolean; accessToken?: string; refreshToken?: string; user?: ApiUser }>("/auth/email-reset-password", { token, newPassword });
    if (data.accessToken && data.refreshToken && data.user) {
      setTokens(data.accessToken, data.refreshToken);
      applyAuthResult(data.user);
    }
  };

  // ─── Onboarding ───────────────────────────────────────────────────────────

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
    setSelectedDeliveryAddress(u.addresses.length > 0 ? u.addresses[0] : address);
  };

  // ─── Legacy stubs ─────────────────────────────────────────────────────────

  const checkPhone = async (_phone: string): Promise<{ exists: boolean; hasPassword: boolean }> => {
    throw new Error("Phone login is no longer supported. Please use email.");
  };
  const loginWithPassword = async (_phone: string, _password: string): Promise<{ isNewUser: boolean; user?: User }> => {
    throw new Error("Phone login is no longer supported. Please use email.");
  };
  const setPasswordForOtpUser = async (_phone: string, _password: string): Promise<{ user?: User }> => {
    throw new Error("Phone login is no longer supported. Please use email.");
  };
  const signup = async (_name: string, _phone: string, _password: string): Promise<{ isNewUser: boolean; user?: User }> => {
    throw new Error("Phone signup is no longer supported. Please use email.");
  };
  const loginWithGoogle = async (_token: string, _type?: "credential" | "accessToken"): Promise<{ isNewUser: boolean; user?: User }> => {
    throw new Error("Use signInWithGoogle() with a session token instead.");
  };
  const loginWithPhone = async (_phone: string): Promise<void> => {
    throw new Error("OTP login has been removed. Please use email.");
  };
  const verifyOtp = async (_otp: string, _phone: string): Promise<{ isNewUser: boolean; user?: User }> => {
    throw new Error("OTP login has been removed. Please use email.");
  };

  // ─── Vendor & admin helpers ───────────────────────────────────────────────

  const submitVendorApplication = async (appData: Omit<VendorApplication, 'id' | 'userId' | 'userName' | 'userPhone' | 'submittedAt' | 'status'>): Promise<void> => {
    if (!user) return;
    const newApp: VendorApplication = {
      ...appData,
      id: `va_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone || "",
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    await api.post("/shops", {
      shopName: appData.storeName,
      ownerName: appData.ownerName,
      phone: user.phone || "",
      shopType: appData.storeCategory,
      category: appData.storeCategory,
      subcategory: appData.storeSubcategory,
      description: appData.storeDescription,
      image: appData.shopLogoUrl,
      panNumber: appData.panNumber,
      gstNumber: appData.gstNumber,
      bankAccountHolderName: appData.bankAccountHolderName,
      bankAccountNumber: appData.bankAccountNumber,
      bankIfscCode: appData.bankIfscCode,
      upiId: appData.upiId,
      certificateType: appData.certificateType,
      certificateNumber: appData.certificateNumber,
      certificateExpiryDate: appData.certificateExpiryDate,
      certificateFile: appData.certificateFile,
      address: {
        line1: appData.storeAddress || "",
        line2: appData.storeArea || "",
        city: appData.storeCity || "",
        pincode: appData.storePincode || "",
        state: "West Bengal",
      },
    });

    setApplications(prev => [...prev, newApp]);
    updateUser({ vendorStatus: 'pending', vendorApplicationId: newApp.id, isVendorRegistered: true });

    if (appData.storePincode) {
      api.patch<{ success: boolean; user: ApiUser }>("/users/me/profile", { pincode: appData.storePincode })
        .then(d => { const u = apiUserToFrontend(d.user); setUser(u); localStorage.setItem("sm_user", JSON.stringify(u)); })
        .catch(() => { updateUser({ pincode: appData.storePincode }); });
    }
  };

  const approveApplication = (applicationId: string) => {
    setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: 'approved' } : app));
  };
  const rejectApplication = (applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app => app.id === applicationId ? { ...app, status: 'rejected', rejectionReason: reason } : app));
  };

  const banCustomer = (customerId: string) => {
    api.patch(`/users/${customerId}/ban`).catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to ban customer"); });
  };
  const unbanCustomer = (customerId: string) => {
    api.patch(`/users/${customerId}/unban`).catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to unban customer"); });
  };
  const banVendor = (vendorId: string) => {
    setBannedVendorIds(prev => [...new Set([...prev, vendorId])]);
    api.post(`/shops/${vendorId}/ban`).catch((e: unknown) => { setBannedVendorIds(prev => prev.filter(id => id !== vendorId)); toast.error(e instanceof Error ? e.message : "Failed to ban vendor"); });
  };
  const unbanVendor = (vendorId: string) => {
    setBannedVendorIds(prev => prev.filter(id => id !== vendorId));
    api.post(`/shops/${vendorId}/unban`).catch((e: unknown) => { setBannedVendorIds(prev => [...new Set([...prev, vendorId])]); toast.error(e instanceof Error ? e.message : "Failed to unban vendor"); });
  };
  const removeVendor = (vendorId: string) => {
    setApplications(prev => prev.map(app => (app.id === vendorId || app.userId === vendorId) ? { ...app, status: 'rejected', rejectionReason: "Removed by admin" } : app));
    api.delete(`/shops/${vendorId}`).catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to remove vendor"); });
  };
  const updateOrderStatus = (orderId: string, status: PlatformOrder['status']) => {
    api.patch(`/orders/${orderId}/status`, { status }).catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to update order status"); });
  };
  const refundOrder = (orderId: string) => {
    api.post(`/orders/${orderId}/refund`).catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to process refund"); });
  };
  const resolveReport = (reportId: string) => {
    api.patch(`/reports/${reportId}/resolve`)
      .then(() => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r)))
      .catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to resolve report"); });
  };
  const ignoreReport = (reportId: string) => {
    api.patch(`/reports/${reportId}/ignore`)
      .then(() => setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'ignored' as const } : r)))
      .catch((e: unknown) => { toast.error(e instanceof Error ? e.message : "Failed to ignore report"); });
  };

  return (
    <AuthContext.Provider value={{
      user, userRole, role, isAdmin, isLoading, selectedDeliveryAddress, setSelectedDeliveryAddress,
      login, logout, setRole, updateUser, addAddress, deleteAddress, updateAddress, updatePincode,
      signInWithEmail, signUpWithEmail, signInWithGoogle, forgotPassword, resetPassword,
      completeOnboarding,
      checkPhone, loginWithPassword, setPasswordForOtpUser, signup, loginWithGoogle,
      loginWithPhone, verifyOtp,
      applications, submitVendorApplication, approveApplication, rejectApplication,
      adminCustomers, banCustomer, unbanCustomer, bannedVendorIds, banVendor, unbanVendor, removeVendor,
      platformOrders, updateOrderStatus, refundOrder, reports, resolveReport, ignoreReport,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
