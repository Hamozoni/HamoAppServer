import { Router } from "express";
import cloudinaryController from "../controllers/cloudinary.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
    "/signature",
    authMiddleware,
    cloudinaryController.getUploadSignature
);

export default router;
