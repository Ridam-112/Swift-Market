import { Schema, model, type Document } from "mongoose";

export interface INotification extends Document {
  userId: string;
  type: "order_update" | "shop_approval" | "delivery_update" | "coupon" | "promo" | "system";
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ["order_update", "shop_approval", "delivery_update", "coupon", "promo", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    data: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>("Notification", NotificationSchema);
