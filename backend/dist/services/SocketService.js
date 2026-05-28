import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
class SocketService {
    static instance;
    io = null;
    constructor() { }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    init(httpServer) {
        if (this.io) {
            console.warn('SocketService already initialized');
            return;
        }
        const defaultOrigins = [
            'http://localhost:8081',
            'http://localhost:19000',
            'http://localhost:3000',
        ];
        const allowedOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : defaultOrigins;
        this.io = new Server(httpServer, {
            cors: {
                origin: allowedOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        // Authentication Middleware
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                // Attach user data to socket
                socket.user = decoded;
                next();
            }
            catch (err) {
                return next(new Error('Authentication error: Invalid or expired token'));
            }
        });
        this.io.on('connection', (socket) => {
            const user = socket.user;
            socket.on('join', (room) => {
                // Security: Restrict room joining to prevent unauthorized eavesdropping
                if (room.startsWith('user_') && room !== `user_${user.id}`) {
                    console.warn(`User ${user.id} attempted to join unauthorized room: ${room}`);
                    return;
                }
                if (room.startsWith('seller_') && room !== `seller_${user.sellerId}`) {
                    console.warn(`User ${user.id} attempted to join unauthorized seller room: ${room}`);
                    return;
                }
                if (room === 'admin_dashboard' && user.role !== 'ADMIN') {
                    console.warn(`User ${user.id} attempted to join admin_dashboard without ADMIN role`);
                    return;
                }
                socket.join(room);
            });
            socket.on('leave', (room) => {
                socket.leave(room);
            });
            socket.on('disconnect', () => {
            });
        });
    }
    getIO() {
        if (!this.io) {
            throw new Error('SocketService not initialized. Call init() first.');
        }
        return this.io;
    }
    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
        else {
            console.warn('SocketService not initialized, cannot emit event:', event);
        }
    }
    emitToRoom(room, event, data) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
        else {
            console.warn('SocketService not initialized, cannot emit to room:', room);
        }
    }
}
export const socketService = SocketService.getInstance();
//# sourceMappingURL=SocketService.js.map