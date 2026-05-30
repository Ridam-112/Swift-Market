import { Schema, model, type Document } from "mongoose";

export interface IShopType extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  commissionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShopTypeSchema = new Schema<IShopType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    commissionRate: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const ShopType = model<IShopType>("ShopType", ShopTypeSchema);
