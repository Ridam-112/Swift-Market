export type CategoryId = string;

export type VendorStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface VendorApplication {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  storeName: string;
  storeCategory: CategoryId;
  storeSubcategory?: string;
  storeDescription: string;
  ownerName: string;
  storeAddress?: string;
  storeArea?: string;
  storeCity?: string;
  storePincode?: string;
  panNumber: string;
  gstNumber: string;
  bankAccountHolderName?: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  upiId: string;
  shopLogoUrl?: string;
  certificateType?: string;
  certificateNumber?: string;
  certificateExpiryDate?: string;
  certificateFile?: string;
  submittedAt: string;
  status: VendorStatus;
  rejectionReason?: string;
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  subcategory?: string;
  price: number;
  discountedPrice?: number;
  unit: string;
  image: string;
  images?: string[];
  description: string;
  stock: number;
  rating: number;
  vendorId: string;
  trending?: boolean;
  colors?: string[];
  sizes?: string[];
  colorImages?: Record<string, string>;
  shopName?: string;
  shopId?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  selectedColor?: string;
  selectedSize?: string;
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
  pincode?: string;
  addresses: Address[];
  isVendorRegistered: boolean;
  vendorStatus: VendorStatus;
  vendorApplicationId?: string;
  vendorProfile?: {
    storeName: string;
    storeCategory: CategoryId;
    storeDescription: string;
    upiId: string;
    bankAccountNumber: string;
    bankIfscCode: string;
    panNumber: string;
    gstNumber?: string;
  };
}

export interface VendorSalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface Vendor {
  id: string;
  storeName: string;
  ownerName: string;
  category: string;
  tagline: string;
  rating: number;
  totalOrders: number;
  isOpen: boolean;
  eta: string;
  image: string;
  pincode: string;
  city: string;
  phone: string;
  status: 'active' | 'banned';
  joinedAt: string;
  revenue: number;
  commission: number;
}

export interface AdminOrder {
  id: string;
  items: { name: string; qty: number; price: number; category: string }[];
  total: number;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered';
  paymentMethod: 'UPI' | 'Card' | 'COD';
  placedAt: string;
  vendorId: string;
  vendorName: string;
}

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinedAt: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'banned';
  lastOrderAt?: string;
  orders: AdminOrder[];
  addresses: Address[];
}

export interface PlatformRevenuePoint {
  date: string;
  revenue: number;
  orders: number;
  commission: number;
}

export interface PlatformOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vendorId: string;
  vendorName: string;
  items: { name: string; qty: number; price: number; category: string }[];
  total: number;
  status: 'placed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentMethod: 'UPI' | 'Card' | 'COD';
  paymentStatus: 'success' | 'failed' | 'pending' | 'refunded';
  deliveryType: 'instant' | 'scheduled';
  placedAt: string;
  updatedAt: string;
  refundedAt?: string;
}

export interface Report {
  id: string;
  type: 'shop' | 'product';
  targetId: string;
  targetName: string;
  reportedBy: string;
  reporterPhone: string;
  reason: 'fraud' | 'fake_product' | 'rude_behavior' | 'wrong_delivery' | 'other';
  description: string;
  reportedAt: string;
  status: 'open' | 'resolved' | 'ignored';
}

export interface TransactionLog {
  id: string;
  orderId: string;
  customerName: string;
  vendorName: string;
  amount: number;
  method: 'UPI' | 'Card' | 'COD';
  status: 'success' | 'failed' | 'pending' | 'refunded';
  createdAt: string;
}

export interface AnalyticsPoint {
  label: string;
  revenue: number;
  orders: number;
  newUsers: number;
  commission: number;
}
