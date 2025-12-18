import Chat from "../models/chat.model.js";

export const getAllChats = async (req, res, next) => {

    const user_id = req.user._id;

    try {
        const chats = await Chat.find({ participants: { $in: user_id } })
            .populate({
                path: 'participants',
                select: '_id firebaseUid displyName photoURL bio'
            });

        console.log(chats)
        return res.status(200).json(chats);
    }
    catch (error) {
        next(error)
    }
};


export const getChatDetails = async (req, res, next) => {

    const chatId = req.params;
    const user_id = req.user._id;
    const { page = 1, limit = 30 } = req.query;

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

        if (chat.participants.includes(user_id)) {
            return res.status(201).json(chat)
        } else {
            return res.status(401).json({ messages: 'unauthorized' })
        }


    }
    catch (error) {
        next(error)
    }


}