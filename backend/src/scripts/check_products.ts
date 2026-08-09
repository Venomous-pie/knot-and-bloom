import dotenv from 'dotenv';
dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient, ProductStatus } from '../../generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // First, show current status counts
    const products = await prisma.product.findMany({
        select: { uid: true, name: true, status: true, uploaded: true, deletedAt: true },
        where: { deletedAt: null },
        orderBy: { uploaded: 'desc' },
        take: 20
    });

    console.log('=== Current Product Statuses ===');
    for (const p of products) {
        console.log(`  [${p.status}] ${p.name} (uid: ${p.uid}) - uploaded: ${p.uploaded.toISOString()}`);
    }

    // Activate all PENDING products
    const result = await prisma.product.updateMany({
        where: {
            status: ProductStatus.PENDING,
            deletedAt: null
        },
        data: {
            status: ProductStatus.ACTIVE
        }
    });

    console.log(`\n=== Activated ${result.count} PENDING products ===`);

    await prisma.$disconnect();
    await pool.end();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
});
