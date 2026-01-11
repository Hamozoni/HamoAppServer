import type { NextFunction, Response } from 'express';
import Chat from "../models/chat.model.js";
import type { IAuthRequest } from "../types/index.js";

export const getAllChats = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user_id = req.user!._id.toString();

    try {
        const chats = await Chat.find({ participants: { $in: [user_id] } })
            .populate({
                path: 'participants',
                select: '_id firebaseUid displyName photoURL bio'
            });

        console.log(chats);
        res.status(200).json(chats);
    }
    catch (error) {
        next(error);
    }
};

export const getChatDetails = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { chatId } = req.params;
    const user_id = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    try {
        const chat = await Chat.findById(chatId)
            .populate({
                path: 'messages',
                options: {
                    sort: { createdAt: -1 },
                    limit,
                    skip: limit * (page - 1)
                }
            })
            .populate({
                path: 'participants',
                select: '_id firebaseUid displyName photoURL bio'
            });

        if (!chat) {
            res.status(404).json({ message: 'Chat not found' });
            return;
        }

        if (chat.participants.includes(user_id.toString())) {
            res.status(200).json(chat);
        } else {
            res.status(401).json({ message: 'unauthorized' });
        }
    }
    catch (error) {
        next(error);
    }
};
