import { Role, SellerStatus, ProductStatus, FulfillmentType, VehicleType } from '../../generated/prisma/client.js';
import prisma from '../utils/prismaUtils.js';
import { sellers, products } from './seedData.js';

async function reseedDummy() {
    console.log('🌱 Starting dummy products and seller update reseed...');
    
    // 1. Identify dummy sellers (from seedData.ts emails)
    const dummyEmails = sellers.map(s => s.email);

    const dummySellers = await prisma.seller.findMany({
        where: { email: { in: dummyEmails } }
    });

    const dummySellerIds = dummySellers.map(s => s.uid);

    console.log(`Found ${dummySellers.length} dummy sellers to update.`);

    if (dummySellerIds.length > 0) {
        // 2. Delete all existing products and variants for dummy sellers ONLY
        console.log('🗑️ Deleting old products for dummy sellers...');
        
        const dummyProducts = await prisma.product.findMany({
            where: { sellerId: { in: dummySellerIds } },
            select: { uid: true }
        });
        const productIds = dummyProducts.map(p => p.uid);

        if (productIds.length > 0) {
            await prisma.cartItem.deleteMany({
                where: { productId: { in: productIds } }
            });
            await prisma.orderItem.deleteMany({
                where: { productId: { in: productIds } }
            });
            await prisma.product.deleteMany({
                where: { uid: { in: productIds } }
            });
        }
        console.log('✅ Old dummy products deleted.');
    }

    // 3. Update ALL sellers with new fields from the seller application
    console.log('📝 Updating all sellers with new application fields...');
    const allSellers = await prisma.seller.findMany();
    for (const seller of allSellers) {
        await prisma.seller.update({
            where: { uid: seller.uid },
            data: {
                businessType: 'Sole Proprietorship',
                legalName: seller.name + ' Trading',
                idType: 'Driver\'s License',
                idNumber: 'DL-' + Math.floor(Math.random() * 10000000),
                businessAddress: seller.location || 'Metro Manila',
                hasPriorExperience: true,
                monthlyOrders: '10-50',
                salesChannels: ['Instagram', 'Facebook', 'Tiktok'],
                sampleItems: ['https://placehold.co/400', 'https://placehold.co/400'],
                vehicleType: Math.random() > 0.5 ? VehicleType.MOTORCYCLE : VehicleType.NONE,
                selfDeliveryEnabled: Math.random() > 0.5,
                freeShippingEnabled: Math.random() > 0.7,
                freeShippingThreshold: 1000,
                meetUpPoint: 'Nearby Mall or Cafe',
                isHandmade: true,
                portfolioLink: 'https://instagram.com/' + seller.slug,
                socialMediaLink: 'https://facebook.com/' + seller.slug,
            }
        });
    }
    console.log('✅ Dummy sellers updated.');

    // 4. Re-create products with new product wizard fields
    console.log(`\n📦 Recreating products with new fields...`);
    let count = 0;

    for (const p of products) {
        const dummySellerDef = sellers[p.si];
        if (!dummySellerDef) continue;
        
        const seller = dummySellers.find(s => s.email === dummySellerDef.email);
        if (!seller) { console.log(`⚠️ No seller found for ${dummySellerDef.email}`); continue; }

        const sku = `${p.cat[0]!.substring(0,3).toUpperCase()}-${p.name.replace(/[^A-Za-z]/g,'').substring(0,4).toUpperCase()}-${Math.floor(Math.random()*90000)+10000}`;

        const isMadeToOrder = Math.random() > 0.6;
        const fulfillmentType = isMadeToOrder ? FulfillmentType.MADE_TO_ORDER : FulfillmentType.READY_TO_SHIP;
        const processingTime = isMadeToOrder ? '3-5 business days' : null;
        
        const isCustomOrderAllowed = isMadeToOrder;
        const customOrderInstructions = isCustomOrderAllowed ? 'Please message me for custom color requests before ordering.' : null;
        
        const isLocalPickupAllowed = seller.selfDeliveryEnabled;
        const localPickupInstructions = isLocalPickupAllowed ? 'Meetup at ' + seller.meetUpPoint : null;

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
                images: p.variants.map((v: any) => v.img),
                sellerId: seller.uid,
                status: ProductStatus.ACTIVE,
                isCodAllowed: p.price >= 200,
                soldCount: Math.floor(Math.random() * 100),
                
                // New Fields
                fulfillmentType,
                processingTime,
                isCustomOrderAllowed,
                customOrderInstructions,
                isLocalPickupAllowed,
                localPickupInstructions,
                careInstructions: 'Hand wash gently. Do not bleach. Air dry only.',
                isBundle: false,
                bundleQuantity: 1,
                videoUrl: Math.random() > 0.8 ? 'https://www.w3schools.com/html/mov_bbb.mp4' : null,
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

    console.log(`\n🎉 Done! Created ${count} updated products across ${dummySellers.length} dummy sellers.`);
    await prisma.$disconnect();
}

reseedDummy().catch(e => { console.error('❌ Reseed failed:', e); prisma.$disconnect(); process.exit(1); });
