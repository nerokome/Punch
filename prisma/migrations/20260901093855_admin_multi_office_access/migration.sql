-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_officeId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "officeId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AdminOfficeAccess" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminOfficeAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminOfficeAccess_adminId_idx" ON "AdminOfficeAccess"("adminId");

-- CreateIndex
CREATE INDEX "AdminOfficeAccess_officeId_idx" ON "AdminOfficeAccess"("officeId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminOfficeAccess_adminId_officeId_key" ON "AdminOfficeAccess"("adminId", "officeId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "OfficeLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOfficeAccess" ADD CONSTRAINT "AdminOfficeAccess_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminOfficeAccess" ADD CONSTRAINT "AdminOfficeAccess_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "OfficeLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
