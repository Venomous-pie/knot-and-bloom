/*
  Warnings:

  - You are about to drop the column `bio` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `updated` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `uploaded` on the `Seller` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Seller` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Seller` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('INITIATED', 'VALIDATING', 'AWAITING_PAYMENT', 'PROCESSING_PAYMENT', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sellerId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sellerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "discountPercentage" INTEGER,
ADD COLUMN     "discountedPrice" DECIMAL(65,30),
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "bio",
DROP COLUMN "updated",
DROP COLUMN "uploaded",
ADD COLUMN     "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.15,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "uid" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "cartSnapshot" TEXT NOT NULL,
    "lockedPrices" TEXT NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'INITIATED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Payment" (
    "uid" SERIAL NOT NULL,
    "orderId" INTEGER,
    "checkoutSessionId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "uid" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sellerId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "trackingNumber" TEXT,
    "shippingProvider" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_idempotencyKey_key" ON "CheckoutSession"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_email_key" ON "Seller"("email");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
