import type { NextFunction, Response } from 'express';
import Call from "../models/call.model.js";
import type { IAuthRequest } from "../types/index.js";

export const getCalls = async (req: IAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { _id } = req.user!;

        if (!_id) {
            res.status(401).json({ message: 'user id is required' });
            return;
        }

        const calls = await Call.find({ $or: [{ callee: _id }, { caller: _id }] })
            .populate('callee', 'name photoURL _id')
            .populate('caller', 'name photoURL _id')
            .sort({ createdAt: -1 });

        res.status(200).json(calls);
    }
    catch (error) {
        next(error);
    }
};
