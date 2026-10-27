-- CreateEnum
CREATE TYPE "SiteMockExam" AS ENUM ('IELTS', 'TOPIK', 'SAT', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteCourseCategory" AS ENUM ('IT', 'MATH', 'AI', 'STUDY_ABROAD');

-- CreateEnum
CREATE TYPE "SiteHonorResult" AS ENUM ('MEDAL', 'EXAM_SCORE');

-- CreateTable
CREATE TABLE "site_mock_tests" (
    "id" UUID NOT NULL,
    "exam" "SiteMockExam" NOT NULL,
    "title" JSONB NOT NULL,
    "included" JSONB NOT NULL,
    "examDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "location" JSONB NOT NULL,
    "price" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "takenSeats" INTEGER NOT NULL DEFAULT 0,
    "contactPersonId" UUID,
    "contactPhone" TEXT,
    "showOnSite" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_mock_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_open_courses" (
    "id" UUID NOT NULL,
    "category" "SiteCourseCategory" NOT NULL,
    "title" JSONB NOT NULL,
    "source" TEXT,
    "description" JSONB,
    "status" "SitePostStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_open_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_open_lessons" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "durationSec" INTEGER,

    CONSTRAINT "site_open_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_honor_students" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "className" TEXT,
    "resultType" "SiteHonorResult" NOT NULL,
    "place" INTEGER,
    "score" TEXT,
    "subject" JSONB NOT NULL,
    "competition" JSONB NOT NULL,
    "achievedOn" DATE NOT NULL,
    "photoAssetId" UUID,
    "photoPath" TEXT,
    "parentConsent" BOOLEAN NOT NULL DEFAULT false,
    "showOnSite" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_honor_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_mock_tests_showOnSite_examDate_idx" ON "site_mock_tests"("showOnSite", "examDate");

-- CreateIndex
CREATE INDEX "site_open_courses_status_order_idx" ON "site_open_courses"("status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "site_open_lessons_courseId_order_key" ON "site_open_lessons"("courseId", "order");

-- CreateIndex
CREATE INDEX "site_honor_students_showOnSite_order_idx" ON "site_honor_students"("showOnSite", "order");

-- AddForeignKey
ALTER TABLE "site_mock_tests" ADD CONSTRAINT "site_mock_tests_contactPersonId_fkey" FOREIGN KEY ("contactPersonId") REFERENCES "site_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_open_lessons" ADD CONSTRAINT "site_open_lessons_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "site_open_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_honor_students" ADD CONSTRAINT "site_honor_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_honor_students" ADD CONSTRAINT "site_honor_students_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
