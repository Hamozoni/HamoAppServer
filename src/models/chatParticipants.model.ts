import { Schema, model, Types, Document } from "mongoose";

export interface IParticipant extends Document {
    chatId?: Types.ObjectId;
    user?: Types.ObjectId;
    role: "admin" | "member";
    joinedAt: Date;
    unreadCount: number;
    isPinned: boolean;
    isArchived: boolean;
    isMuted: boolean;
    mutedUntil: Date;
};

const ParticipantSchema = new Schema<IParticipant>(
    {
        chatId: { type: Types.ObjectId, ref: "Chat", required: true },
        user: { type: Types.ObjectId, ref: "User", required: true },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member",
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        unreadCount: {
            type: Number,
            default: 0,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isMuted: {
            type: Boolean,
            default: false,
        },
        mutedUntil: {
            type: Date,
            default: null,
        },

    },
    {
        timestamps: true,
    }
);


export default model<IParticipant>("Participant", ParticipantSchema);