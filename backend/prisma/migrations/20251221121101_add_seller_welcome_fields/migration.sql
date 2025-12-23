-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "hasSeenWelcomeModal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Seller_customerId_hasSeenWelcomeModal_idx" ON "Seller"("customerId", "hasSeenWelcomeModal");
