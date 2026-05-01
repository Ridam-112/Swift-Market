import React, { createContext, useState, useEffect } from "react";
import { User, Address } from "@/types";

interface AuthContextType {
  user: User | null;
  role: 'customer' | 'vendor';
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
}

const mockExistingUsers: User[] = [
  { id: "u1", name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", addresses: [], isVendorRegistered: false },
  { id: "u2", name: "Priya Patel", phone: "9999999999", email: "priya@example.com", addresses: [], isVendorRegistered: false }
];

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<'customer' | 'vendor'>('customer');
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState<Address | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("swiftmart_user");
    const savedRole = localStorage.getItem("swiftmart_role");
    
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

  const login = (phone: string, name: string) => {
    const newUser: User = {
      id: `u_${Date.now()}`,
      name,
      phone,
      email: "",
      addresses: [],
      isVendorRegistered: false
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
    if (user?.isVendorRegistered || newRole === 'customer') {
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
      isVendorRegistered: false
    };
    setUser(newUser);
    setSelectedDeliveryAddress(address);
  };

  return (
    <AuthContext.Provider value={{ 
      user, role, isLoading, selectedDeliveryAddress, setSelectedDeliveryAddress, login, logout, setRole, updateUser, addAddress, deleteAddress,
      loginWithPhone, verifyOtp, loginWithGoogle, completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  );
}
