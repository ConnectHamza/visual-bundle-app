-- CreateTable
CREATE TABLE "DiscountTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bundleId" TEXT NOT NULL,
    "minimumQuantity" INTEGER NOT NULL,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscountTier_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DiscountTier_bundleId_idx" ON "DiscountTier"("bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountTier_bundleId_minimumQuantity_key" ON "DiscountTier"("bundleId", "minimumQuantity");

-- CreateIndex
CREATE INDEX "Bundle_shop_idx" ON "Bundle"("shop");
