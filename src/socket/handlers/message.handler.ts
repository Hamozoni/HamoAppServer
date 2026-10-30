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

export async function handleSendMessage(socket: any, { payload, cloudinaryData, clientMessageId }: { payload: any, cloudinaryData: any, clientMessageId: string }) {

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
            participants: { $all: [payload.senderId, payload.receiverId], $size: 2 },
        });


        if (!chat) {
            // Create new chat
            chat = await Chat.create({
                participants: [payload.senderId, payload.receiverId],
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

        const isOnline = socketService.isUserOnline(payload?.receiverId);

        if (!isOnline) {
            socket.emit(SOCKET_EVENTS.MESSAGE_SENT_ACKNOWLEDGEMENT, { success: true, isNewChat, message, clientMessageId });

            return

        }

        // const receiverSocketIds = socket.get(payload?.receiverId);
        // 3. Check if the receiver is currently inside this specific chat room


        let isUserInRoom = socketService.isUserInChatRoom(payload?.receiverId, new Types.ObjectId(message?.chatId)?.toString());


        if (isUserInRoom) {
            message.status = "read";
            chat.lastMessageStatus = "read";
            await chat.save();
            await message.save();

            socket.to(`chat:${message?.chatId}`).except(socket.id).emit(SOCKET_EVENTS.MESSAGE_NEW, message);

            socket.emit(SOCKET_EVENTS.MESSAGE_SENT_ACKNOWLEDGEMENT, { success: true, isNewChat, message, clientMessageId })

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
            socket.emit(SOCKET_EVENTS.MESSAGE_SENT_ACKNOWLEDGEMENT, { success: true, isNewChat, message, clientMessageId });


        }

    } catch (error: any) {
        console.error("❌ handleSendMessage error:", { error });
        socket.emit(SOCKET_EVENTS.ERROR, {
            event: SOCKET_EVENTS.MESSAGE_SEND,
            clientMessageId: payload.clientMessageId,
            message: "Failed to send message",
        });
    }
}