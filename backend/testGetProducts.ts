import { getProducts } from './src/controllers/ProductController.js';
import prisma from './src/utils/prismaUtils.js';

async function test() {
    try {
        console.log("Testing getProducts...");
        const result = await getProducts({ limit: '3', offset: '0' });
        console.log("Success! Products count:", result.products.length);
        
        console.log("Testing getProducts with newArrival...");
        const result2 = await getProducts({ limit: '3', offset: '0', newArrival: 'true' });
        console.log("Success! Products count:", result2.products.length);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
