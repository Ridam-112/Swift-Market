import { Schema, model, type Document } from "mongoose";

export interface IHeroBanner extends Document {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  redirectType: "category" | "shop" | "product" | "internal" | "external";
  redirectValue: string;
  isActive: boolean;
  displayOrder: number;
  views: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const HeroBannerSchema = new Schema<IHeroBanner>(
  {
    imageUrl: { type: String, required: true },
    title: { type: String },
    subtitle: { type: String },
    buttonText: { type: String },
    redirectType: {
      type: String,
      enum: ["category", "shop", "product", "internal", "external"],
      required: true,
    },
    redirectValue: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

HeroBannerSchema.index({ isActive: 1, displayOrder: 1 });

export const HeroBanner = model<IHeroBanner>("HeroBanner", HeroBannerSchema);
