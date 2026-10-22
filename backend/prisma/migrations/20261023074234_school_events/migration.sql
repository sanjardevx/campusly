-- CreateEnum
CREATE TYPE "SchoolEventKind" AS ENUM ('HOLIDAY', 'EVENT', 'DEADLINE', 'START');

-- CreateTable
CREATE TABLE "school_events" (
    "id" UUID NOT NULL,
    "kind" "SchoolEventKind" NOT NULL,
    "title" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "school_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_events_startsOn_endsOn_idx" ON "school_events"("startsOn", "endsOn");

-- AddForeignKey
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
