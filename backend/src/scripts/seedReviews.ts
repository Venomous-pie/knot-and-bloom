import { loadEnv } from '../config/env.js';
loadEnv();
import prisma from '../utils/prismaUtils.js';

async function seedReviews() {
    console.log('👤 Creating dummy buyers...');
    const buyerNames = ['Juan Dela Cruz', 'Maria Clara', 'Andres Bonifacio', 'Jose Rizal'];
    const dummyBuyers = [];
    for (let i = 0; i < buyerNames.length; i++) {
        let buyer = await prisma.user.findUnique({ where: { email: `buyer${i}@knotbloom-seed.com` } });
        if (!buyer) {
            buyer = await prisma.user.create({
                data: {
                    name: buyerNames[i]!,
                    email: `buyer${i}@knotbloom-seed.com`,
                    password: 'Password123!',
                    role: 'USER',
                }
            });
        }
        dummyBuyers.push(buyer);
    }

    const products = await prisma.product.findMany({
        where: { soldCount: { gt: 0 } }
    });
    
    console.log(`Found ${products.length} products with sales. Seeding reviews...`);

    let reviewCount = 0;
    for (const product of products) {
        if (!product.sellerId) continue;

        const numReviews = Math.min(product.soldCount, dummyBuyers.length);
        for (let i = 0; i < numReviews; i++) {
            const buyer = dummyBuyers[i]!;
            const existingReview = await prisma.review.findFirst({
                where: { productId: product.uid, userId: buyer.uid }
            });
            
            if (!existingReview) {
                const reviewTexts = [
                    "Ganda ng quality! Super worth it for the price. Will order again soon.",
                    "Seller was very responsive. The item arrived securely packed and in perfect condition.",
                    "Ang cute! Exact to the description and photos. My daughter loved it.",
                    "Highly recommended. Handcrafted with care and attention to detail."
                ];
                
                await prisma.review.create({
                    data: {
                        rating: 5,
                        content: reviewTexts[i % reviewTexts.length] || "",
                        userId: buyer.uid,
                        productId: product.uid,
                        sellerId: product.sellerId,
                    }
                });
                reviewCount++;
            }
        }
    }
    
    console.log(`✅ Seeded ${reviewCount} reviews!`);
}

seedReviews().catch(console.error).finally(() => prisma.$disconnect());
