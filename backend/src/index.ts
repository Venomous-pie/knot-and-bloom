import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import addressRoutes from './routes/addressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import prisma from './utils/prismaUtils.js';

import { createServer } from 'http';
import { socketService } from './services/SocketService.js';
import { errorHandlingMiddleware } from './middleware/errorHandlingMiddleware.js';

const app = express();
// Enable trust proxy to correctly identify client IPs behind a proxy (e.g., Nginx, Heroku, AWS ELB)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3030;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/', (req, res) => {
    res.json({
        name: "Knot and Bloom",
        status: "Running",
        timestamp: new Date().toISOString()
    });
});

// Api Routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/chat', chatRoutes);

// Error handling middleware
app.use(errorHandlingMiddleware);

// Shutdown service
const shutdown = async () => {
    console.log("Shutting down...")
    await prisma.$disconnect()
    process.exit(0)
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const httpServer = createServer(app);
socketService.init(httpServer);

httpServer.listen(PORT, () => {
    console.log(`Currently running on port ${PORT}.`);
});

export default app