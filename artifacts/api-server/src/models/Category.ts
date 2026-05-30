import { Schema, model, type Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  shopTypes: string[];
  isActive: boolean;
  commissionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shopTypes: [String],
    isActive: { type: Boolean, default: true },
    commissionRate: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const Category = model<ICategory>("Category", CategorySchema);
