import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import User from "../models/user.model.js";

const router = Router();

router.post(
    '/update',
    authMiddleware,
    profileController.updateProfile
);

router.get(
    '/',
    authMiddleware,
    profileController.getProfile
);

router.post("/push-token", authMiddleware, async (req, res) => {
    const { token } = req.body;
    await User.findByIdAndUpdate((req as any).userId, { pushToken: token });
    res.json({ success: true });
});

router.post(
    '/update-profile-picture',
    authMiddleware,
    profileController.updateProfilePicture
);

export default router;
