-- AlterTable
ALTER TABLE "SectionConfiguration" ADD COLUMN     "differentFrameMaterials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "separateMosquitoNet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackRailDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "worksheetId" TEXT NOT NULL,
    "quotationNumber" TEXT,
    "clientName" TEXT,
    "pricingData" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
