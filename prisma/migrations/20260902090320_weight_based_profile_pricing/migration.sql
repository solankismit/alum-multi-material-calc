-- AlterTable
ALTER TABLE "RateCard" ADD COLUMN     "profileGroupCategories" TEXT[] DEFAULT ARRAY['frame', 'shutter', 'interlock']::TEXT[],
ADD COLUMN     "profileGroupLabel" TEXT NOT NULL DEFAULT 'Material',
ADD COLUMN     "profileGroupRatePerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "profileRateBasis" TEXT NOT NULL DEFAULT 'weight',
ADD COLUMN     "profileRatesPerKg" JSONB NOT NULL DEFAULT '{}';
