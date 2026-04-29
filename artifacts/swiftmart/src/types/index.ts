export type CategoryId = 'groceries' | 'vegetables' | 'personal-care' | 'books' | 'clothing';

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  unit: string;
  image: string;
  description: string;
  stock: number;
  rating: number;
  vendorId: string;
  trending?: boolean;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered';
  address: Address;
  placedAt: string;
  eta: string;
  paymentMethod: 'UPI' | 'Card' | 'COD';
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  addresses: Address[];
  isVendorRegistered: boolean;
  vendorProfile?: {
    storeName: string;
    gstin: string;
  };
}

export interface VendorSalesPoint {
  date: string;
  revenue: number;
  orders: number;
}
