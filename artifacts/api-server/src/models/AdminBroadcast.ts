import { Schema, model, type Document } from "mongoose";

export interface IAdminBroadcast extends Document {
  title: string;
  message: string;
  targetAudience: "all" | "customers" | "vendors" | "specific";
  targetUserId?: string;
  sentCount: number;
  createdAt: Date;
}

const AdminBroadcastSchema = new Schema<IAdminBroadcast>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetAudience: {
      type: String,
      enum: ["all", "customers", "vendors", "specific"],
      required: true,
    },
    targetUserId: { type: String },
    sentCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminBroadcast = model<IAdminBroadcast>("AdminBroadcast", AdminBroadcastSchema);
