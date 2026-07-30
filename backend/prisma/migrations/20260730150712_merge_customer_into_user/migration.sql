/*
  Warnings:

  - You are about to drop the column `customerId` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `CheckoutSession` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `NotificationSettings` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `PaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `materials` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `availableBalance` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `businessAddress` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `businessType` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `commissionRate` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `hasPriorExperience` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `idNumber` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `idType` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `isHandmade` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `legalName` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `pendingBalance` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `pinnedProductIds` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioLink` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `productCategories` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `socialMediaLink` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `termsAccepted` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `termsAcceptedAt` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `totalOrders` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `totalSales` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `totalWithdrawn` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Seller` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Wishlist` table. All the data in the column will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `NotificationSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Seller` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Wishlist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Cart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `CheckoutSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `NotificationSettings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Seller` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Wishlist` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('READY_TO_SHIP', 'MADE_TO_ORDER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MOTORCYCLE', 'TRICYCLE', 'MULTICAB', 'NONE');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('PICKUP', 'SELF_DELIVERY', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELAYED_WEATHER', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CheckoutSession" DROP CONSTRAINT "CheckoutSession_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_customerId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationSettings" DROP CONSTRAINT "NotificationSettings_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentMethod" DROP CONSTRAINT "PaymentMethod_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Seller" DROP CONSTRAINT "Seller_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_customerId_fkey";

-- DropIndex
DROP INDEX "Address_customerId_idx";

-- DropIndex
DROP INDEX "Address_customerId_isDefault_idx";

-- DropIndex
DROP INDEX "Cart_customerId_key";

-- DropIndex
DROP INDEX "Notification_customerId_idx";

-- DropIndex
DROP INDEX "Notification_customerId_isRead_idx";

-- DropIndex
DROP INDEX "NotificationSettings_customerId_key";

-- DropIndex
DROP INDEX "PaymentMethod_customerId_idx";

-- DropIndex
DROP INDEX "PaymentMethod_customerId_isDefault_idx";

-- DropIndex
DROP INDEX "Seller_customerId_hasSeenWelcomeModal_idx";

-- DropIndex
DROP INDEX "Seller_customerId_key";

-- DropIndex
DROP INDEX "Wishlist_customerId_key";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "customerId",
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "zoneTierOverride" INTEGER;

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "CheckoutSession" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "NotificationSettings" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bundleQuantity" INTEGER,
ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "customOrderInstructions" TEXT,
ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'READY_TO_SHIP',
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "isBundle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCustomOrderAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLocalPickupAllowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "localPickupInstructions" TEXT,
ADD COLUMN     "maxOrderQty" INTEGER,
ADD COLUMN     "minOrderQty" INTEGER,
ADD COLUMN     "processingTime" TEXT,
ADD COLUMN     "shippingFeeOverride" DECIMAL(65,30),
ADD COLUMN     "videoUrl" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "materials",
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Seller" DROP COLUMN "approvedAt",
DROP COLUMN "availableBalance",
DROP COLUMN "businessAddress",
DROP COLUMN "businessType",
DROP COLUMN "commissionRate",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "deletedAt",
DROP COLUMN "description",
DROP COLUMN "hasPriorExperience",
DROP COLUMN "idNumber",
DROP COLUMN "idType",
DROP COLUMN "isHandmade",
DROP COLUMN "legalName",
DROP COLUMN "location",
DROP COLUMN "pendingBalance",
DROP COLUMN "pinnedProductIds",
DROP COLUMN "portfolioLink",
DROP COLUMN "productCategories",
DROP COLUMN "rating",
DROP COLUMN "rejectionReason",
DROP COLUMN "socialMediaLink",
DROP COLUMN "termsAccepted",
DROP COLUMN "termsAcceptedAt",
DROP COLUMN "totalOrders",
DROP COLUMN "totalSales",
DROP COLUMN "totalWithdrawn",
DROP COLUMN "updatedAt",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Wishlist" DROP COLUMN "customerId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Customer";

-- CreateTable
CREATE TABLE "User" (
    "uid" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "avatar" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
    "googleId" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 100,
    "codCancellationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "deletionScheduledFor" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ProductOption" (
    "uid" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "ProductOptionValue" (
    "uid" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "uid" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL,
    "sellerId" INTEGER,
    "sellerStatus" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "OrderShipment" (
    "uid" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "fulfillmentType" "ShipmentType" NOT NULL,
    "zoneTier" INTEGER NOT NULL,
    "shippingFee" DECIMAL(65,30) NOT NULL,
    "computedFuelCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "meetUpSnapshot" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_ProductOptionValueToProductVariant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProductOptionValueToProductVariant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "OrderShipment_orderId_idx" ON "OrderShipment"("orderId");

-- CreateIndex
CREATE INDEX "OrderShipment_sellerId_idx" ON "OrderShipment"("sellerId");

-- CreateIndex
CREATE INDEX "_ProductOptionValueToProductVariant_B_index" ON "_ProductOptionValueToProductVariant"("B");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_userId_key" ON "NotificationSettings"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethod_userId_isDefault_idx" ON "PaymentMethod"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_userId_key" ON "Seller"("userId");

-- CreateIndex
CREATE INDEX "Seller_userId_hasSeenWelcomeModal_idx" ON "Seller"("userId", "hasSeenWelcomeModal");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductOptionValueToProductVariant" ADD CONSTRAINT "_ProductOptionValueToProductVariant_A_fkey" FOREIGN KEY ("A") REFERENCES "ProductOptionValue"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductOptionValueToProductVariant" ADD CONSTRAINT "_ProductOptionValueToProductVariant_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductVariant"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
