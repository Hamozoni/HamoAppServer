import type { NextFunction, Response } from 'express';
import Status from '../models/status.model.js';
import type { IAuthRequest } from "../types/index.js";

export const getAllStatus = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { _id, contacts } = req.user!;
    
    try {
        const status = await Status.find({ onwer: { $in: [...(contacts || []), _id] } });
        res.status(200).json(status);
    }
    catch (error) {
        next(error);
    }
};
