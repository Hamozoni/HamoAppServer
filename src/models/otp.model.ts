// src/models/OTP.ts
import mongoose, { Schema } from 'mongoose';
import type { IOTP } from "../types/index.js";

const OTPSchema = new Schema<IOTP>({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - MongoDB auto-deletes expired docs
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster lookups
OTPSchema.index({ phoneNumber: 1, verified: 1 });

export default mongoose.model<IOTP>('OTP', OTPSchema);