ALTER TABLE "Bundle" ADD COLUMN "volumeScope" TEXT NOT NULL DEFAULT 'single';
ALTER TABLE "Bundle" ADD COLUMN "minimumSelections" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Bundle" ADD COLUMN "maximumSelections" INTEGER;
ALTER TABLE "Bundle" ADD COLUMN "fbtDiscountValue" REAL;
