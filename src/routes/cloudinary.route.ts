import { Router } from "express";
import cloudinaryController from "../controllers/cloudinary.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
    "/signature",
    authMiddleware,
    cloudinaryController.getUploadSignature
);

router.post(
    "/profile_picture_signature",
    authMiddleware,
    cloudinaryController.getProfileUploadSignature
);

export default router;
