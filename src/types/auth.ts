import mongoose, { Document } from "mongoose"

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId,

    phoneNumber: string;
    countryCode: string;

    displayName: string;
    about?: string;

    profilePictureFileId?: mongoose.Types.ObjectId;

    lastSeen: Date;
    isOnline: boolean;

    isBlocked: boolean;

    createdAt: Date;
    updatedAt: Date;


}

export interface IDevice extends Document {
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
    model: any,
    createdAt: Date,
    updatedAt: Date
}

export interface ISession extends Document {
    userId: mongoose.Types.ObjectId,
    deviceId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    lastUsedAt: Date,
    ipAddress: string,
    userAgent: string,
    revoked: boolean,
    createdAt: Date,
    updatedAt: Date
    refreshTokenVersion: number
    multi: boolean
}