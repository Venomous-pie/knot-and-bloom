import { Role, SellerStatus } from '../../generated/prisma/client.js';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaUtils.js';

async function createTestSeller() {
    console.log("🚀 Starting automated test seller creation...");

    try {
        const randomId = Math.floor(Math.random() * 10000);
        const name = `Test Seller ${randomId}`;
        const email = `seller${randomId}@example.com`;
        const rawPassword = 'password123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const shopName = `The Artisan Shop ${randomId}`;
        const slug = `artisan-shop-${randomId}`;

        // Create Customer
        const customer = await prisma.customer.create({
            data: {
                name: name,
                email: email,
                password: hashedPassword,
                role: Role.SELLER // Upgraded to SELLER role automatically for testing
            }
        });

        // Create Seller Profile
        const seller = await prisma.seller.create({
            data: {
                customerId: customer.uid,
                name: shopName,
                slug: slug,
                email: email,
                status: SellerStatus.ACTIVE, // Make them fully active to skip admin approval
                hasSeenWelcomeModal: true,
                termsAccepted: true,
                termsAcceptedAt: new Date()
            }
        });

        console.log("✅ Success! Test Seller Created.");
        console.log("==========================================");
        console.log(`👤 Customer Name: ${customer.name}`);
        console.log(`🏪 Shop Name:     ${seller.name}`);
        console.log(`📧 Email:         ${email}`);
        console.log(`🔑 Password:      ${rawPassword}`);
        console.log(`🌐 Role:          ${customer.role}`);
        console.log(`🚥 Seller Status: ${seller.status}`);
        console.log("==========================================");
        console.log("You can now log in using these credentials.");

    } catch (error) {
        console.error("❌ Failed to create test seller:", error);
    } finally {
        await prisma.$disconnect();
    }
}

createTestSeller();
