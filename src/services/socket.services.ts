// src/services/socket.service.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwtService from './jwt.service.js';
import User from '../models/user.model.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

class SocketService {

  private io: Server;

  // Track online users: userId -> Set of socket IDs (multi-device)
  private onlineUsers: Map<string, Set<string>> = new Map();
  
  // Track socket to user mapping
  private socketToUser: Map<string, { userId: string; deviceId: string }> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"]
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Authentication middleware
   */
  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwtService.verifyAccessToken(token);
        
        // Verify user exists
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.deviceId = socket.handshake.auth.deviceId;

        console.log(`✅ Socket authenticated: ${socket.userId} (${socket.deviceId})`);
        
        next();
      } catch (error: any) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      const userId = socket.userId!;
      const deviceId = socket.deviceId!;

      // Add to online users
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(socket.id);
      
      // Track socket to user mapping
      this.socketToUser.set(socket.id, { userId, deviceId });

      // Join user's personal room
      socket.join(`user:${userId}`);
      socket.join(`device:${deviceId}`);

    });
  }


  /**
   * Get Socket.IO instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Get online users count
   */
  getOnlineCount(): number {
    return this.onlineUsers.size;
  }
}

export default SocketService;