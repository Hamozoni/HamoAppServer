import { Socket } from "socket.io";
import { Types } from "mongoose";
import Message from "../../models/message.model.js";
import Chat from "../../models/chat.model.js";
import { SOCKET_EVENTS } from "../socket.events.js";
import { socketService } from "../../../index.js";

interface SendMessagePayload {
    chatId?: string;        // null if first message (new chat)
    receiverId: string;     // required for direct messages
    type: "text" | "image" | "video" | "audio" | "document" | "location" | "contact" | "link";
    text?: string;
    file?: string;
    location?: { latitude: number; longitude: number; name?: string };
    contact?: { displayName: string; phoneNumber: string; avatar?: string };
    link?: { url: string; title?: string; description?: string; thumbnail?: string };
    replyTo?: {
        messageId: string;
        text?: string;
        type: string;
        senderId: string;
        fileId?: string;
    };
    clientMessageId: string; // temp ID from client for optimistic UI
}

export async function handleSendMessage(
    socket: any,
    payload: SendMessagePayload
) {
    const senderId = socket.userId;

    try {
        // ── 1. Validate ──────────────────────────────
        if (!payload.receiverId) {
            return socket.emit(SOCKET_EVENTS.ERROR, {
                event: SOCKET_EVENTS.MESSAGE_SEND,
                message: "receiverId is required",
            });
        }

        if (payload.type === "text" && !payload.text?.trim()) {
            return socket.emit(SOCKET_EVENTS.ERROR, {
                event: SOCKET_EVENTS.MESSAGE_SEND,
                message: "text is required for text messages",
            });
        }

        // ── 2. Find or create chat ───────────────────
        let chat = null;

        if (payload.chatId) {
            chat = await Chat.findById(payload.chatId);
        }

        if (!chat) {
            // First message — create new chat
            chat = await Chat.create({
                participants: [senderId, payload.receiverId],
                isGroup: false,
                unreadCount: {},
                isPinned: {},
                isArchived: {},
                isMuted: {},
                mutedUntil: {},
            });

            // Let both users know a new chat was created
            socketService.emitToUser(payload.receiverId, "chat:new", chat);
            socketService.emitToUser(senderId, "chat:new", chat);
        }

        // ── 3. Save message to MongoDB ───────────────
        const message = await Message.create({
            chatId: chat._id,
            senderId: new Types.ObjectId(senderId),
            receiverId: new Types.ObjectId(payload.receiverId),
            type: payload.type,
            text: payload.text ?? null,
            file: payload.file ? new Types.ObjectId(payload.file) : null,
            location: payload.location ?? null,
            contact: payload.contact ?? null,
            link: payload.link ?? null,
            replyTo: payload.replyTo ? {
                messageId: new Types.ObjectId(payload.replyTo.messageId),
                text: payload.replyTo.text ?? null,
                type: payload.replyTo.type,
                senderId: new Types.ObjectId(payload.replyTo.senderId),
                file: payload.replyTo.fileId
                    ? new Types.ObjectId(payload.replyTo.fileId)
                    : null,
            } : null,
            status: "sent",
            readBy: [],
            deliveredTo: [],
        });

        // ── 4. Populate for response ─────────────────
        const populated = await Message.findById(message._id)
            .populate("file", "secureUrl thumbnailUrl type metadata")
            .populate("senderId", "displayName profilePicture")
            .populate("replyTo.file", "secureUrl type")
            .lean();

        // ── 5. Emit to receiver ──────────────────────
        const isReceiverOnline = socketService.isUserOnline(payload.receiverId);

        if (isReceiverOnline) {
            // Receiver is online — deliver immediately
            socketService.emitToUser(
                payload.receiverId,
                SOCKET_EVENTS.MESSAGE_NEW,
                {
                    message: populated,
                    chatId: chat._id,
                }
            );

            // Mark as delivered
            await Message.findByIdAndUpdate(message._id, {
                status: "delivered",
                $push: {
                    deliveredTo: {
                        userId: new Types.ObjectId(payload.receiverId),
                        deliveredAt: new Date(),
                    },
                },
            });

            // Notify sender it was delivered
            socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
                clientMessageId: payload.clientMessageId,
                messageId: message._id,
                chatId: chat._id,
                status: "delivered",
            });

        } else {
            // Receiver is offline — stays as "sent"
            // Will be delivered when they come online
            socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
                clientMessageId: payload.clientMessageId,
                messageId: message._id,
                chatId: chat._id,
                status: "sent",
            });
        }

        // ── 6. Confirm to sender ─────────────────────
        socket.emit(SOCKET_EVENTS.MESSAGE_NEW, {
            message: populated,
            chatId: chat._id,
            clientMessageId: payload.clientMessageId, // so client can replace optimistic msg
        });

    } catch (error: any) {
        console.error("❌ handleSendMessage error:", error.message);
        socket.emit(SOCKET_EVENTS.ERROR, {
            event: SOCKET_EVENTS.MESSAGE_SEND,
            clientMessageId: payload.clientMessageId,
            message: "Failed to send message",
        });
    }
}