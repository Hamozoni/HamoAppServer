import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

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

router.post(
    '/update-profile-picture',
    authMiddleware,
    profileController.updateProfilePicture
);

export default router;
