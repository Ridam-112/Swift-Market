import { Schema, model, type Document } from "mongoose";

export interface IPayout extends Document {
  vendorId: string;
  vendorName: string;
  shopId: string;
  amount: number;
  orderTotal?: number;
  commissionAmount?: number;
  status: "pending" | "processing" | "paid" | "failed";
  ordersIncluded: string[];
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    vendorId: { type: String, required: true },
    vendorName: { type: String, required: true },
    shopId: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    orderTotal: { type: Number },
    commissionAmount: { type: Number },
    status: { type: String, enum: ["pending", "processing", "paid", "failed"], default: "pending" },
    ordersIncluded: [String],
    paidAt: Date,
    notes: String,
  },
  { timestamps: true }
);

export const Payout = model<IPayout>("Payout", PayoutSchema);
