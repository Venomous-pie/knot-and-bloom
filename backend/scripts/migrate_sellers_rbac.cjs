const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');

dotenv.config();

// Initialize with adapter to match application setup
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateSellers() {
    console.log("Starting RBAC Migration for Sellers...");

    // Check connection
    try {
        await prisma.$connect();
        console.log("Connected to database.");
    } catch (e) {
        console.error("Database connection failed:", e);
        return;
    }

    // Find sellers
    const sellers = await prisma.seller.findMany({
        include: { customer: true }
    });

    console.log(`Found ${sellers.length} sellers.`);

    const credentials = [];

    for (const seller of sellers) {
        if (seller.customer) {
            console.log(`Seller ${seller.name} already linked to customer.`);
            continue;
        }

        console.log(`Processing orphan seller: ${seller.name} (${seller.email})`);

        // Check if customer with email exists
        let customer = await prisma.customer.findUnique({ where: { email: seller.email } });

        if (customer) {
            console.log(`  Found existing customer ${customer.uid}. Upgrading to SELLER.`);

            await prisma.customer.update({
                where: { uid: customer.uid },
                data: { role: 'SELLER' }
            });
        } else {
            console.log(`  Creating new customer account.`);
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            customer = await prisma.customer.create({
                data: {
                    name: seller.name,
                    email: seller.email,
                    password: hashedPassword,
                    role: 'SELLER',
                    passwordResetRequired: true
                }
            });

            credentials.push({ email: seller.email, tempPassword });
        }

        // Connect
        await prisma.seller.update({
            where: { uid: seller.uid },
            data: { customerId: customer.uid }
        });
        console.log(`  Linked!`);
    }

    if (credentials.length > 0) {
        fs.writeFileSync('migration_credentials.txt', JSON.stringify(credentials, null, 2));
        console.log(`Saved ${credentials.length} temp credentials to migration_credentials.txt`);
    }

    console.log("Migration Complete.");
}

migrateSellers()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
