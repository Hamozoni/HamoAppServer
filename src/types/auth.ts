import mongoose, { Document } from "mongoose"

export interface IUser {
    phoneNumber: string,
    displayName: string,
    profilePicture: String,
    about: string,
    isPhoneVerified: boolean
}

export interface IDevice {
    userId: mongoose.Types.ObjectId,
    deviceId: string,
    platform: string,
    deviceName: string,
    publicKey?: string,
    lastActive: Date,
    isPrimary: boolean, // phone
    isLinked: boolean,  // web/desktop
    linkedAt: Date,
    pushToken: string,
    isActive: boolean
    model?: string,
}

export interface ISession {
    userId: mongoose.Types.ObjectId,
    deviceId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    lastUsedAt: Date,
    ipAddress: string,
    userAgent: string,
    revoked: boolean
}