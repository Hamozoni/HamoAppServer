import { Schema, model, Types } from "mongoose";

import type { IUser } from "../types/auth.js";

const UserSchema = new Schema<IUser>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    countryCode: {
      type: String,
      required: true,
    },

    countryISO: {
      type: String,
      required: true,
    },

    displayName: {
      type: String,
      required: true,
      index: true,
    },

    about: {
      type: String,
      maxlength: 139,
    },

    profilePicture: {
      type: Types.ObjectId,
      ref: "File",
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default model<IUser>("User", UserSchema);

