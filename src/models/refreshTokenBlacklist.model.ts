import mongoose from "mongoose";

const tokenBlacklistSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 0, // Auto-delete after token expiry
        },
    },
    { timestamps: true }
);

export default mongoose.model(
    "RefreshTokenBlacklist",
    tokenBlacklistSchema
);