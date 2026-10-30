import { Server as HTTPServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";

import { SOCKET_EVENTS } from "./socket.events.js";
import { deliverPendingMessages } from "./handlers/delivery.handler.js";
import { handleSendMessage } from "./handlers/message.handler.js";
import jwtService from "../services/jwt.service.js";

interface AuthPayload {
    userId: string;
    deviceId: string;
    type: string
};


interface AuthenticationSocket extends Socket {
    userId: string;
    deviceId: string;
};

class SocketService {


    private io!: SocketServer;
    // Map userId → Set of socketIds (user can have multiple connections)
    private userSockets: Map<string, Set<string>> = new Map();

    constructor(server: HTTPServer) {

        this.io = new SocketServer(server, {
            cors: {
                methods: ["GET", "POST"],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.setupMiddleware();
        this.setupConnections();
        console.log("🔌 Socket.IO initialized");
    };

    private setupMiddleware() {
        this.io.use((socket: any, next) => {
            try {
                const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.split(" ")[1];

                console.log("🔍 Server received token:", token); // 👈 Add this

                if (!token) {
                    console.log("❌ Token is missing");
                    return next(new Error("Authentication token required"));
                };

                const payload = jwtService.verifyAccessToken(token) as AuthPayload;
                console.log("✅ Token verified for userId:", payload.userId);

                if (payload.type !== "access") {
                    console.log("❌ Invalid token type:", payload.type);
                    return next(new Error("Invalid token type"));
                };

                socket.userId = payload.userId;
                socket.deviceId = payload.deviceId;

                next();
            } catch (err: any) {
                console.log("❌ JWT Verification Error:", err.message); // 👈 See exact error (e.g., token expired, invalid signature)
                return next(new Error("Authentication failed"));
            }
        })
    };

    private setupConnections() {
        this.io.on("connection", async (socket: any) => {
            const { userId } = socket;

            console.log(`✅ Connected: userId=${userId} socketId=${socket.id}`);

            this.addUser(userId, socket.id);
            socket.join(`user:${userId}`);
            this.emitOnlineStatus(userId, true);

            // ✅ Deliver pending messages on connect
            // await deliverPendingMessages(userId);

            // ✅ Register message handler
            socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (payload: any) => {
                handleSendMessage(this.io, payload);
                console.log("📨 message:send received:", payload);
            });

            socket.on(SOCKET_EVENTS.JOIN_CHAT, (chatId: string) => {
                console.log({ JOIN_CHAT: chatId })
                socket.join(`chat:${chatId}`);
            });

            socket.on(SOCKET_EVENTS.MESSAGE_READ, ({ chatId, messageId }: { chatId: string, messageId: string }) => {
                console.log({ MESSAGE_READ: chatId, messageId });

                this.emitToChatExcept(chatId, userId, SOCKET_EVENTS.MESSAGE_READ, { chatId, messageId })

            });

            socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, ({ chatId, messageId }: { chatId: string, messageId: string }) => {
                console.log({ MESSAGE_DELIVERED: chatId, messageId });

                this.emitToChatExcept(chatId, userId, SOCKET_EVENTS.MESSAGE_DELIVERED, { chatId, messageId })

            });

            socket.on(SOCKET_EVENTS.LEAVE_CHAT, (chatId: string) => {
                socket.leave(`chat:${chatId}`);
            });

            socket.on(SOCKET_EVENTS.TYPING_START, ({ chatId }: { chatId: string }) => {
                socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING_START, { chatId, userId });
            });

            socket.on(SOCKET_EVENTS.TYPING_STOP, ({ chatId }: { chatId: string }) => {
                socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING_STOP, { chatId, userId });
            });

            socket.on("disconnect", (reason: string) => {
                console.log(`❌ Disconnected: userId=${userId} reason=${reason}`);
                this.removeUser(userId, socket.id);
                if (!this.isUserOnline(userId)) {
                    this.emitOnlineStatus(userId, false);
                }
            });
        });
    }

    // ── User socket tracking ─────────────────────────


    private addUser(userId: string, socketId: string) {

        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set())
        };

        this.userSockets.get(userId)!.add(socketId)
    };

    private removeUser(userId: string, socketId: string) {

        this.userSockets.get(userId)?.delete(socketId);

        if (this.userSockets.get(userId)?.size === 0) {
            this.userSockets.delete(userId)
        }
    };

    public isUserOnline(userId: string): boolean {
        return (this.userSockets.get(userId)?.size ?? 0) > 0
    };

    // ── Emit helpers ─────────────────────────────────

    // Send to a specific user (all their devices)
    public emitToUser(userId: string, event: string, data: any) {
        this.io.to(`user:${userId}`).emit(event, data)
    };

    // Send to all users in a chat room

    public emitToChat(chatId: string, event: string, data: any) {
        console.log({ EMIT: `chat:${chatId}` })
        this.io.to(`chat:${chatId}`).emit(event, data)
    };
    // Send to everyone in chat EXCEPT the sender
    public emitToChatExcept(chatId: string, senderId: string, event: string, data: any) {
        this.io.to(`user:${senderId}`)
            .except(`chat:${chatId}`)
            .emit(event, data);

        this.io.to(`chat:${chatId}`)
            .except(senderId)
            .emit(event, data)
    };

    private emitOnlineStatus(userId: string, isOnline: boolean) {
        // Broadcast to everyone — contacts will filter on client side
        this.io.emit(SOCKET_EVENTS.USER_ONLINE_STATUS, {
            userId,
            isOnline,
            lasSeen: isOnline ? null : new Date()

        });
    };

    private getUserSocketIds(userId: string) {

        console.log(this.userSockets.get(userId))
        return this.userSockets.get(userId) || new Set();
    };

    // Inside your SocketService class (Server-side)

    public isUserInChatRoom(userId: string, chatId: string): boolean {
        const roomName = `chat:${chatId}`;

        // 1. Get all socket IDs currently inside this chat room
        const roomSockets = this.io.sockets.adapter.rooms.get(roomName);
        if (!roomSockets) {
            return false; // Room doesn't exist or is empty
        }

        // 2. Get all active socket IDs belonging to this user (supports multi-device)
        const userSocketIds = this.userSockets.get(userId);
        if (!userSocketIds || userSocketIds.size === 0) {
            return false; // User is completely offline
        }

        // 3. Check if any of the user's active sockets are present in the room
        for (const socketId of userSocketIds) {
            if (roomSockets.has(socketId)) {
                return true; // Found! The user is inside this chat room.
            }
        }

        return false; // User is online, but currently looking at a different screen or chat
    }


    public getIO(): SocketServer {
        return this.io
    }

};

export default SocketService