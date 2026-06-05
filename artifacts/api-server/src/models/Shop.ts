import { Schema, model, type Document } from "mongoose";

export interface IShop extends Document {
  shopName: string;
  ownerName: string;
  phone: string;
  ownerId: string;
  address: {
    line1: string;
    city: string;
    pincode: string;
    state?: string;
  };
  shopType: string;
  category?: string;
  subcategory?: string;
  description?: string;
  image?: string;
  banner?: string;
  timings?: { open: string; close: string };
  commissionRate?: number;
  status: "pending" | "approved" | "rejected" | "banned";
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  totalRevenue: number;
  panNumber: string;
  gstNumber?: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  upiId: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    shopName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true },
    address: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      state: String,
    },
    shopType: { type: String, required: true },
    category: String,
    subcategory: String,
    description: String,
    image: String,
    banner: String,
    timings: {
      open: { type: String },
      close: { type: String },
    },
    commissionRate: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ["pending", "approved", "rejected", "banned"], default: "pending" },
    isOpen: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    panNumber: { type: String, required: true },
    gstNumber: String,
    bankAccountNumber: { type: String, required: true },
    bankIfscCode: { type: String, required: true },
    upiId: { type: String, required: true },
    rejectionReason: String,
  },
  { timestamps: true }
);

ShopSchema.index({ status: 1, shopType: 1 });
ShopSchema.index({ ownerId: 1 });

export const Shop = model<IShop>("Shop", ShopSchema);
