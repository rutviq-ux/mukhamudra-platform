-- AlterTable
ALTER TABLE "User" ADD COLUMN "coachModalities" TEXT[] DEFAULT ARRAY[]::TEXT[];
