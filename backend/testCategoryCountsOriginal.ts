import prisma from './src/utils/prismaUtils.js';
import { ProductStatus, SellerStatus } from './generated/prisma/client.js';

async function test() {
    try {
        const baseFilter: any = {
            deletedAt: null,
            status: ProductStatus.ACTIVE,
            AND: [
                {
                    OR: [
                        { sellerId: null },
                        {
                            seller: {
                                status: SellerStatus.ACTIVE,
                                deletedAt: null
                            }
                        }
                    ]
                }
            ]
        };

        const products = await prisma.product.findMany({
            where: baseFilter,
            select: { categories: true }
        });
        console.log("Success:", products.length);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
