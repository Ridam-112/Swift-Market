import React, { createContext, useState, useEffect } from "react";
import { User, Address, VendorApplication, VendorStatus, AdminCustomer } from "@/types";
import { mockAdminCustomers } from "@/data/adminData";

interface AuthContextType {
  user: User | null;
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
  verifyOtp: (otp: string, phone: string) => { isNewUser: boolean; user?: User };
  loginWithGoogle: () => { isNewUser: boolean; user?: User; mockEmail?: string; mockName?: string };
  completeOnboarding: (name: string, phone: string, address: Address, email?: string) => void;
  
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
}

const mockExistingUsers: User[] = [
  { id: "u1", name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", addresses: [], isVendorRegistered: false, vendorStatus: 'none' },
  { id: "u2", name: "Priya Patel", phone: "9999999999", email: "priya@example.com", addresses: [], isVendorRegistered: false, vendorStatus: 'none' },
  { id: "admin1", name: "Admin", phone: "0000000000", email: "admin@swiftmart.com", addresses: [], isVendorRegistered: false, vendorStatus: 'none' }
];

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<'customer' | 'vendor'>('customer');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<Address | null>(null);
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<AdminCustomer[]>(mockAdminCustomers);
  const [bannedVendorIds, setBannedVendorIds] = useState<string[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("swiftmart_user");
    const savedRole = localStorage.getItem("swiftmart_role");
    const savedApps = localStorage.getItem("swiftmart_vendor_applications");
    const savedCustomers = localStorage.getItem("swiftmart_admin_customers");
    const savedBannedVendors = localStorage.getItem("swiftmart_banned_vendors");
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser?.addresses?.length > 0) {
        setSelectedDeliveryAddress(parsedUser.addresses[0]);
      }
    }
    if (savedRole) {
      setRoleState(savedRole as 'customer' | 'vendor');
    }
    if (savedApps) {
      setApplications(JSON.parse(savedApps));
    }
    if (savedCustomers) {
      setAdminCustomers(JSON.parse(savedCustomers));
    }
    if (savedBannedVendors) {
      setBannedVendorIds(JSON.parse(savedBannedVendors));
    }
    
    // Simulate hydration delay for skeleton
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        localStorage.setItem("swiftmart_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("swiftmart_user");
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("swiftmart_role", role);
    }
  }, [role, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("swiftmart_vendor_applications", JSON.stringify(applications));
    }
  }, [applications, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("swiftmart_admin_customers", JSON.stringify(adminCustomers));
    }
  }, [adminCustomers, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("swiftmart_banned_vendors", JSON.stringify(bannedVendorIds));
    }
  }, [bannedVendorIds, isLoading]);

  const login = (phone: string, name: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: "",
      addresses: [],
      isVendorRegistered: false,
      vendorStatus: 'none'
    };
    setUser(newUser);
    setRoleState('customer');
    setSelectedDeliveryAddress(null);
  };

  const logout = () => {
    setUser(null);
    setRoleState('customer');
    setSelectedDeliveryAddress(null);
    localStorage.removeItem("swiftmart_cart");
  };

  const setRole = (newRole: 'customer' | 'vendor') => {
    if (newRole === 'customer') {
      setRoleState(newRole);
    } else if (user?.vendorStatus === 'approved') {
      setRoleState(newRole);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) setUser({ ...user, ...updates });
  };

  const addAddress = (address: Address) => {
    if (user) setUser({ ...user, addresses: [...user.addresses, address] });
  };

  const deleteAddress = (id: string) => {
    if (user) setUser({ ...user, addresses: user.addresses.filter(a => a.id !== id) });
  };

  const loginWithPhone = async (phone: string) => {
    return new Promise<void>((resolve) => setTimeout(resolve, 1500));
  };

  const verifyOtp = (otp: string, phone: string) => {
    if (otp === "123456") {
      const existingUser = mockExistingUsers.find(u => u.phone === phone);
      if (existingUser) {
        setUser(existingUser);
        return { isNewUser: false, user: existingUser };
      }
      return { isNewUser: true };
    }
    throw new Error("Invalid OTP");
  };

  const loginWithGoogle = () => {
    const mockEmail = `user${Math.floor(Math.random() * 1000)}@gmail.com`;
    const mockName = `User ${Math.floor(Math.random() * 1000)}`;
    return { isNewUser: true, mockEmail, mockName };
  };

  const completeOnboarding = (name: string, phone: string, address: Address, email?: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: email || "",
      addresses: [address],
      isVendorRegistered: false,
      vendorStatus: 'none'
    };
    setUser(newUser);
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
      status: 'pending'
    };

    setApplications(prev => [...prev, newApp]);
    updateUser({ 
      vendorStatus: 'pending',
      vendorApplicationId: newApp.id,
      isVendorRegistered: true
    });
  };

  const approveApplication = (applicationId: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: 'approved' } : app
    ));

    const app = applications.find(a => a.id === applicationId);
    if (app && user && user.id === app.userId) {
      updateUser({
        vendorStatus: 'approved',
        vendorProfile: {
          storeName: app.storeName,
          storeCategory: app.storeCategory,
          storeDescription: app.storeDescription,
          upiId: app.upiId,
          bankAccountNumber: app.bankAccountNumber,
          bankIfscCode: app.bankIfscCode,
          panNumber: app.panNumber,
          gstNumber: app.gstNumber,
        }
      });
    }
  };

  const rejectApplication = (applicationId: string, reason: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: 'rejected', rejectionReason: reason } : app
    ));

    const app = applications.find(a => a.id === applicationId);
    if (app && user && user.id === app.userId) {
      updateUser({ vendorStatus: 'rejected' });
    }
  };

  const banCustomer = (customerId: string) => {
    setAdminCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, status: 'banned' } : c
    ));
  };

  const unbanCustomer = (customerId: string) => {
    setAdminCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, status: 'active' } : c
    ));
  };

  const banVendor = (vendorId: string) => {
    setBannedVendorIds(prev => [...new Set([...prev, vendorId])]);
  };

  const unbanVendor = (vendorId: string) => {
    setBannedVendorIds(prev => prev.filter(id => id !== vendorId));
  };

  const removeVendor = (vendorId: string) => {
    setApplications(prev => prev.map(app => 
      app.id === vendorId || app.userId === vendorId || app.storeName === vendorId 
        ? { ...app, status: 'rejected', rejectionReason: "Removed by admin" } 
        : app
    ));
    // Since vendors array is static right now, we can also add it to banned to hide it, but the spec says "set application status to 'rejected' with reason 'Removed by admin'". We'll handle this in the UI.
  };

  const isAdmin = user?.phone === "0000000000";

  return (
    <AuthContext.Provider value={{ 
      user, role, isAdmin, isLoading, selectedDeliveryAddress, setSelectedDeliveryAddress, login, logout, setRole, updateUser, addAddress, deleteAddress,
      loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding,
      applications, submitVendorApplication, approveApplication, rejectApplication,
      adminCustomers, banCustomer, unbanCustomer, bannedVendorIds, banVendor, unbanVendor, removeVendor
    }}>
      {children}
    </AuthContext.Provider>
  );
}