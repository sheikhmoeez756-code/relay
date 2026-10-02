-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "wonAt" TIMESTAMP(3);

-- Backfill: best available signal for leads already marked won
UPDATE "Lead" SET "wonAt" = "updatedAt" WHERE "stage" = 'WON';

-- CreateIndex
CREATE INDEX "Lead_companyId_wonAt_idx" ON "Lead"("companyId", "wonAt");
