import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
declare class SocketService {
    private static instance;
    private io;
    private constructor();
    static getInstance(): SocketService;
    init(httpServer: HttpServer): void;
    getIO(): Server;
    emit(event: string, data: any): void;
    emitToRoom(room: string, event: string, data: any): void;
}
export declare const socketService: SocketService;
export {};
//# sourceMappingURL=SocketService.d.ts.map