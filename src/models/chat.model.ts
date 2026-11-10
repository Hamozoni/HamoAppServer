import { Schema, model, Types, Document } from "mongoose";

export interface IChat extends Document {

    isGroup: boolean;
    groupName?: string;
    groupAvatar?: Types.ObjectId;   // ref → File

    lastMessageId?: Types.ObjectId;
    lastMessageText?: string;
    lastMessageType: string;
    lastMessageAt?: Date;
    lastMessageSenderId?: Types.ObjectId;
    lastMessageStatus: string;

    createdAt: Date;
    updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
    {

        isGroup: {
            type: Boolean,
            default: false,
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

        // ── Last message preview ──────────────────
        lastMessageId: {
            type: Types.ObjectId,
            ref: "Message"
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
        },
        lastMessageStatus: {
            type: String,
            enum: ["pending", "sent", "delivered", "read", "failed"],
            default: "sent",
        },
        lastMessageSenderId: {
            type: Types.ObjectId,
            ref: "User",
            default: null,
        }
    },
    {
        timestamps: true,
    }
);


export default model<IChat>("Chat", ChatSchema);


