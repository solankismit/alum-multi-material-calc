-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'GUEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "company" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trackTypes" TEXT[],
    "configs" TEXT[],

    CONSTRAINT "SectionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionConfiguration" (
    "id" TEXT NOT NULL,
    "sectionTypeId" TEXT NOT NULL,
    "trackType" TEXT NOT NULL,
    "configuration" TEXT NOT NULL,
    "shutterWidthDeduction" DOUBLE PRECISION NOT NULL,
    "heightDeduction" DOUBLE PRECISION NOT NULL,
    "threeTrackWidthAddition" DOUBLE PRECISION NOT NULL,
    "glassWidthDeduction" DOUBLE PRECISION NOT NULL,
    "glassHeightDeduction" DOUBLE PRECISION NOT NULL,
    "frameMultiplierW" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "frameMultiplierH" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLength" (
    "id" TEXT NOT NULL,
    "sectionTypeId" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "lengthFeet" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StockLength_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSectionPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stockLengthId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSectionPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worksheet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worksheet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SectionType_name_key" ON "SectionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SectionConfiguration_sectionTypeId_trackType_configuration_key" ON "SectionConfiguration"("sectionTypeId", "trackType", "configuration");

-- CreateIndex
CREATE UNIQUE INDEX "StockLength_sectionTypeId_length_key" ON "StockLength"("sectionTypeId", "length");

-- CreateIndex
CREATE UNIQUE INDEX "UserSectionPreference_userId_stockLengthId_key" ON "UserSectionPreference"("userId", "stockLengthId");

-- AddForeignKey
ALTER TABLE "SectionConfiguration" ADD CONSTRAINT "SectionConfiguration_sectionTypeId_fkey" FOREIGN KEY ("sectionTypeId") REFERENCES "SectionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLength" ADD CONSTRAINT "StockLength_sectionTypeId_fkey" FOREIGN KEY ("sectionTypeId") REFERENCES "SectionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSectionPreference" ADD CONSTRAINT "UserSectionPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSectionPreference" ADD CONSTRAINT "UserSectionPreference_stockLengthId_fkey" FOREIGN KEY ("stockLengthId") REFERENCES "StockLength"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worksheet" ADD CONSTRAINT "Worksheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
