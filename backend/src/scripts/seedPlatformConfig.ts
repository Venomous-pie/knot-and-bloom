import prisma from '../utils/prismaUtils.js';
import { SHIPPING_DEFAULTS } from '../constant/shippingConfig.js';

async function main() {
    console.log('Seeding PlatformConfig...');

    for (const [key, value] of Object.entries(SHIPPING_DEFAULTS)) {
        await prisma.platformConfig.upsert({
            where: { key },
            update: { value: value.toString() },
            create: {
                key,
                value: value.toString(),
                updatedBy: null,
            },
        });
        console.log(`Upserted ${key} = ${value}`);
    }

    console.log('Done seeding PlatformConfig.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
