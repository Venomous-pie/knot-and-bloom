import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Knot & Bloom E-commerce API',
            version: '1.0.0',
            description: 'Multi-vendor e-commerce platform API with Prisma ORM',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:3030',
                description: 'Development server',
            },
            // Add production URL here when deployed
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token (from /api/customers/login)',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                        message: {
                            type: 'string',
                            description: 'Detailed error description',
                        },
                    },
                },
                Product: {
                    type: 'object',
                    properties: {
                        uid: { type: 'integer' },
                        name: { type: 'string' },
                        sku: { type: 'string' },
                        categories: { type: 'array', items: { type: 'string' } },
                        basePrice: { type: 'number', format: 'decimal' },
                        discountedPrice: { type: 'number', format: 'decimal', nullable: true },
                        image: { type: 'string', nullable: true },
                        description: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED'] },
                        sellerId: { type: 'integer', nullable: true },
                        variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
                    },
                },
                ProductVariant: {
                    type: 'object',
                    properties: {
                        uid: { type: 'integer' },
                        name: { type: 'string' },
                        sku: { type: 'string' },
                        stock: { type: 'integer' },
                        price: { type: 'number', format: 'decimal', nullable: true },
                        image: { type: 'string', nullable: true },
                    },
                },
                Customer: {
                    type: 'object',
                    properties: {
                        uid: { type: 'integer' },
                        name: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['USER', 'SELLER', 'ADMIN'] },
                        phone: { type: 'string', nullable: true },
                        address: { type: 'string', nullable: true },
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        uid: { type: 'integer' },
                        customerId: { type: 'integer' },
                        total: { type: 'number', format: 'decimal' },
                        status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
                        trackingNumber: { type: 'string', nullable: true },
                        sellerId: { type: 'integer', nullable: true },
                        items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
                    },
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        uid: { type: 'integer' },
                        productId: { type: 'integer' },
                        quantity: { type: 'integer' },
                        price: { type: 'number', format: 'decimal' },
                    },
                },
            },
        },
        tags: [
            { name: 'Products', description: 'Product management endpoints' },
            { name: 'Customers', description: 'Customer authentication and profile' },
            { name: 'Cart', description: 'Shopping cart operations' },
            { name: 'Orders', description: 'Order management' },
            { name: 'Checkout', description: 'Checkout and payment flow' },
            { name: 'Sellers', description: 'Seller registration and management' },
            { name: 'Addresses', description: 'Shipping address management' },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to route files
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };

