import type { Request, Response } from "express";
import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import { Types } from "mongoose";
import fileService from "../services/file.service.js";
// import { sendMessagePush } from "../services/notifications.service.js";

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
                participants: { $in: [userId.toString()] },
            })

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
                .populate("file", "secureUrl thumbnailUrl type metadata")
                .populate("replyTo.file", "secureUrl thumbnailUrl type text")
                .lean();

            // ── 4. Mark as read 

            await Message.updateMany(
                {
                    chatId,
                    senderId: { $ne: new Types.ObjectId(userId.toString()) },
                },
                {
                    status: "read",
                    $push: {
                        readBy: {
                            userId: new Types.ObjectId(userId.toString()),
                            readAt: new Date(),
                        },

                    },
                }
            );

            if (chat.lastMessageSenderId?.toString() !== userId.toString()) {
                chat.lastMessageStatus = "read";
            }

            chat.unreadCount.set(userId.toString(), 0);
            chat.lastMessageAt = new Date();
            await chat.save();

            return res.status(200).json({
                messages: messages.reverse(), // oldest first
                hasMore: messages.length === Number(limit),
                chat
            });

        } catch (err: any) {
            console.error("getMessages error:", err.message);
            return res.status(500).json({ message: "Failed to fetch messages" });
        }
    }

    async postMessage(req: Request, res: Response): Promise<Response> {


        const { payload, cloudinaryData } = req.body;
        const senderId = (req as any).user._id;
        const user = (req as any).user._id;

        try {

            // ── 2. Validate content ──────────────────────
            if (payload.type === "text" && !payload.text?.trim()) {
                return res.status(400)
            }

            // ── 3. Find or create chat ───────────────────
            let chat = null;
            let isNewChat = false

            if (payload.chatId) {
                chat = await Chat.findById(payload.chatId);
            }

            if (!chat) {
                // Check if chat already exists between these two users
                chat = await Chat.findOne({
                    isGroup: false,
                    participants: { $all: [senderId, payload.receiverId], $size: 2 },
                });
            }

            if (!chat) {
                // Create new chat
                chat = await Chat.create({
                    participants: [senderId, payload.receiverId],
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
                if (!message._id) return res.status(500).json({ message: "Failed to fetch messages" });


                const fileData = await fileService.saveChatMedia(
                    senderId,
                    cloudinaryData,
                    { type: payload.type, messageId: message._id });

                message.file = fileData._id;

                await message.save();
            };



            await message.populate([
                { path: "file", select: "secureUrl thumbnailUrl type metadata" },
                { path: "replyTo.file", select: "secureUrl thumbnailUrl type text" },
            ]);


            return res.status(201).json({ isNewChat, message })
        }
        catch (error) {
            console.log({ err: error })
            return res.status(500).json({ message: "Failed to post message" });
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
            // const { socketService } = await import("../../index.js");
            // socketService.emitToUser(
            //     message.senderId.toString(),
            //     "message:read",
            //     {
            //         messageId,
            //         chatId: message.chatId,
            //         userId,
            //     }
            // );

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
            // const { socketService } = await import("../../index.js");
            // socketService.emitToChat(chatId!.toString(), "message:read_all", {
            //     chatId,
            //     userId,
            // });

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
                // const { socketService } = await import("../../index.js");
                // socketService.emitToChat(
                //     message.chatId.toString(),
                //     "message:deleted",
                //     { messageId, chatId: message.chatId, deleteFor: "everyone" }
                // );

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