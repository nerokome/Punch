ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "OfficeLocation" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "OfficeLocation_organizationId_idx" ON "OfficeLocation"("organizationId");

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeLocation" ADD CONSTRAINT "OfficeLocation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "User" AS u SET "organizationId" = o."id"
FROM "Organization" AS o WHERE o."ownerId" = u."id";

-- A single pre-existing tenant is unambiguous: attach legacy users and offices to it.
UPDATE "User" SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1)
WHERE "organizationId" IS NULL AND (SELECT COUNT(*) FROM "Organization") = 1;
UPDATE "OfficeLocation" SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1)
WHERE "organizationId" IS NULL AND (SELECT COUNT(*) FROM "Organization") = 1;

-- Attach existing offices when all linked organization members agree on one owner.
UPDATE "OfficeLocation" AS office SET "organizationId" = linked."organizationId"
FROM (
    SELECT "officeId", MIN("organizationId") AS "organizationId"
    FROM "User"
    WHERE "organizationId" IS NOT NULL AND "officeId" IS NOT NULL
    GROUP BY "officeId"
    HAVING COUNT(DISTINCT "organizationId") = 1
) AS linked
WHERE office."id" = linked."officeId" AND office."organizationId" IS NULL;

UPDATE "OfficeLocation" AS office SET "organizationId" = linked."organizationId"
FROM (
    SELECT access."officeId", MIN(admin."organizationId") AS "organizationId"
    FROM "AdminOfficeAccess" AS access
    JOIN "User" AS admin ON admin."id" = access."adminId"
    WHERE admin."organizationId" IS NOT NULL
    GROUP BY access."officeId"
    HAVING COUNT(DISTINCT admin."organizationId") = 1
) AS linked
WHERE office."id" = linked."officeId" AND office."organizationId" IS NULL;
