import User from "../models/user.model.js";
import type { Request, Response } from "express";
import type { IUser } from "../types/auth.ts";
import profileService from "../services/profile.service.js";

class ProfileController {

    async updateProfile(req: Request, res: Response): Promise<Response> {
        try {
            const { displayName, about } = req.body;

            console.log(req.body);
            const userId: string | undefined = (req as any)?.userId;

            const user: IUser | null = await User.findById(userId).select("_id displayName about phoneNumber").populate("profilePicture", "secureUrl");

            if (!user)
                return res.status(404).json({ error: 'User not found' });
            user.displayName = displayName || user?.displayName;
            user.about = about || user?.about;
            await user.save();
            return res.status(200).json(user);
        } catch (error) {
            console.error('❌ Update profile error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProfilePicture(req: Request, res: Response): Promise<Response> {
        try {
            const cloudinaryData = req.body;
            const userId: string | undefined = (req as any)?.userId;

            if (!cloudinaryData || !userId)
                return res.status(400).json({ error: 'Missing file or user ID' });
            const fileData = await profileService.updateProfilePicture(userId, cloudinaryData);

            return res.status(200).json(fileData);
        } catch (error) {
            console.error('❌ Update profile picture error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getProfile(req: Request, res: Response): Promise<Response> {
        try {
            const userId: string | undefined = (req as any)?.userId;
            if (!userId)
                return res.status(400).json({ error: 'Missing user ID' });
            const user: IUser | null = await User.findById(userId).select("_id displayName about phoneNumber").populate("profilePicture", "secureUrl");
            if (!user)
                return res.status(404).json({ error: 'User not found' });
            return res.status(200).json(user);
        } catch (error) {
            console.error('❌ Get profile error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};

export default new ProfileController();
