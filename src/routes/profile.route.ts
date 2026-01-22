import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.patch(
    '/update',
    authMiddleware,
    profileController.updateProfile
);

router.post(
    '/update-profile-picture',
    authMiddleware,
    profileController.updateProfilePicture
);

export default router;
