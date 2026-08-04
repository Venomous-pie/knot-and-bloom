/*
  Warnings:

  - Added the required column `updatedAt` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "progressImages" TEXT[],
ADD COLUMN     "progressImagesRequested" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "availableBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.05,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeShippingThreshold" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "hasPriorExperience" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "idPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "idType" TEXT,
ADD COLUMN     "isHandmade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "meetUpPoint" TEXT,
ADD COLUMN     "monthlyOrders" TEXT,
ADD COLUMN     "pendingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "portfolioLink" TEXT,
ADD COLUMN     "productCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "rating" DECIMAL(65,30),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "salesChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sampleItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "selfDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerCitymunCode" TEXT,
ADD COLUMN     "sellerProvCode" TEXT,
ADD COLUMN     "sellerRegCode" TEXT,
ADD COLUMN     "socialMediaLink" TEXT,
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "totalWithdrawn" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vehicleType" "VehicleType" NOT NULL DEFAULT 'NONE';
