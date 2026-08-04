import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaUtils.js';
import { Role, SellerStatus } from '../../generated/prisma/client.js';
import { ensureAdminSellerProfile } from '../utils/sellerUtils.js';

async function seedAdmin() {
    console.log('🌱 Seeding default Admin account...');
    const email = 'admin@knotandbloom.com';
    const password = await bcrypt.hash('Password123!', 10);

    let admin = await prisma.user.findUnique({ where: { email } });

    if (!admin) {
        admin = await prisma.user.create({
            data: {
                name: 'Knot & Bloom Admin',
                email: email,
                password,
                role: Role.ADMIN,
            }
        });
        console.log(`✅ Created Admin User: ${email}`);
    } else {
        await prisma.user.update({
            where: { uid: admin.uid },
            data: { role: Role.ADMIN }
        });
        console.log(`✅ Updated existing user to Admin: ${email}`);
    }

    // Ensure the official store is created and linked to this admin
    const storeId = await ensureAdminSellerProfile(admin.uid, email);
    
    // Force update the store to ensure it has the latest assets
    await prisma.seller.update({
        where: { uid: storeId },
        data: {
            description: "Knot & Bloom Official Store. Supporting local crafters, hobbyists, and artists by providing a unified platform to showcase their handcrafted goods.",
            logo: "https://ik.imagekit.io/33733vhue6/seed/official_store/logo_uZ1BZjD-d.png",
            banner: "https://ik.imagekit.io/33733vhue6/seed/official_store/banner_7NgEq4iXt.png",
            legalName: "Knot & Bloom Inc.",
            businessType: "CORPORATION",
            businessAddress: "Manila, Philippines",
            hasSeenWelcomeModal: true,
        }
    });

    console.log(`✅ Created/Verified Official Knot & Bloom Store!`);
    console.log(`\n🔑 Login with: ${email} | Password123!`);
}

seedAdmin()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
