import { Types } from "mongoose";
import Message from "../../models/message.model.js";
import Chat from "../../models/chat.model.js";
import User from "../../models/user.model.js";
import { SOCKET_EVENTS } from "../socket.events.js";
import { socketService } from "../../../index.js";
import fileService from "../../services/file.service.js";

interface SendMessagePayload {
    chatId?: string;
    receiverId?: string;      // MongoDB _id
    phoneNumber?: string;      // fallback if no receiverId
    type: "text" | "image" | "video" | "location" | "contact" | "link";
    text?: string;
    fileId?: string;
    location?: { latitude: number; longitude: number; name?: string };
    contact?: { displayName: string; phoneNumber: string; avatar?: string };
    link?: { url: string; title?: string; description?: string; thumbnail?: string };
    replyTo?: { messageId: string; text?: string; type: string; senderId: string; fileId?: string };
    clientMessageId: string;
}

export async function handleSendMessage(socket: any, { payload, cloudinaryData }: { payload: SendMessagePayload, cloudinaryData: any }) {

    try {
        // ── 2. Validate content ──────────────────────
        if (payload.type === "text" && !payload.text?.trim()) {
            return {
                success: false,
                message: "Text is required for text messages",
            }
        }

        // ── 3. Find or create chat ───────────────────
        let chat = null;
        let isNewChat = false

        if (payload.chatId) {
            chat = await Chat.findById(payload.chatId);
        }

        // Check if chat already exists between these two users
        chat = await Chat.findOne({
            isGroup: false,
            participants: { $all: [socket.userId, payload.receiverId], $size: 2 },
        });


        if (!chat) {
            // Create new chat
            chat = await Chat.create({
                participants: [socket.userId, payload.receiverId],
                isGroup: false,
            });

            isNewChat = true;

        };

        // ── 4. Save message ──────────────────────────
        let message = await Message.create({
            ...payload,
            status: "sent",
            chatId: chat._id,
        });

        if (cloudinaryData) {
            if (!message._id) return { success: false, message: "Failed to fetch messages" };


            const fileData = await fileService.saveChatMedia(
                socket.userId,
                cloudinaryData,
                { type: payload.type as "image" | "video" | "audio" | "document", messageId: message._id });

            message.file = fileData._id;

            await message.save();
        };



        await message.populate([
            { path: "file", select: "secureUrl thumbnailUrl type metadata" },
            { path: "replyTo.file", select: "secureUrl thumbnailUrl type text" },
        ]);

        const receiverSocketIds = socket.get(payload?.receiverId);
        const isOnline = receiverSocketIds && receiverSocketIds.size > 0;

        if (!isOnline) {

            return { success: true, isNewChat, message }
        }

        // 3. Check if the receiver is currently inside this specific chat room
        const roomSockets = socket.adapter.rooms.get(`chat:${payload?.chatId}`);
        let isUserInRoom = false;

        if (roomSockets && receiverSocketIds) {
            for (const socketId of receiverSocketIds) {
                if (roomSockets.has(socketId)) {
                    isUserInRoom = true;
                    break;
                }
            }
        }

        if (isUserInRoom) {
            message.status = "read";
            chat.lastMessageStatus = "read";
            await chat.save();
            await message.save();

            socket.to(`chat:${message?.chatId}`).except(socket.id).emit(SOCKET_EVENTS.MESSAGE_NEW, message);


            return { success: true, isNewChat, message }
        } else {
            // 🟡 CASE 2: Receiver is online, but NOT in this chat room (e.g., on home screen)
            // Send a targeted event to their user channel to trigger a notification / unread badge update

            message.status = "delivered";
            chat.lastMessageStatus = "delivered";
            await chat.save();
            await message.save();
            socket.to(`user:${payload?.receiverId}`).emit(SOCKET_EVENTS.CHAT_NOTIFICATION, {
                chatId: message?.id,
                message: message,
                alert: "New message received"
            });

            // Also emit back to the sender that it was sent
            return { success: true, isNewChat, message }

        }

    } catch (error: any) {
        console.error("❌ handleSendMessage error:", error.message);
        socket.emit(SOCKET_EVENTS.ERROR, {
            event: SOCKET_EVENTS.MESSAGE_SEND,
            clientMessageId: payload.clientMessageId,
            message: "Failed to send message",
        });
    }
}