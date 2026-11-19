/*
  Warnings:

  - A unique constraint covering the columns `[userId,workMode,effectiveFrom]` on the table `WorkSchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "WorkSchedule_userId_idx" ON "WorkSchedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSchedule_userId_workMode_effectiveFrom_key" ON "WorkSchedule"("userId", "workMode", "effectiveFrom");
