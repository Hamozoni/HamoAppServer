import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 86400, // Auto-delete after token expiry
        },
    },
    { timestamps: true }
);

export default mongoose.model(
    "RefreshTokenBlacklist",
    tokenBlacklistSchema
);