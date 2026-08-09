import prisma from './src/utils/prismaUtils.js';

async function main() {
  console.time('query');
  const products = await prisma.product.findMany({
    take: 30
  });
  console.timeEnd('query');
  console.log('Got', products.length, 'products');
  
  // Let's check size of payload
  const size = Buffer.byteLength(JSON.stringify(products), 'utf8');
  console.log('Payload size:', (size / 1024).toFixed(2), 'KB');
}

main().catch(console.error).finally(() => process.exit(0));
