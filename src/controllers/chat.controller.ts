import type { Request, Response } from "express";

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js"
import Message from "../models/message.model.js";
import chatParticipantsModel from "../models/chatParticipants.model.js";

class ChatController {

    // GET /chats
    async getChats(req: Request, res: Response): Promise<Response> {

        try {
            const userId = (req as any)?.userId?.toString();

            const myChats = await chatParticipantsModel.find({ user: userId }).populate('chatId')

            if (!myChats) {
                return res.status(200).json({ chats: [] });
            }

            const chatsIds = myChats.map(p => p?.chatId?._id);

            const participants = await chatParticipantsModel.find({ chatId: { $in: chatsIds }, user: { $ne: [userId] } })
                .select('user _id chatId role joinedAt')
                .populate("user", '_id displayName about phoneNumber countryISO countryCode profilePicture')



            await Message.updateMany({
                chatId: { $in: [...myChats.map(chat => chat?.chatId?._id)] },
                senderId: { $ne: userId },
                status: "sent",

            },
                {
                    status: "delivered",

                }
            );

            await Chat.updateMany({
                participants: { $in: [userId] },
                lastMessageStatus: "sent",
                lastMessageSenderId: { $ne: userId }
            }, {
                lastMessageStatus: "delivered",
            });

            const chats = myChats.map(chat => ({
                ...chat?.chatId?._doc,
                role: chat.role,
                joinedAt: chat.joinedAt,
                unreadCount: chat.unreadCount,
                isPinned: chat.isPinned,
                isArchived: chat.isArchived,
                isMuted: chat.isMuted,
                mutedUntil: chat.mutedUntil,
            }));

            console.log({ chat: chats[0] })


            return res.status(200).json({ chats, participants });

        } catch (err: any) {
            console.error("getChats error:", err.message);
            return res.status(500).json({ message: "Failed to fetch chats" });
        }
    }

    // GET /chats/phone/:phoneNumber
    async getChatByPhone(req: Request, res: Response): Promise<Response> {
        try {
            const userId = (req as any).user._id;
            const { phoneNumber } = req.params;

            const receiver = await User.findOne({ phoneNumber }).select("_id");

            if (!receiver) {
                return res.status(404).json({ message: "User not found" });
            }

            const chat = await Chat.findOne({
                isGroup: false,
                participants: { $all: [userId, receiver._id], $size: 2 },
            }).select("_id");

            if (!chat) {
                return res.status(404).json({ message: "No chat yet" });
            }

            return res.json({ chatId: chat._id });
        } catch (err: any) {
            return res.status(500).json({ message: "Failed to get chat" });
        }
    }
}

function formatTime(createdAt: string): string {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(date, today)) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    if (sameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default new ChatController();