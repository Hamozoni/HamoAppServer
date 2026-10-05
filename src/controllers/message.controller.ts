import type { Request, Response } from "express";
import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { Types } from "mongoose";

class MessageController {

    // GET /messages/:chatId
    async getMessages(req: Request, res: Response): Promise<Response> {
        try {
            const { chatId } = req.params;
            const userId = (req as any).user._id;
            const { before, limit = 50 } = req.query;

            // ── 1. Verify user is participant ────────
            const chat = await Chat.findOne({
                _id: chatId,
                participants: userId.toString(),
            });

            if (!chat) {
                return res.status(404).json({ message: "Chat not found" });
            }

            // ── 2. Build query ───────────────────────
            const query: any = {
                chatId,
                isDeleted: false,
                // Hide messages deleted for this user
                deletedFor: { $ne: new Types.ObjectId(userId.toString()) },
            };

            // Pagination — load messages before a certain date
            if (before) {
                query.createdAt = { $lt: new Date(before as string) };
            }

            // ── 3. Fetch messages ────────────────────
            const messages = await Message.find(query)
                .sort({ createdAt: 1 })
                .limit(Number(limit))
                .populate("file", "secureUrl thumbnailUrl type metadata")
                .populate({
                    path: "senderId",
                    select: "_id displayName profilePicture",
                    populate: {
                        path: 'profilePicture',
                        select: 'secureUrl'
                    }
                })
                .populate("replyTo.file", "secureUrl thumbnailUrl type")
                .lean();

            // ── 4. Mark as delivered if not already ──
            const undelivered = messages.filter(m =>
                m.status === "sent" &&
                m.senderId._id.toString() !== userId.toString()
            );

            if (undelivered.length > 0) {
                await Message.updateMany(
                    {
                        _id: { $in: undelivered.map(m => m._id) },
                        status: "sent",
                    },
                    {
                        status: "delivered",
                        $push: {
                            deliveredTo: {
                                userId: new Types.ObjectId(userId.toString()),
                                deliveredAt: new Date(),
                            },
                        },
                    }
                );
            }

            return res.status(200).json({
                messages: messages.reverse(), // oldest first
                hasMore: messages.length === Number(limit),
            });

        } catch (err: any) {
            console.error("getMessages error:", err.message);
            return res.status(500).json({ message: "Failed to fetch messages" });
        }
    }

    // GET /messages/:chatId/starred
    async getStarredMessages(req: Request, res: Response): Promise<Response> {
        try {

            const { chatId } = req.params;
            const userId = (req as any).user._id;

            const messages = await Message.find({
                chatId,
                starredBy: userId,
                isDeleted: false,
            })
                .sort({ createdAt: -1 })
                .populate("file", "secureUrl thumbnailUrl type metadata")
                .populate("senderId", "displayName profilePicture")
                .lean();

            return res.status(200).json({ messages });

        } catch (err: any) {
            console.error("getStarredMessages error:", err.message);
            return res.status(500).json({ message: "Failed to fetch starred messages" });
        }
    }

    // PATCH /messages/:messageId/read
    async markAsRead(req: Request, res: Response): Promise<Response> {
        try {
            const { messageId } = req.params;
            const userId = (req as any).user._id;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            const alreadyRead = message.readBy.some(
                r => r.userId.toString() === userId.toString()
            );
            if (alreadyRead) {
                return res.status(200).json({ success: true });
            }

            await Message.findByIdAndUpdate(messageId, {
                status: "read",
                $push: {
                    readBy: {
                        userId,
                        readAt: new Date(),
                    },
                },
            });

            // Notify sender via socket
            const { socketService } = await import("../../index.js");
            socketService.emitToUser(
                message.senderId.toString(),
                "message:read",
                {
                    messageId,
                    chatId: message.chatId,
                    userId,
                }
            );

            return res.status(200).json({ success: true });

        } catch (err: any) {
            console.error("markAsRead error:", err.message);
            return res.status(500).json({ message: "Failed to mark as read" });
        }
    }

    // PATCH /messages/:chatId/read-all
    async markAllAsRead(req: Request, res: Response): Promise<Response> {
        try {
            const { chatId } = req.params;
            const userId = (req as any).user._id;

            await Message.updateMany(
                {
                    chatId,
                    senderId: { $ne: userId },
                    status: { $ne: "read" },
                    isDeleted: false,
                },
                {
                    status: "read",
                    $push: {
                        readBy: {
                            userId,
                            readAt: new Date(),
                        },
                    },
                }
            );

            // Reset unread count for this user
            await Chat.findByIdAndUpdate(chatId, {
                [`unreadCount.${userId}`]: 0,
            });

            // Notify sender via socket
            const { socketService } = await import("../../index.js");
            socketService.emitToChat(chatId!.toString(), "message:read_all", {
                chatId,
                userId,
            });

            return res.status(200).json({ success: true });

        } catch (err: any) {
            console.error("markAllAsRead error:", err.message);
            return res.status(500).json({ message: "Failed to mark all as read" });
        }
    }

    // DELETE /messages/:messageId
    async deleteMessage(req: Request, res: Response): Promise<Response> {
        try {
            const { messageId } = req.params;
            const { deleteFor } = req.body; // "me" | "everyone"
            const userId = (req as any).user._id;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: "Message not found" });
            }

            if (deleteFor === "everyone") {
                // Only sender can delete for everyone
                if (message.senderId.toString() !== userId.toString()) {
                    return res.status(403).json({ message: "Not authorized" });
                }

                await Message.findByIdAndUpdate(messageId, {
                    isDeleted: true,
                    text: null,
                    file: null,
                });

                // Notify everyone in chat
                const { socketService } = await import("../../index.js");
                socketService.emitToChat(
                    message.chatId.toString(),
                    "message:deleted",
                    { messageId, chatId: message.chatId, deleteFor: "everyone" }
                );

            } else {
                // Delete for me only
                await Message.findByIdAndUpdate(messageId, {
                    $push: { deletedFor: new Types.ObjectId(userId.toString()) },
                });
            }

            return res.status(200).json({ success: true });

        } catch (err: any) {
            console.error("deleteMessage error:", err.message);
            return res.status(500).json({ message: "Failed to delete message" });
        }
    }

    // PATCH /messages/:messageId/star
    async starMessage(req: Request, res: Response): Promise<Response> {
        try {
            const { messageId } = req.params;
            const { star } = req.body; // true | false
            const userId = (req as any).user._id;

            await Message.findByIdAndUpdate(messageId, {
                [star ? "$addToSet" : "$pull"]: {
                    starredBy: new Types.ObjectId(userId.toString()),
                },
                isStarred: star,
            });

            return res.status(200).json({ success: true });

        } catch (err: any) {
            console.error("starMessage error:", err.message);
            return res.status(500).json({ message: "Failed to star message" });
        }
    }
}

export default new MessageController();