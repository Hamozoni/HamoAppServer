import User from "../models/user.model.js";
import type { Request, Response } from "express";
import type { IUser } from "../types/auth.ts";
class ProfileController {

    async updateProfile(req: Request, res: Response): Promise<Response> {
        try {
            const { displayName, about, profilePicture, profileCover, profilePicturePublicId, profileCoverPublicId } = req.body;

            const userId: string | undefined = (req as any)?.user?.userId;

            const user: IUser | null = await User.findById(userId);
            if (!user)
                return res.status(404).json({ error: 'User not found' });
            user.displayName = displayName || user?.displayName;
            user.about = about || user?.about;
            user.profilePicture = profilePicture || user?.profilePicture;
            user.profileCover = profileCover || user?.profileCover;
            user.profilePicturePublicId = profilePicturePublicId || user?.profilePicturePublicId;
            user.profileCoverPublicId = profileCoverPublicId || user?.profileCoverPublicId;
            await user.save();
            return res.status(200).json(user);
        } catch (error) {
            console.error('❌ Update profile error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
};

export default new ProfileController();
