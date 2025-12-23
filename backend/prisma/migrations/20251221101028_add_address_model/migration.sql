-- CreateTable
CREATE TABLE "Address" (
    "uid" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "aptSuite" TEXT,
    "city" TEXT NOT NULL,
    "stateProvince" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Philippines',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("uid")
);

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE INDEX "Address_customerId_isDefault_idx" ON "Address"("customerId", "isDefault");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
