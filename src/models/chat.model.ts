import { Schema, model, Types, Document } from "mongoose";

export interface IChat extends Document {

    participants: string[];
    isGroup: boolean;
    groupName?: string;
    groupAvatar?: Types.ObjectId;   // ref → File

    groupAdmins: string[];

    lastMessage?: Types.ObjectId;
    lastMessageText?: string;
    lastMessageType: string;
    lastMessageAt?: Date;
    lastMessageSenderId?: Types.ObjectId;

    // per-user settings — keyed by userId string
    unreadCount: Map<string, number>;
    isPinned: Map<string, boolean>;
    isArchived: Map<string, boolean>;
    isMuted: Map<string, boolean>;
    mutedUntil: Map<string, Date>;

    createdAt: Date;
    updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
    {
        participants: [{
            type: String,
            ref: "User",
            required: true,
        }],

        isGroup: {
            type: Boolean,
            default: false,
            index: true,
        },
        groupName: {
            type: String,
            default: null,
        },

        // ── References your File schema ───────────
        groupAvatar: {
            type: Types.ObjectId,
            ref: "File",
            default: null,
        },

        groupAdmins: [{
            type: String,
            ref: "User",
        }],

        // ── Last message preview ──────────────────
        lastMessage: {
            type: Types.ObjectId,
            ref: "Message",
            default: null,
        },
        lastMessageText: {
            type: String,
            default: null,
        },
        lastMessageType: {
            type: String,
            enum: ["text", "image", "video", "audio", "document", "location", "contact", "link"],
            default: "text",
        },
        lastMessageAt: {
            type: Date,
            default: null,
            index: true,
        },
        lastMessageSenderId: {
            type: Types.ObjectId,
            ref: "User",
            default: null,
        },

        // ── Per-user settings ─────────────────────
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
        isPinned: {
            type: Map,
            of: Boolean,
            default: {},
        },
        isArchived: {
            type: Map,
            of: Boolean,
            default: {},
        },
        isMuted: {
            type: Map,
            of: Boolean,
            default: {},
        },
        mutedUntil: {
            type: Map,
            of: Date,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// ── Indexes ───────────────────────────────────────
ChatSchema.index({ participants: 1 });
ChatSchema.index({ participants: 1, lastMessageAt: -1 });

// ── Find direct chat between two users ───────────
ChatSchema.statics.findDirectChat = async function (userA: string, userB: string) {
    return this.findOne({
        isGroup: false,
        participants: { $all: [userA, userB], $size: 2 },
    });
};

export default model<IChat>("Chat", ChatSchema);