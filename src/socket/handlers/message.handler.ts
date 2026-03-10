import { Types } from "mongoose";
import Message from "../../models/message.model.js";
import Chat from "../../models/chat.model.js";
import User from "../../models/user.model.js";
import { SOCKET_EVENTS } from "../socket.events.js";
import { socketService } from "../../../index.js";

interface SendMessagePayload {
    chatId?: string;
    receiverId?: string;      // MongoDB _id
    phoneNumber?: string;      // fallback if no receiverId
    type: string;
    text?: string;
    fileId?: string;
    location?: { latitude: number; longitude: number; name?: string };
    contact?: { displayName: string; phoneNumber: string; avatar?: string };
    link?: { url: string; title?: string; description?: string; thumbnail?: string };
    replyTo?: { messageId: string; text?: string; type: string; senderId: string; fileId?: string };
    clientMessageId: string;
}

export async function handleSendMessage(socket: any, payload: SendMessagePayload) {
    const senderId = socket.userId;

    try {
        // ── 1. Resolve receiver ──────────────────────
        let receiverId = payload.receiverId;

        if (!receiverId && payload.phoneNumber) {
            // Find receiver by phone number
            const receiver = await User.findOne({
                phoneNumber: payload.phoneNumber
            }).select("_id");

            if (!receiver) {
                return socket.emit(SOCKET_EVENTS.ERROR, {
                    event: SOCKET_EVENTS.MESSAGE_SEND,
                    message: "Receiver not found",
                });
            }
            receiverId = receiver._id.toString();
        }

        if (!receiverId) {
            return socket.emit(SOCKET_EVENTS.ERROR, {
                event: SOCKET_EVENTS.MESSAGE_SEND,
                message: "receiverId or phoneNumber is required",
            });
        }

        // ── 2. Validate content ──────────────────────
        if (payload.type === "text" && !payload.text?.trim()) {
            return socket.emit(SOCKET_EVENTS.ERROR, {
                event: SOCKET_EVENTS.MESSAGE_SEND,
                message: "Text is required for text messages",
            });
        }

        // ── 3. Find or create chat ───────────────────
        let chat = null;

        if (payload.chatId) {
            chat = await Chat.findById(payload.chatId);
        }

        if (!chat) {
            // Check if chat already exists between these two users
            chat = await Chat.findOne({
                isGroup: false,
                participants: { $all: [senderId, receiverId], $size: 2 },
            });
        }

        if (!chat) {
            // Create new chat
            chat = await Chat.create({
                participants: [senderId, receiverId],
                isGroup: false,
                unreadCount: {},
                isPinned: {},
                isArchived: {},
                isMuted: {},
                mutedUntil: {},
            });

            // Notify both users about new chat
            socketService.emitToUser(receiverId, "chat:new", chat);
            socketService.emitToUser(senderId, "chat:new", chat);
        }

        // ── 4. Save message ──────────────────────────
        const message = await Message.create({
            chatId: chat._id,
            senderId: new Types.ObjectId(senderId),
            receiverId: new Types.ObjectId(receiverId),
            type: payload.type,
            text: payload.text?.trim() ?? null,
            file: payload.fileId ? new Types.ObjectId(payload.fileId) : null,
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

        // ── 5. Populate ──────────────────────────────
        const populated = await Message.findById(message._id)
            .populate("file", "secureUrl thumbnailUrl type metadata")
            .populate("senderId", "displayName profilePicture phoneNumber")
            .populate("replyTo.file", "secureUrl type")
            .lean();

        // ── 6. Emit back to sender (replace optimistic) ──
        socket.emit(SOCKET_EVENTS.MESSAGE_NEW, {
            message: populated,
            chatId: chat?._id?.toString(),
            clientMessageId: payload.clientMessageId,
        });

        // ── 7. Deliver to receiver ───────────────────
        const isOnline = socketService.isUserOnline(receiverId);

        if (isOnline) {
            socketService.emitToUser(receiverId, SOCKET_EVENTS.MESSAGE_NEW, {
                message: populated,
                chatId: chat?._id?.toString(),
            });

            // Mark as delivered
            await Message.findByIdAndUpdate(message._id, {
                status: "delivered",
                $push: {
                    deliveredTo: {
                        userId: new Types.ObjectId(receiverId),
                        deliveredAt: new Date(),
                    },
                },
            });

            // Notify sender of delivery
            socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
                clientMessageId: payload.clientMessageId,
                messageId: message?._id?.toString(),
                chatId: chat?._id?.toString(),
                status: "delivered",
            });

        } else {
            // Receiver offline — stays as sent
            socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
                clientMessageId: payload.clientMessageId,
                messageId: message?._id?.toString(),
                chatId: chat?._id?.toString(),
                status: "sent",
            });
        }

        console.log(`✅ Message sent: ${message._id} from ${senderId} to ${receiverId}`);

    } catch (error: any) {
        console.error("❌ handleSendMessage error:", error.message);
        socket.emit(SOCKET_EVENTS.ERROR, {
            event: SOCKET_EVENTS.MESSAGE_SEND,
            clientMessageId: payload.clientMessageId,
            message: "Failed to send message",
        });
    }
}