-- AlterEnum
ALTER TYPE "AttendanceDayStatus" ADD VALUE 'ABSENT';

-- DropIndex
DROP INDEX "WorkSchedule_userId_key";
