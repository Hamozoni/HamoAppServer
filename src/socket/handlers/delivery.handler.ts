import { Types } from "mongoose";
import Message from "../../models/message.model.js";
import { SOCKET_EVENTS } from "../socket.events.js";
import { socketService } from "../../../index.js";

// Called when a user connects — deliver all pending messages
export async function deliverPendingMessages(userId: string) {
    try {
        // Find all undelivered messages for this user
        const pendingMessages = await Message.find({
            receiverId: new Types.ObjectId(userId),
            status: "sent",
            isDeleted: false,
        })
            .populate("file", "secureUrl thumbnailUrl type metadata")
            .populate("senderId", "displayName profilePicture")
            .lean();

        if (pendingMessages.length === 0) return;

        console.log(`📬 Delivering ${pendingMessages.length} pending messages to ${userId}`);

        // Group by chatId for efficient emit
        const byChatId = pendingMessages.reduce((acc, msg) => {
            const chatId = msg.chatId.toString();
            if (!acc[chatId]) acc[chatId] = [];
            acc[chatId].push(msg);
            return acc;
        }, {} as Record<string, typeof pendingMessages>);

        for (const [chatId, messages] of Object.entries(byChatId)) {
            // Deliver all messages in this chat at once
            socketService.emitToUser(userId, SOCKET_EVENTS.MESSAGE_NEW, {
                chatId,
                messages, // array of messages
            });

            // Update status to delivered
            const messageIds = messages.map(m => m._id);

            await Message.updateMany(
                { _id: { $in: messageIds } },
                {
                    status: "delivered",
                    $push: {
                        deliveredTo: {
                            userId: new Types.ObjectId(userId),
                            deliveredAt: new Date(),
                        },
                    },
                }
            );

            // Notify senders their messages were delivered
            const senderIds = [...new Set(messages.map(m => m.senderId._id.toString()))];

            for (const senderId of senderIds) {
                const senderMessages = messages.filter(
                    m => m.senderId._id.toString() === senderId
                );

                socketService.emitToUser(senderId, SOCKET_EVENTS.MESSAGE_DELIVERED, {
                    chatId,
                    messageIds: senderMessages.map(m => m._id),
                    status: "delivered",
                });
            }
        }
    } catch (error: any) {
        console.error("❌ deliverPendingMessages error:", error.message);
    }
}