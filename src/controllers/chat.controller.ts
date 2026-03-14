import type { Request, Response } from "express";

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js"


class ChatController {

    // GET /chats
    async getChats(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user._id.toString();

            const chats = await Chat.find({
                participants: userId,
                lastMessageAt: { $ne: null },
            })
                .sort({ lastMessageAt: -1 })
                .populate("lastMessage", "text type createdAt senderId")
                .populate("groupAvatar", "secureUrl")
                .lean();

            // ── Fetch all other participants in one query ──
            const otherIds = [...new Set(
                chats.flatMap(c => c.participants.filter(p => p !== userId))
            )];

            const users = await User.find({ _id: { $in: otherIds } })
                .select("_id displayName phoneNumber profilePicture")
                .populate("profilePicture", "secureUrl")
                .lean();

            const usersMap = Object.fromEntries(
                users.map(u => [u._id.toString(), u])
            );

            const shaped = chats.map(chat => {
                const otherId = chat.participants.find(p => p !== userId);
                const other = otherId ? usersMap[otherId] : null;
                const unread =
                    (chat.unreadCount as any)?.[userId] ??
                    (chat.unreadCount as any)?.get?.(userId) ?? 0;

                return {
                    _id: chat._id,
                    isGroup: chat.isGroup,
                    groupName: chat.groupName ?? null,
                    contact: {
                        _id: other?._id ?? null,
                        displayName: other?.displayName ?? "Unknown",
                        phoneNumber: (other as any)?.phoneNumber ?? "",
                        photoURL: (other?.profilePicture as any)?.secureUrl ?? null,
                    },
                    lastMessage: {
                        type: chat.lastMessageType ?? "text",
                        text: chat.lastMessageText ?? null,
                        createdAt: chat.lastMessageAt
                            ? formatTime(chat.lastMessageAt.toISOString())
                            : "",
                        rawTime: chat.lastMessageAt?.getTime() ?? 0,  // ✅ add this
                        isMine: chat.lastMessageSenderId?.toString() === userId,
                        isRead: unread === 0,
                    },
                    unreadCount: unread,
                    isOnline: false,
                    isPinned: (chat.isPinned as any)?.[userId] ?? false,
                    isArchived: (chat.isArchived as any)?.[userId] ?? false,
                };
            });

            res.json({ chats: shaped });

        } catch (err: any) {
            console.error("getChats error:", err.message);
            res.status(500).json({ message: "Failed to fetch chats" });
        }
    }

    // GET /chats/phone/:phoneNumber
    async getChatByPhone(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user._id;
            const { phoneNumber } = req.params;

            const receiver = await User.findOne({ phoneNumber }).select("_id");
            if (!receiver) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            const chat = await Chat.findOne({
                isGroup: false,
                participants: { $all: [userId, receiver._id], $size: 2 },
            }).select("_id");

            if (!chat) {
                res.status(404).json({ message: "No chat yet" });
                return;
            }

            res.json({ chatId: chat._id });
        } catch (err: any) {
            res.status(500).json({ message: "Failed to get chat" });
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