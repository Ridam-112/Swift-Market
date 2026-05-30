import { Schema, model, type Document } from "mongoose";

export interface ICommissionRule extends Document {
  level: "global" | "shop_type" | "category" | "vendor" | "product";
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
    targetId: String,
    targetName: String,
    rate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CommissionRule = model<ICommissionRule>("CommissionRule", CommissionRuleSchema);
