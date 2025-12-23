-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "sellerId" INTEGER,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
