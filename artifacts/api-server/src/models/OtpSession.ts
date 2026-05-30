import { Schema, model, type Document } from "mongoose";

export interface IOtpSession extends Document {
  phone: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OtpSessionSchema = new Schema<IOtpSession>(
  {
    phone: { type: String, required: true, trim: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OtpSessionSchema.index({ phone: 1 });
OtpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpSession = model<IOtpSession>("OtpSession", OtpSessionSchema);
