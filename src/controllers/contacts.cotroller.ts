import type { Request, Response } from "express";
import type { IUser } from "../types/auth.js";
import User from "../models/user.model.js";

import { parsePhoneNumberFromString } from "libphonenumber-js";

const normalizePhone = (raw: string, defaultCountryISO: string): string | null => {

    const phone = parsePhoneNumberFromString(raw, defaultCountryISO as any);

    if (!phone || !phone.isValid()) return null;

    return phone.number; // E.164 → +249912345678

};

class ContactsController {

    async getContacts(req: Request, res: Response): Promise<Response> {
        try {
            const userId: string | undefined = (req as any)?.userId;

            if (!userId)
                return res.status(400).json({ error: 'Missing user ID' });

            const phoneNumbers: string[] | undefined = (req as any)?.body?.phoneNumbers;


            const countryISO = (req as any)?.body?.countryISO;

            if (!phoneNumbers)
                return res.status(400).json({ error: 'Missing phone number' });

            const normalized = phoneNumbers.map(n => n && normalizePhone(n, countryISO))
                .filter(Boolean);

            const contacts: IUser[] | null = await User.find({ phoneNumber: { $in: normalized } })
                .select("_id displayName about phoneNumber countryISO countryCode").populate("profilePicture", "secureUrl")

            console.log(contacts)
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