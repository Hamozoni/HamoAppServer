import { Schema, model, Types, Document } from "mongoose";
import type { FileType } from "./file.model.js";

export type MessageType =
    | "text" | "image" | "video" | "audio"
    | "document" | "location" | "contact" | "link";

export type MessageStatus =
    | "pending" | "sent" | "delivered" | "read" | "failed";

export interface IMessage extends Document {
    chatId: Types.ObjectId;
    senderId: Types.ObjectId;
    receiverId?: Types.ObjectId;    // null for group messages

    type: MessageType;
    status: MessageStatus;

    // text
    text?: string;

    // ── File ref (image/video/audio/document) ─────
    file?: Types.ObjectId;          // ref → File

    // location
    location?: {
        latitude: number;
        longitude: number;
        name?: string;
    };

    // contact
    contact?: {
        displayName: string;
        phoneNumber: string;
        avatar?: Types.ObjectId;    // ref → File
    };

    // link preview
    link?: {
        url: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        siteName?: string;
    };

    // reply
    replyTo?: {
        messageId: Types.ObjectId;
        text?: string;
        type: MessageType;
        senderId: Types.ObjectId;
        file?: Types.ObjectId;  // ref → File (for media replies)
    };

    // receipts
    readBy: {
        userId: Types.ObjectId;
        readAt: Date;
    }[];
    deliveredTo: {
        userId: Types.ObjectId;
        deliveredAt: Date;
    }[];

    // flags
    isDeleted: boolean;
    deletedFor: Types.ObjectId[];
    isEdited: boolean;
    editedAt?: Date;
    isStarred: boolean;
    starredBy: Types.ObjectId[];

    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        type: {
            type: String,
            enum: ["text", "image", "video", "audio", "document", "location", "contact", "link"],
            required: true,
            default: "text",
        },
        status: {
            type: String,
            enum: ["pending", "sent", "delivered", "read", "failed"],
            default: "pending",
            index: true,
        },

        // ── Text ─────────────────────────────────
        text: {
            type: String,
            default: null,
        },

        // ── File ref ─────────────────────────────
        // single ref covers image/video/audio/document
        // populate with File schema to get url, metadata, etc.
        file: {
            type: Schema.Types.ObjectId,
            ref: "File",
            default: null,
        },

        // ── Location ─────────────────────────────
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            name: { type: String, default: null },
        },

        // ── Contact ──────────────────────────────
        contact: {
            displayName: { type: String },
            phoneNumber: { type: String },
            avatar: {
                type: Schema.Types.ObjectId,
                ref: "File",
                default: null,
            },
        },

        // ── Link ─────────────────────────────────
        link: {
            url: { type: String },
            title: { type: String, default: null },
            description: { type: String, default: null },
            thumbnail: { type: String, default: null },
            siteName: { type: String, default: null },
        },

        // ── Reply ────────────────────────────────
        replyTo: {
            messageId: { type: Schema.Types.ObjectId, ref: "Message" },
            text: { type: String, default: null },
            type: { type: String },
            senderId: { type: Schema.Types.ObjectId, ref: "User" },
            file: { type: Schema.Types.ObjectId, ref: "File", default: null },
        },

        // ── Receipts ─────────────────────────────
        readBy: [{
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            readAt: { type: Date, default: Date.now },
        }],
        deliveredTo: [{
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            deliveredAt: { type: Date, default: Date.now },
        }],

        // ── Flags ────────────────────────────────
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        deletedFor: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        isStarred: {
            type: Boolean,
            default: false,
        },
        starredBy: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    {
        timestamps: true,
    }
);

// ── Indexes ───────────────────────────────────────
MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, status: 1 });
MessageSchema.index({ starredBy: 1 });
MessageSchema.index({ "replyTo.messageId": 1 });

// ── Auto-update Chat on new message ──────────────
MessageSchema.post("save", async function (doc) {
    const Chat = mongoose.model("Chat");

    const preview =
        doc.type === "text" ? doc.text :
            doc.type === "image" ? "📷 Photo" :
                doc.type === "video" ? "🎥 Video" :
                    doc.type === "audio" ? "🎤 Voice message" :
                        doc.type === "document" ? "📄 Document" :
                            doc.type === "location" ? "📍 Location" :
                                doc.type === "contact" ? "👤 Contact" :
                                    doc.type === "link" ? doc.link?.title ?? "🔗 Link" :
                                        "Message";

    await Chat.findByIdAndUpdate(doc.chatId, {
        lastMessage: doc._id,
        lastMessageText: preview,
        lastMessageType: doc.type,
        lastMessageAt: doc.createdAt,
        lastMessageSenderId: doc.senderId,
        ...(doc.receiverId && {
            $inc: { [`unreadCount.${doc.receiverId}`]: 1 },
        }),
    });
});

import mongoose from "mongoose";
export default model<IMessage>("Message", MessageSchema);