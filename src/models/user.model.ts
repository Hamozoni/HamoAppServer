// src/models/User.ts
import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/auth.js";

const UserSchema = new Schema<IUser>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },

    displayName: {
      type: String,
      trim: true
    },

    profilePicture: String,

    about: {
      type: String,
      default: "Hey there! I am using WhatsApp Clone"
    },

    isPhoneVerified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IUser>("User", UserSchema);

