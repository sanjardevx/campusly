-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "announcement_files" (
    "id" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(3),

    CONSTRAINT "announcement_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_files_announcementId_idx" ON "announcement_files"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_files_assetId_idx" ON "announcement_files"("assetId");

-- AddForeignKey
ALTER TABLE "announcement_files" ADD CONSTRAINT "announcement_files_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_files" ADD CONSTRAINT "announcement_files_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
