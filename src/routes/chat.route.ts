import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import chatController from "../controllers/chat.controller.js";

const router = Router()

router.get("/phone/:phoneNumber", authMiddleware, chatController.getChatByPhone);

export default router;