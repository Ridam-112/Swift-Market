import { Schema, model, type Document } from "mongoose";

export interface IOrderItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  category: string;
  commissionType?: "percentage" | "fixed";
  commissionRate?: number;
  commissionAmount?: number;
  commissionLevel?: string;
}

export interface IOrder extends Document {
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  items: IOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  couponDiscount: number;
  netAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorPayable: number;
  platformRevenue: number;
  status:
    | "placed"
    | "accepted"
    | "preparing"
    | "packed"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentMethod: "COD" | "UPI" | "card" | "wallet";
  paymentStatus: "pending" | "success" | "failed" | "refunded";
  deliveryPartnerId?: string;
  address: {
    label: string;
    line1: string;
    city: string;
    pincode: string;
  };
  couponCode?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  refundedAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  commissionType: { type: String, enum: ["percentage", "fixed"] },
  commissionRate: { type: Number },
  commissionAmount: { type: Number },
  commissionLevel: { type: String },
});

const OrderSchema = new Schema<IOrder>(
  {
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shopId: { type: String, required: true },
    shopName: { type: String, required: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    vendorPayable: { type: Number, default: 0 },
    platformRevenue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "placed",
        "accepted",
        "preparing",
        "packed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "placed",
    },
    paymentMethod: { type: String, enum: ["COD", "UPI", "card", "wallet"], required: true },
    paymentStatus: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
    deliveryPartnerId: String,
    address: {
      label: { type: String, default: "Home" },
      line1: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    couponCode: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    refundedAt: Date,
    cancelReason: String,
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, status: 1 });
OrderSchema.index({ shopId: 1, status: 1 });

export const Order = model<IOrder>("Order", OrderSchema);
