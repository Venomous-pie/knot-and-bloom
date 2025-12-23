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
}

export const socketService = SocketService.getInstance();
