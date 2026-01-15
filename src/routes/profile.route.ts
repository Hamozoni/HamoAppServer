import { Router } from "express";
import profileController from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.patch(
    '/update_profile',
    authMiddleware,
    profileController.updateProfile
);

export default router;
