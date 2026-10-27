
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
// If you get an ESM/CJS error on the line above, use:
//   import pkg from "expo-server-sdk"; const { Expo } = pkg;
import Device from "../models/device.model.js";

// const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN }); 
const expo = new Expo(); // No token needed for simple local testing or when using mock backend

// token optional

interface PendingReceipt { id: string; token: string; at: number }
const pending: PendingReceipt[] = []; // in-memory is fine for one server; use a DB/queue if you scale out

export interface MessagePushParams {
    receiverId: string;
    senderId: string;
    title: string;
    body: string;
    chatId: string;
    phoneNumber: string;
    badge?: number;
}

export async function sendMessagePush(p: MessagePushParams): Promise<void> {
    const devices = await Device.find({ userId: p.receiverId });

    const messages: ExpoPushMessage[] = [];
    const tokens: string[] = [];

    for (const d of devices) {
        if (!Expo.isExpoPushToken(d.pushToken)) {
            await Device.deleteOne({ _id: d._id });
            continue;
        }
        messages.push({
            to: d.pushToken,
            title: p.title,
            body: p.body,
            sound: "default",
            priority: "high",
            channelId: "messages", // must match the channel created in the app
            badge: p.badge,
            data: { chatId: p.chatId, senderId: p.senderId, phoneNumber: p.phoneNumber },
        });
        tokens.push(d.pushToken);
    }
    if (!messages.length) return;

    let offset = 0;
    for (const chunk of expo.chunkPushNotifications(messages)) {
        try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            tickets.forEach((t, i) => {
                const token = tokens[offset + i]!;
                if (t.status === "ok") {
                    pending.push({ id: t.id, token, at: Date.now() });
                } else if (t.details?.error === "DeviceNotRegistered") {
                    Device.deleteOne({ pushToken: token }).catch(console.error);
                } else {
                    console.error("Push ticket error:", t.message, t.details);
                }
            });
        } catch (e) {
            console.error("Push chunk failed:", e);
        }
        offset += chunk.length;
    }
}

/** Receipts reveal delivery problems (bad FCM/APNs credentials, dead tokens). Check ~15 min after sending. */
async function processReceipts() {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const due = pending.filter((r) => r.at <= cutoff);
    if (!due.length) return;
    due.forEach((r) => pending.splice(pending.indexOf(r), 1));

    const tokenById = new Map(due.map((r) => [r.id, r.token]));
    for (const ids of expo.chunkPushNotificationReceiptIds(due.map((r) => r.id))) {
        try {
            const receipts = await expo.getPushNotificationReceiptsAsync(ids);
            for (const [id, r] of Object.entries(receipts)) {
                if (r.status !== "error") continue;
                console.error("Push receipt error:", r.message, r.details);
                if (r.details?.error === "DeviceNotRegistered") {
                    const token = tokenById.get(id);
                    if (token) await Device.deleteOne({ pushToken: token });
                }
            }
        } catch (e) {
            console.error("Receipt check failed:", e);
        }
    }
}

/** Call once at server start */
export function startReceiptJob() {
    setInterval(() => processReceipts().catch(console.error), 5 * 60 * 1000).unref();
}