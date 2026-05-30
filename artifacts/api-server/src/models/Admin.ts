import { Schema, model, type Document } from "mongoose";

export interface IAdmin extends Document {
  phone: string;
  name: string;
  role: "admin" | "super_admin";
  status: "active" | "suspended";
  addedBy?: string;
  activityLog: Array<{ action: string; at: Date; ip?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "super_admin"], default: "admin" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    addedBy: String,
    activityLog: [
      {
        action: { type: String, required: true },
        at: { type: Date, default: Date.now },
        ip: String,
      },
    ],
  },
  { timestamps: true }
);

export const Admin = model<IAdmin>("Admin", AdminSchema);
