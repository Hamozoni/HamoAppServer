// src/models/Session.ts
import mongoose, { Schema } from "mongoose";
import type { ISession } from "../types/auth.js";

const SessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        deviceId: {
            type: String,
            required: true,
            index: true
        },

        refreshTokenHash: {
            type: String,
            required: true,
            unique: true
        },

        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 } // Mongo TTL index
        },

        lastUsedAt: {
            type: Date,
            default: Date.now
        },

        ipAddress: String,

        userAgent: String,

        revoked: {
            type: Boolean,
            default: false
        },
        multi: {
            type: Boolean,
            default: false
        },
        refreshTokenVersion: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

// One active session per device (optional policy)
SessionSchema.index(
    { userId: 1, deviceId: 1 },
    { unique: true }
);

export default mongoose.model<ISession>("Session", SessionSchema);
