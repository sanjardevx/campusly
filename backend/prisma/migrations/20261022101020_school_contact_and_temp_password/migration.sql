-- AlterTable
ALTER TABLE "school_settings" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "officeHours" TEXT,
ADD COLUMN     "telegramUrl" TEXT,
ADD COLUMN     "tempPasswordDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "tempPasswordUses" INTEGER NOT NULL DEFAULT 3;
