import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/index.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateOrdersToOrderItems() {
    console.log('🔄 Starting order migration...');

    // Find orders that don't have OrderItems yet
    const orders = await prisma.order.findMany({
        where: {
            items: { none: {} }
        }
    });

    console.log(`Found ${orders.length} orders to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
        if (!order.products) {
            console.log(`⚠️ Order ${order.uid} has no products field, skipping`);
            continue;
        }

        let productData;
        try {
            // Handle potential double serialization or different formats
            productData = typeof order.products === 'string'
                ? JSON.parse(order.products)
                : order.products;

            if (!Array.isArray(productData)) {
                console.warn(`⚠️ Order ${order.uid} products data is not an array, skipping`);
                continue;
            }
        } catch (err) {
            console.error(`❌ Failed to parse products for order ${order.uid}:`, err);
            errorCount++;
            continue;
        }

        // Process each product in the old JSON array
        for (const item of productData) {
            try {
                // Find product to get sellerId (if any)
                const product = await prisma.product.findUnique({
                    where: { uid: item.productId || item.id }, // Handle different potential structures
                    select: { sellerId: true, basePrice: true }
                });

                await prisma.orderItem.create({
                    data: {
                        orderId: order.uid,
                        productId: item.productId || item.id,
                        sellerId: product?.sellerId ?? null,
                        quantity: item.quantity || 1,
                        price: item.price || product?.basePrice || 0,
                        status: 'delivered', // Assume old orders are delivered
                        deliveredAt: order.updated,
                        createdAt: order.uploaded
                    }
                });
            } catch (innerErr) {
                console.error(`❌ Failed to migrate item for order ${order.uid}:`, innerErr);
                errorCount++;
            }
        }
        migratedCount++;
        if (migratedCount % 10 === 0) console.log(`Processed ${migratedCount} orders...`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`Processed: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
}

migrateOrdersToOrderItems()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
