import { Server as HTTPServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import { SOCKET_EVENTS } from "./socket.events.js";

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
                origin: "*",
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

                if (!token) {
                    return next(new Error("Authentication token required"))
                };

                const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;

                if (payload.type !== "access") {
                    return next(new Error("Invalid token type"));
                };


                socket.userId = payload.userId;
                socket.deviceId = payload.deviceId;

                next();
            } catch (err) {

            }
        })
    };

    private setupConnections() {
        this.io.on("connection", (socket: any) => {

            const { userId, deviceId } = socket as AuthenticationSocket;

            console.log(`✅ Connected: userId=${userId} socketId=${socket.id}`);

            this.addUser(userId, socket.id);

            // Join personal room — used to send events to a specific user
            socket.join(`user:${userId}`);
            // Emit online status to contacts
            this.emitOnlineStatus(userId, true);

            // ── Event listeners ──────────────────────

            socket.on(SOCKET_EVENTS.JOIN_CHAT, (chatId: string) => {
                socket.join(`chat:${chatId}`)
            });


            socket.on(SOCKET_EVENTS.LEAVE_CHAT, (chatId: string) => {
                socket.leave(`chat:${chatId}`);
            });

            socket.on(SOCKET_EVENTS.TYPING_START, ({ chatId }: { chatId: string }) => {
                socket.to(chatId).emit(SOCKET_EVENTS.TYPING_START, {
                    chatId,
                    userId
                })
            });
            socket.on(SOCKET_EVENTS.TYPING_STOP, ({ chatId }: { chatId: string }) => {
                socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING_STOP, {
                    chatId,
                    userId,
                });
            });

            // ── Disconnect ───────────────────────────

            socket.on("disconnect", (reason: string) => {
                console.log(`❌ Disconnected: userId=${userId} reason=${reason}`);

                this.removeUser(userId, socket.id);

                // Only emit offline if user has no more active sockets

                if (!this.isUserOnline(userId)) {
                    this.emitOnlineStatus(userId, false)
                }
            })

        })
    };

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

    private isUserOnline(userId: string): boolean {
        return (this.userSockets.get(userId)?.size ?? 0) > 0
    };

    // ── Emit helpers ─────────────────────────────────

    // Send to a specific user (all their devices)
    private emitToUser(userId: string, event: string, data: any) {
        this.io.to(`user:${userId}`).emit(event, data)
    };

    // Send to all users in a chat room

    private emitToChat(chatId: string, event: string, data: any) {
        this.io.to(`chat:${chatId}`).emit(event, data)
    };
    // Send to everyone in chat EXCEPT the sender
    private emitToChatExcept(chatId: string, senderId: string, event: string, data: any) {
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
    }


    private getIO(): SocketServer {
        return this.io
    }

};

export default SocketService