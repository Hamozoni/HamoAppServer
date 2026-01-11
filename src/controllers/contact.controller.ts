import type { NextFunction, Response } from 'express';
import User from "../models/user.model.js";
import type { IAuthRequest } from "../types/index.js";

export const getAllContactsController = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { contacts } = req.user!;
        res.status(200).json(contacts);
    } catch (error) {
        next(error);
    }
};

export const getContactController = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email } = req.params;

    try {
        const user = await User.findOne({ email })
            .populate('contacts', '_id displayName email photoURL');

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};
