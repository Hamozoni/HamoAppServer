import type { Request, Response } from "express";
import type { IUser } from "../types/auth.js";
import User from "../models/user.model.js";


class ContactsController {
    async getContacts(req: Request, res: Response): Promise<Response> {
        try {
            const userId: string | undefined = (req as any)?.userId;
            if (!userId)
                return res.status(400).json({ error: 'Missing user ID' });

            const phoneNumbers: string | undefined = (req as any)?.body;
            if (!phoneNumbers)
                return res.status(400).json({ error: 'Missing phone number' });
            const contacts: IUser[] | null = await User.find({ phoneNumber: { $in: phoneNumbers } })
                .populate("_id displayName profilePictureFileId about phoneNumber");
            if (!contacts)
                return res.status(404).json({ error: 'Contacts not found' });
            return res.status(200).json(contacts);
        } catch (error) {
            console.error('❌ Get contacts error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};


export default new ContactsController();