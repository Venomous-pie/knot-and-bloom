import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function migrateProductVariants() {
    console.log('🔄 Starting product variant migration...');

    try {
        // Get all existing products
        const products = await prisma.product.findMany();

        console.log(`Found ${products.length} products to migrate`);

        for (const product of products) {
            console.log(`\n📦 Processing product: ${product.name} (ID: ${product.uid})`);

            // @ts-ignore - old schema had these fields
            const variantsString = product.variants as string | null;
            // @ts-ignore
            const productStock = product.stock as number;

            let variantNames: string[] = [];

            if (variantsString && variantsString.trim().length > 0) {
                // Parse comma-separated variants
                variantNames = variantsString
                    .split(',')
                    .map(v => v.trim())
                    .filter(v => v.length > 0);
                console.log(`  Found ${variantNames.length} variants: ${variantNames.join(', ')}`);
            } else {
                // No variants, create single "Default" variant
                variantNames = ['Default'];
                console.log('  No variants found, creating Default variant');
            }

            // Calculate stock per variant (distribute equally)
            const stockPerVariant = Math.floor(productStock / variantNames.length);
            const remainderStock = productStock % variantNames.length;

            // Create ProductVariant records
            for (let i = 0; i < variantNames.length; i++) {
                const variantName = variantNames[i];
                const stock = stockPerVariant + (i === 0 ? remainderStock : 0); // Give remainder to first variant

                const variantSku = `${product.sku}-${variantName.toUpperCase().replace(/\s+/g, '-')}`;

                try {
                    const variant = await prisma.productVariant.create({
                        data: {
                            productId: product.uid,
                            name: variantName,
                            sku: variantSku,
                            stock: stock,
                            price: null, // Use product's base price
                        }
                    });

                    console.log(`  ✅ Created variant "${variantName}" (SKU: ${variantSku}, Stock: ${stock})`);
                } catch (error: any) {
                    if (error.code === 'P2002') {
                        console.log(`  ⚠️  Variant "${variantName}" already exists, skipping`);
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateProductVariants()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
