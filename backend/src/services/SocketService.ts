import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public init(httpServer: HttpServer): void {
        if (this.io) {
            console.warn('SocketService already initialized');
            return;
        }

        this.io = new Server(httpServer, {
            cors: {
                origin: '*', // Configure this appropriately for production
                methods: ['GET', 'POST'],
            },
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on('join', (room: string) => {
                socket.join(room);
                console.log(`Socket ${socket.id} joined room ${room}`);
            });

            socket.on('leave', (room: string) => {
                socket.leave(room);
                console.log(`Socket ${socket.id} left room ${room}`);
            });

            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error('SocketService not initialized. Call init() first.');
        }
        return this.io;
    }

    public emit(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
        } else {
            console.warn('SocketService not initialized, cannot emit event:', event);
        }
    }

    public emitToRoom(room: string, event: string, data: any): void {
        if (this.io) {
            this.io.to(room).emit(event, data);
        } else {
            console.warn('SocketService not initialized, cannot emit to room:', room);
        }
    }
}

export const socketService = SocketService.getInstance();
