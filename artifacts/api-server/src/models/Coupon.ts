import { Schema, model, type Document } from "mongoose";

export interface ICoupon extends Document {
  code: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  minimumOrder: number;
  maximumDiscount?: number;
  expiryDate: Date;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  isActive: boolean;
  appliesTo: "all" | "shop" | "category" | "product" | "user";
  targetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed", "free_delivery"], required: true },
    value: { type: Number, required: true, min: 0 },
    minimumOrder: { type: Number, default: 0 },
    maximumDiscount: Number,
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    appliesTo: { type: String, enum: ["all", "shop", "category", "product", "user"], default: "all" },
    targetId: String,
  },
  { timestamps: true }
);

export const Coupon = model<ICoupon>("Coupon", CouponSchema);
