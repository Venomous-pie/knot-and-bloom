import { Role, SellerStatus, ProductStatus } from '../../generated/prisma/client.js';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaUtils.js';
import { sellers, products } from './seedData.js';

async function seed() {
    console.log('🌱 Starting seed...');
    const password = await bcrypt.hash('password123', 10);
    const createdSellers: any[] = [];

    for (let i = 0; i < sellers.length; i++) {
        const s = sellers[i]!;
        const existing = await prisma.user.findUnique({ where: { email: s.email } });
        if (existing) {
            console.log(`⏭️  Skipping ${s.name} (email exists)`);
            const seller = await prisma.seller.findFirst({ where: { userId: existing.uid } });
            createdSellers.push(seller);
            continue;
        }

        const user = await prisma.user.create({
            data: { name: s.name, email: s.email, password, role: Role.SELLER }
        });

        const seller = await prisma.seller.create({
            data: {
                userId: user.uid,
                name: s.name,
                slug: s.slug,
                email: s.email,
                logo: s.logo,
                banner: s.banner,
                status: SellerStatus.ACTIVE,
                hasSeenWelcomeModal: true,
            }
        });
        createdSellers.push(seller);
        console.log(`✅ Created seller: ${s.name}`);
    }

    console.log(`\n📦 Creating products...`);
    let count = 0;

    for (const p of products) {
        const seller = createdSellers[p.si];
        if (!seller) { console.log(`⚠️ No seller at index ${p.si}`); continue; }

        const existing = await prisma.product.findFirst({ where: { name: p.name, sellerId: seller.uid } });
        if (existing) { console.log(`⏭️  Skipping product: ${p.name}`); continue; }

        const sku = `${p.cat[0]!.substring(0,3).toUpperCase()}-${p.name.replace(/[^A-Za-z]/g,'').substring(0,4).toUpperCase()}-${Math.floor(Math.random()*90000)+10000}`;

        const product = await prisma.product.create({
            data: {
                name: p.name,
                sku,
                categories: p.cat,
                basePrice: p.price,
                description: p.desc,
                materials: p.materials,
                tags: p.tags,
                image: p.img,
                images: p.variants.map(v => v.img),
                sellerId: seller.uid,
                status: ProductStatus.ACTIVE,
                isCodAllowed: p.price >= 200,
                soldCount: Math.floor(Math.random() * 100),
            }
        });

        for (let vi = 0; vi < p.variants.length; vi++) {
            const v = p.variants[vi]!;
            const rand = Math.floor(Math.random() * 90000) + 10000;
            const vSku = `${sku}-${v.name.replace(/[^A-Za-z0-9]/g,'').substring(0,3).toUpperCase()}-${rand}`;
            await prisma.productVariant.create({
                data: {
                    productId: product.uid,
                    name: v.name,
                    sku: vSku,
                    stock: v.stock,
                    images: [v.img],
                }
            });
        }
        count++;
    }

    console.log(`\n🎉 Done! Created ${count} products across ${sellers.length} sellers.`);
    console.log(`\n📧 All seller accounts use password: password123`);
    await prisma.$disconnect();
}

seed().catch(e => { console.error('❌ Seed failed:', e); prisma.$disconnect(); process.exit(1); });
