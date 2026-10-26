-- CreateEnum
CREATE TYPE "SitePostType" AS ENUM ('NEWS', 'EVENT');

-- CreateEnum
CREATE TYPE "SitePostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SiteProgramCategory" AS ENUM ('LANGUAGE', 'SPORTS', 'IT', 'ARTS', 'READING', 'OTHER');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "school_settings" ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "siteAddress" TEXT,
ADD COLUMN     "siteEmail" TEXT,
ADD COLUMN     "siteMetro" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "site_posts" (
    "id" UUID NOT NULL,
    "type" "SitePostType" NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "body" JSONB,
    "coverAssetId" UUID,
    "coverPath" TEXT,
    "eventDate" DATE,
    "startTime" TEXT,
    "endTime" TEXT,
    "place" JSONB,
    "carouselOrder" INTEGER,
    "status" "SitePostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_programs" (
    "id" UUID NOT NULL,
    "category" "SiteProgramCategory" NOT NULL,
    "name" JSONB NOT NULL,
    "gradeFrom" INTEGER NOT NULL,
    "gradeTo" INTEGER NOT NULL,
    "levelNote" JSONB,
    "days" TEXT[],
    "startTime" TEXT,
    "endTime" TEXT,
    "room" TEXT,
    "teacherIds" UUID[],
    "description" JSONB NOT NULL,
    "photoAssetId" UUID,
    "photoPath" TEXT,
    "videoUrl" TEXT,
    "showOnSite" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_people" (
    "id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" JSONB NOT NULL,
    "note" JSONB,
    "isDirector" BOOLEAN NOT NULL DEFAULT false,
    "photoAssetId" UUID,
    "photoPath" TEXT,
    "showOnSite" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "childGrade" INTEGER,
    "interest" TEXT,
    "locale" TEXT NOT NULL,
    "userAgent" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "handledById" UUID,
    "handledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_posts_status_publishedAt_idx" ON "site_posts"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "site_programs_showOnSite_order_idx" ON "site_programs"("showOnSite", "order");

-- CreateIndex
CREATE INDEX "site_people_showOnSite_order_idx" ON "site_people"("showOnSite", "order");

-- CreateIndex
CREATE INDEX "enquiries_status_createdAt_idx" ON "enquiries"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_posts" ADD CONSTRAINT "site_posts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_programs" ADD CONSTRAINT "site_programs_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_programs" ADD CONSTRAINT "site_programs_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_people" ADD CONSTRAINT "site_people_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
