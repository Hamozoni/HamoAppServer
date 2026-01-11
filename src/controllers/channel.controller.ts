import type { NextFunction, Response } from 'express';
import Channel from "../models/channel.model.js";
import type { IAuthRequest } from "../types/index.js";

export const getAllChannels = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { _id } = req.user!;

    try {
        const channels = await Channel.find({ $or: [{ onwer: _id }, { followers: _id }] });
        res.status(200).json(channels);
    }
    catch (error) {
        next(error);
    }
};

export const getChannelDetails = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    
    try {
        const channel = await Channel.findById(channelId)
            .populate({
                path: 'messages',
                limit,
                skip: limit * (page - 1)
            });
        
        if (!channel) {
            res.status(404).json({ message: 'Channel not found' });
            return;
        }
        
        res.status(200).json(channel);
    }
    catch (error) {
        next(error);
    }
};
