import { Schema, model, type Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  category: string;
  shopId: string;
  images: string[];
  stock: number;
  sku?: string;
  unit?: string;
  rating: number;
  commissionRate?: number;
  status: "active" | "inactive" | "out_of_stock";
  trending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    category: { type: String, required: true },
    subcategory: { type: String },
    shopId: { type: String, required: true },
    images: [String],
    stock: { type: Number, default: 0, min: 0 },
    sku: String,
    unit: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    commissionRate: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ["active", "inactive", "out_of_stock"], default: "active" },
    trending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ shopId: 1, category: 1, status: 1 });

export const Product = model<IProduct>("Product", ProductSchema);
