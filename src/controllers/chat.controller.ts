import type { Request, Response } from "express";

import User from "../models/user.model.js";
import Chat from "../models/chat.model.js"

class ChatController {
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

};


export default new ChatController()