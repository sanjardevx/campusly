-- CreateTable
CREATE TABLE "course_questions" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "lessonId" UUID,
    "assignmentId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "course_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_answers" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "isStaff" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_questions_courseId_status_createdAt_idx" ON "course_questions"("courseId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "course_questions_authorId_idx" ON "course_questions"("authorId");

-- CreateIndex
CREATE INDEX "course_questions_lessonId_idx" ON "course_questions"("lessonId");

-- CreateIndex
CREATE INDEX "course_questions_assignmentId_idx" ON "course_questions"("assignmentId");

-- CreateIndex
CREATE INDEX "course_answers_questionId_createdAt_idx" ON "course_answers"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "course_answers_authorId_idx" ON "course_answers"("authorId");

-- AddForeignKey
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_questions" ADD CONSTRAINT "course_questions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_answers" ADD CONSTRAINT "course_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "course_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_answers" ADD CONSTRAINT "course_answers_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
