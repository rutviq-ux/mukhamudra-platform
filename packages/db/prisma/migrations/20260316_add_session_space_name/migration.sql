-- AlterTable
ALTER TABLE "Session" ADD COLUMN "spaceName" TEXT;

-- CreateIndex
CREATE INDEX "Session_spaceName_idx" ON "Session"("spaceName");

-- Data migration: move space names from calendarEventId to spaceName
UPDATE "Session"
SET "spaceName" = "calendarEventId",
    "calendarEventId" = NULL
WHERE "calendarEventId" LIKE 'spaces/%';
