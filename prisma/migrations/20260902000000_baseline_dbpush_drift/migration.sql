-- Baseline migration capturing schema applied via `prisma db push` without
-- migration history (Customer, RateCard, Invoice, InvoiceLine,
-- CustomFieldDefinition, and the Quotation/User/SectionConfiguration columns
-- added alongside them). Generated with `prisma migrate diff` as the exact
-- delta from the three preceding migrations to the schema, then marked as
-- already-applied on the existing database.

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'SELECT');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_worksheetId_fkey";

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "clientAddress" TEXT,
ADD COLUMN     "clientGstNumber" TEXT,
ADD COLUMN     "clientPhone" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "customerRef" TEXT,
ADD COLUMN     "deliveryAddress" TEXT,
ADD COLUMN     "printedAt" TIMESTAMP(3),
ADD COLUMN     "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "worksheetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SectionConfiguration" ADD COLUMN     "bearingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "connectorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cornerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasTrackRail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mullionLengthDeduction" DOUBLE PRECISION,
ADD COLUMN     "mullionWidthDeduction" DOUBLE PRECISION,
ADD COLUMN     "outerFrameHeightDeduction" DOUBLE PRECISION,
ADD COLUMN     "outerFrameWidthDeduction" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SectionType" ADD COLUMN     "systemType" TEXT NOT NULL DEFAULT 'sliding';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankIfsc" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "gstNumber" TEXT,
ADD COLUMN     "invoiceSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceSeqFY" TEXT,
ADD COLUMN     "quotationSeq" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "options" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileRatePerFt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profileRates" JSONB NOT NULL DEFAULT '{}',
    "profileWeightPerFt" JSONB NOT NULL DEFAULT '{}',
    "glassRates" JSONB NOT NULL DEFAULT '{}',
    "hardwareRates" JSONB NOT NULL DEFAULT '{}',
    "rubberRatePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "brushRatePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coatingRatePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coatingWastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "laborMode" TEXT NOT NULL DEFAULT 'flat',
    "laborDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "laborRatePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMarginDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRateDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "termsText" TEXT NOT NULL DEFAULT 'Payment terms: 50% advance, balance upon completion.
Valid for 30 days from date of issue.',
    "hsnCodes" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quotationId" TEXT,
    "customerId" TEXT,
    "invoiceNumber" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "buyerGstNumber" TEXT,
    "buyerPhone" TEXT,
    "gstRate" DOUBLE PRECISION,
    "taxType" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "sellerSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "ratePerUnit" DOUBLE PRECISION,
    "taxableAmount" DOUBLE PRECISION NOT NULL,
    "hsnCode" TEXT,
    "gstRate" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_userId_idx" ON "CustomFieldDefinition"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_userId_key_key" ON "CustomFieldDefinition"("userId", "key");

-- CreateIndex
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RateCard_userId_key" ON "RateCard"("userId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_quotationId_idx" ON "Invoice"("quotationId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "Quotation_userId_idx" ON "Quotation"("userId");

-- CreateIndex
CREATE INDEX "Quotation_worksheetId_idx" ON "Quotation"("worksheetId");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Worksheet_userId_idx" ON "Worksheet"("userId");

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "Worksheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

