import { Schema, model, type Document } from "mongoose";

export interface IReport extends Document {
  type: "shop" | "product";
  targetId: string;
  targetName: string;
  reportedBy: string;
  reporterPhone: string;
  reason: "fraud" | "fake_product" | "rude_behavior" | "wrong_delivery" | "other";
  description: string;
  status: "open" | "resolved" | "ignored";
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    type: { type: String, enum: ["shop", "product"], required: true },
    targetId: { type: String, required: true },
    targetName: { type: String, required: true },
    reportedBy: { type: String, required: true },
    reporterPhone: { type: String, required: true },
    reason: {
      type: String,
      enum: ["fraud", "fake_product", "rude_behavior", "wrong_delivery", "other"],
      required: true,
    },
    description: { type: String, required: true },
    status: { type: String, enum: ["open", "resolved", "ignored"], default: "open" },
    resolvedBy: String,
  },
  { timestamps: true }
);

export const Report = model<IReport>("Report", ReportSchema);
