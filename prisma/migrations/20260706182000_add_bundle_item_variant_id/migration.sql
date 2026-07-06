-- AlterTable
ALTER TABLE "BundleItem" ADD COLUMN "variantId" TEXT;

-- CreateIndex
CREATE INDEX "BundleItem_variantId_idx" ON "BundleItem"("variantId");
