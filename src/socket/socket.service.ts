import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";

import { SOCKET_EVENTS } from "./socket.events.js";
import { error } from "console";

interface AuthPayload {
    userId: string;
    deviceId: string;
    type: string
};


interface AuthenticationSocket {
    userId: string;
    deviceId: string;
};

class SocketService {


    private io: SocketServer
    // Map userId → Set of socketIds (user can have multiple connections)

    private userSockets: Map<string, Set<string>> = new Map();

    consturctor(server: HttpServer) {

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
            this.emitOnlineStatus(userId, true)
        })
    };

    private addUser(userId: string, socketId: string) {

        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set())
        };

        this.userSockets.get(userId)!.add(socketId)
    };

    private removeUser() {

    };

    private isUserOnline() {

    };

    private emitToUser() {

    };

    private emitToChat() {

    };

    private emitToChatExcept() {

    };

    private emitOnlineStatus(userId: string, isOnline: boolean) {
        // Broadcast to everyone — contacts will filter on client side

        this.io.emit(SOCKET_EVENTS.USER_ONLINE_STATUS, {
            userId,
            isOnline,
            lasSeen: isOnline ? null : new Date()

        })
    }


    private getIO(): SocketServer {
        return this.io
    }

}