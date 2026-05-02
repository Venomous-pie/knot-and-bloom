import { socketService } from './src/services/SocketService.js';
import { createServer } from 'http';

const httpServer = createServer();
socketService.init(httpServer);

setTimeout(() => {
    console.log("Emitting to user_1");
    socketService.emitToRoom('user_1', 'notification:new', { test: true });
    setTimeout(() => process.exit(0), 1000);
}, 1000);
