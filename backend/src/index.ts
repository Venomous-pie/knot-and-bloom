import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import addressRoutes from './routes/addressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import prisma from './utils/prisma.js';

const app = express();
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

// Swagger API Documentation
import { swaggerSpec, swaggerUi } from './config/swagger.js';
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Knot & Bloom API Docs',
}));

// Api Routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/addresses', addressRoutes);


// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Error:", err.stack);
    res.status(500).json({
        error: "Something went wrong!",
        message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});


// Shutdown service
const shutdown = async () => {
    console.log("Shutting down...")
    await prisma.$disconnect()
    process.exit(0)
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen(PORT, () => {
    console.log(`Currently running on port ${PORT}.`);
});

export default app