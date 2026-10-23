import type { Request, Response } from "express";

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js"
import Message from "../models/message.model.js";

class ChatController {

    // GET /chats
    async getChats(req: Request, res: Response): Promise<Response> {

        try {
            const userId = (req as any)?.userId?.toString();

            const chats = await Chat.find({
                participants: { $in: [userId] },
            })
                .sort({ lastMessageAt: -1 })
                .populate("groupAvatar", "secureUrl")
                .populate({
                    path: "groupAdmins",
                    select: "displayName phoneNumber _id about",
                    populate: {
                        path: "profilePicture",
                        select: "secureUrl" // specify the fields you want from the profilePicture document
                    }
                })
                .populate({
                    path: "participants",
                    select: "displayName phoneNumber _id profilePicture about",
                    populate: {
                        path: "profilePicture",
                        select: "secureUrl" // fields you want from the profilePicture document (e.g., secureUrl, url, etc.)
                    }
                });


            await Message.updateMany({
                chatId: { $in: [...chats.map(chat => chat._id)] },
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
            })

            console.log(chats[0]?.unreadCount);

            return res.status(200).json({ chats });

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