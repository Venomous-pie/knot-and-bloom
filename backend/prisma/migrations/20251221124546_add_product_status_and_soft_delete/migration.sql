-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" INTEGER,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'PENDING';
