import { Schema, model, Types } from "mongoose";

export interface IUser {
  phoneNumber: string;
  countryCode: string;

  displayName: string;
  about?: string;

  profilePictureFileId?: Types.ObjectId;

  lastSeen: Date;
  isOnline: boolean;

  isBlocked: boolean;

  createdAt: Date;
  updatedAt: Date;
}

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

    displayName: {
      type: String,
      required: true,
      index: true,
    },

    about: {
      type: String,
      maxlength: 139,
    },

    profilePictureFileId: {
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

