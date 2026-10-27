import { Router } from "express";
import { Expo } from "expo-server-sdk";
import Device from "../models/device.model.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { sendMessagePush } from "../services/notifications.service.js";

const router = Router();

// Register / refresh this device's push token
router.post("/push-token", authMiddleware, async (req, res) => {
    const userId = (req as any).userId;
    const { token, deviceId, platform } = req.body ?? {};

    if (!deviceId || !Expo.isExpoPushToken(token)) {
        return res.status(400).json({ error: "Invalid push token or deviceId" });
    }

    // a token belongs to one account at a time (handles logout/login on the same phone)
    await Device.deleteMany({ pushToken: token, userId: { $ne: userId } });

    await Device.findOneAndUpdate(
        { userId, deviceId },
        { pushToken: token, platform, updatedAt: new Date() },
        { upsert: true, new: true }
    );
    res.json({ ok: true });
});

// Call on logout (before clearing auth tokens)
router.delete("/push-token", authMiddleware, async (req, res) => {
    await Device.deleteOne({ userId: (req as any).userId, deviceId: req.body?.deviceId });
    res.json({ ok: true });
});

// Dev helper: sends a test push to the logged-in user's devices
router.post("/test", authMiddleware, async (req, res) => {
    const userId = String((req as any).userId);
    await sendMessagePush({
        receiverId: userId,
        senderId: userId,
        title: "Test notification",
        body: "It works!",
        chatId: "test",
        phoneNumber: "",
    });
    res.json({ sent: true });
});

export default router;