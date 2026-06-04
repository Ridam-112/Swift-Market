import { Schema, model, type Document } from "mongoose";

export interface ICommissionRule extends Document {
  level: "global" | "shop_type" | "category" | "vendor" | "product";
  type: "percentage" | "fixed";
  targetId?: string;
  targetName?: string;
  rate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionRuleSchema = new Schema<ICommissionRule>(
  {
    level: {
      type: String,
      enum: ["global", "shop_type", "category", "vendor", "product"],
      required: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    targetId: String,
    targetName: String,
    rate: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CommissionRule = model<ICommissionRule>("CommissionRule", CommissionRuleSchema);
