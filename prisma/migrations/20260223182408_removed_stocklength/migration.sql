/*
  Warnings:

  - You are about to drop the `StockLength` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSectionPreference` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StockLength" DROP CONSTRAINT "StockLength_sectionTypeId_fkey";

-- DropForeignKey
ALTER TABLE "UserSectionPreference" DROP CONSTRAINT "UserSectionPreference_stockLengthId_fkey";

-- DropForeignKey
ALTER TABLE "UserSectionPreference" DROP CONSTRAINT "UserSectionPreference_userId_fkey";

-- DropTable
DROP TABLE "StockLength";

-- DropTable
DROP TABLE "UserSectionPreference";
