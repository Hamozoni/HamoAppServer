// Notification controller - placeholder for future implementation
import type { NextFunction, Response } from 'express';
import type { IAuthRequest } from "../types/index.js";

export const getNotifications = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // TODO: Implement notification logic
        res.status(200).json({ notifications: [] });
    } catch (error) {
        next(error);
    }
};
