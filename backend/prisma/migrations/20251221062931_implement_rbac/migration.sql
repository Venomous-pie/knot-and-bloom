/*
  Warnings:

  - The `role` column on the `Customer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Seller` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[customerId]` on the table `Seller` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerId` to the `Seller` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "passwordResetRequired" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "customerId" INTEGER NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "SellerStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Seller_customerId_key" ON "Seller"("customerId");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
