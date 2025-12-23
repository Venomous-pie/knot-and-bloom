-- CreateTable
CREATE TABLE "Product" (
    "uid" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "variants" TEXT,
    "basePrice" DECIMAL(65,30) NOT NULL,
    "discountedPrice" DECIMAL(65,30),
    "stock" INTEGER NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "uploaded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
