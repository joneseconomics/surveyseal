-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "auth_providers" TEXT[] DEFAULT ARRAY[]::TEXT[];
