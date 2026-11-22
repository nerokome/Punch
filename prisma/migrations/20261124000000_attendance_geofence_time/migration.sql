ALTER TABLE "AttendanceRecord"
ADD COLUMN "outsideSince" TIMESTAMP(3),
ADD COLUMN "outsideDurationMs" INTEGER NOT NULL DEFAULT 0;
