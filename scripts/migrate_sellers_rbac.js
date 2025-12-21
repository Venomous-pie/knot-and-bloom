"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
// Initialize standalone client to avoid import issues
const prisma = new client_1.PrismaClient();
async function migrateSellers() {
    console.log("Starting RBAC Migration for Sellers...");
    // Check connection
    try {
        await prisma.$connect();
        console.log("Connected to database.");
    }
    catch (e) {
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
            // Fix: Cast 'SELLER' to any if Enum type is not perfectly resolved in script
            await prisma.customer.update({
                where: { uid: customer.uid },
                data: { role: 'SELLER' }
            });
        }
        else {
            console.log(`  Creating new customer account.`);
            const tempPassword = crypto_1.default.randomBytes(8).toString('hex');
            const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 10);
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
        fs_1.default.writeFileSync('migration_credentials.txt', JSON.stringify(credentials, null, 2));
        console.log(`Saved ${credentials.length} temp credentials to migration_credentials.txt`);
    }
    console.log("Migration Complete.");
}
migrateSellers()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
