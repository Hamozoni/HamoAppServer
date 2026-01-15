// src/models/Device.ts
import mongoose, { Schema } from "mongoose";
import type { IDevice } from "../types/auth.js";

const DeviceSchema = new Schema<IDevice>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        deviceId: {
            type: String,
            required: true
        },

        platform: {
            type: String,
            required: true // ios | android | web | desktop
        },

        deviceName: {
            type: String,
            required: true
        },

        publicKey: {
            type: String // for E2EE (Signal protocol later)
        },

        lastActive: {
            type: Date,
            default: Date.now
        },
        isPrimary: { type: Boolean, default: false }, // phone
        isLinked: { type: Boolean, default: false },  // web/desktop
        linkedAt: {
            type: Date,
            require: false,
        },
        pushToken: String,
        isActive: {
            type: Boolean,
            default: true
        },
        model: { type: String, required: true, default: "Unknown" }
    },
    {
        timestamps: true
    }
);

// One deviceId per user
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model<IDevice>("Device", DeviceSchema);
