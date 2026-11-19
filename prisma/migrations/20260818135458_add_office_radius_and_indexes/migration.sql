-- AlterTable
ALTER TABLE "OfficeLocation" ADD COLUMN     "radius" DOUBLE PRECISION NOT NULL DEFAULT 100;

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_idx" ON "AttendanceRecord"("userId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_officeId_idx" ON "AttendanceRecord"("officeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_clockIn_idx" ON "AttendanceRecord"("clockIn");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_clockIn_idx" ON "AttendanceRecord"("userId", "clockIn");

-- CreateIndex
CREATE INDEX "QRToken_officeId_idx" ON "QRToken"("officeId");

-- CreateIndex
CREATE INDEX "User_officeId_idx" ON "User"("officeId");

-- CreateIndex
CREATE INDEX "User_shiftId_idx" ON "User"("shiftId");
