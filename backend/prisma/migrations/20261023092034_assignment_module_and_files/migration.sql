-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "moduleId" UUID;

-- CreateTable
CREATE TABLE "assignment_files" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(3),

    CONSTRAINT "assignment_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_files_assignmentId_idx" ON "assignment_files"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_files_assetId_idx" ON "assignment_files"("assetId");

-- CreateIndex
CREATE INDEX "assignments_moduleId_idx" ON "assignments"("moduleId");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_files" ADD CONSTRAINT "assignment_files_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_files" ADD CONSTRAINT "assignment_files_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
