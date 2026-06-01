import { Schema, model, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  role: "customer" | "vendor" | "delivery_partner" | "admin" | "super_admin";
  status: "active" | "banned" | "suspended";
  vendorStatus: "none" | "pending" | "approved" | "rejected";
  pincode?: string;
  addresses: Array<{
    label: string;
    line1: string;
    line2?: string;
    city: string;
    pincode: string;
  }>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    role: {
      type: String,
      enum: ["customer", "vendor", "delivery_partner", "admin", "super_admin"],
      default: "customer",
    },
    status: { type: String, enum: ["active", "banned", "suspended"], default: "active" },
    vendorStatus: { type: String, enum: ["none", "pending", "approved", "rejected"], default: "none" },
    pincode: { type: String, trim: true },
    addresses: [
      {
        label: { type: String, default: "Home" },
        line1: { type: String, required: true },
        line2: String,
        city: { type: String, required: true },
        pincode: { type: String, required: true },
      },
    ],
    lastLoginAt: Date,
  },
  { timestamps: true }
);

UserSchema.index({ phone: 1 });

export const User = model<IUser>("User", UserSchema);
