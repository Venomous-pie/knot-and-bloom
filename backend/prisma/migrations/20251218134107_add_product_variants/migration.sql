/*
  Warnings:

  - You are about to drop the column `variant` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `variants` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "variant",
ADD COLUMN     "productVariantId" INTEGER;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
DROP COLUMN "variants";

-- CreateTable
CREATE TABLE "ProductVariant" (
    "uid" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(65,30),

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_name_key" ON "ProductVariant"("productId", "name");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("uid") ON DELETE SET NULL ON UPDATE CASCADE;
