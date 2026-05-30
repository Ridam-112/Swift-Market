import { Schema, model, type Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  name: string;
  phone: string;
  userId?: string;
  vehicle: "bike" | "scooter" | "car" | "bicycle";
  isAvailable: boolean;
  status: "active" | "suspended";
  totalEarnings: number;
  ordersDelivered: number;
  currentOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    userId: String,
    vehicle: { type: String, enum: ["bike", "scooter", "car", "bicycle"], default: "bike" },
    isAvailable: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    totalEarnings: { type: Number, default: 0 },
    ordersDelivered: { type: Number, default: 0 },
    currentOrderId: String,
  },
  { timestamps: true }
);

export const DeliveryPartner = model<IDeliveryPartner>("DeliveryPartner", DeliveryPartnerSchema);
