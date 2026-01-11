// src/models/User.ts
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import type { IUser, IRefreshToken, IDevice } from "../types/index.js";

const RefreshTokenSchema = new Schema<IRefreshToken>({
  token: { type: String, required: true },
  deviceId: { type: String, required: true },
  deviceInfo: {
    platform: { type: String, required: true },
    deviceName: { type: String, required: true },
    userAgent: String,
    osVersion: String
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const DeviceSchema = new Schema<IDevice>({
  deviceId: { type: String, required: true },
  platform: { type: String, required: true },
  deviceName: { type: String, required: true },
  lastActive: { type: Date, default: Date.now },
  publicKey: String
});

const UserSchema = new Schema<IUser>({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    trim: true
  },
  profilePicture: String,
  about: {
    type: String,
    default: 'Hey there! I am using WhatsApp Clone'
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  refreshTokens: [RefreshTokenSchema],
  devices: [DeviceSchema]
}, {
  timestamps: true
});

// Indexes for performance
// phoneNumber index is automatically created by unique: true
UserSchema.index({ 'refreshTokens.deviceId': 1 });

// Generate access token (short-lived)
UserSchema.methods.generateAccessToken = function(): string {
  return jwt.sign(
    { 
      userId: this._id.toString(),
      phoneNumber: this.phoneNumber,
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '30m' }
  );
};

// Generate refresh token (long-lived)
UserSchema.methods.generateRefreshToken = function(
  deviceId: string, 
  deviceInfo: any
): string {
  const refreshToken = jwt.sign(
    { 
      userId: this._id.toString(),
      deviceId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '30d' }
  );

  // Store refresh token
  this.refreshTokens.push({
    token: refreshToken,
    deviceId,
    deviceInfo,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  return refreshToken;
};

// Clean expired refresh tokens
UserSchema.methods.cleanExpiredTokens = function(): void {
  this.refreshTokens = this.refreshTokens.filter(
    (rt: IRefreshToken) => rt.expiresAt > new Date()
  );
};

export default mongoose.model<IUser>('User', UserSchema);
