import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import MessageController from "../controllers/message.controller.js";

const router = Router();

// Get messages for a chat (with pagination)
router.get("/:chatId", authMiddleware, MessageController.getMessages);

// Get starred messages
router.get("/:chatId/starred", authMiddleware, MessageController.getStarredMessages);

// Mark single message as read
router.patch("/:messageId/read", authMiddleware, MessageController.markAsRead);

// Mark all messages in chat as read
router.patch("/:chatId/read-all", authMiddleware, MessageController.markAllAsRead);

// Delete message
router.delete("/:messageId", authMiddleware, MessageController.deleteMessage);

// Star/unstar message
router.patch("/:messageId/star", authMiddleware, MessageController.starMessage);

export default router;