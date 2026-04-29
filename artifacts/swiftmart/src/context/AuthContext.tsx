import React, { createContext, useState, useEffect } from "react";
import { User, Address } from "@/types";

interface AuthContextType {
  user: User | null;
  role: 'customer' | 'vendor';
  login: (phone: string, name: string) => void;
  logout: () => void;
  setRole: (role: 'customer' | 'vendor') => void;
  updateUser: (user: Partial<User>) => void;
  addAddress: (address: Address) => void;
  deleteAddress: (id: string) => void;
}

const defaultUser: User = {
  id: "u1",
  name: "Rahul Sharma",
  phone: "9876543210",
  email: "rahul@example.com",
  addresses: [
    { id: "a1", label: "Home", line1: "101, Prestige Apartments", city: "Mumbai", pincode: "400001" },
    { id: "a2", label: "Work", line1: "Tech Park, Block B", city: "Mumbai", pincode: "400051" }
  ],
  isVendorRegistered: true,
  vendorProfile: { storeName: "Sharma Kirana", gstin: "27AADCS1234D1Z5" }
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("swiftmart_user");
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [role, setRoleState] = useState<'customer' | 'vendor'>(() => {
    const saved = localStorage.getItem("swiftmart_role");
    return (saved as 'customer' | 'vendor') || 'customer';
  });

  useEffect(() => {
    if (user) localStorage.setItem("swiftmart_user", JSON.stringify(user));
    else localStorage.removeItem("swiftmart_user");
  }, [user]);

  useEffect(() => {
    localStorage.setItem("swiftmart_role", role);
  }, [role]);

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
  };

  const logout = () => {
    setUser(null);
    setRoleState('customer');
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

  return (
    <AuthContext.Provider value={{ user, role, login, logout, setRole, updateUser, addAddress, deleteAddress }}>
      {children}
    </AuthContext.Provider>
  );
}
