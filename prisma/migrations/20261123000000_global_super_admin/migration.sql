-- Organization owners use the tenant-scoped ADMIN role. Keep one global
-- SUPER_ADMIN account (organizationId IS NULL) for platform-wide operations.
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "role" = 'SUPER_ADMIN' AND "organizationId" IS NOT NULL;

WITH ranked_global_admins AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS position
  FROM "User"
  WHERE "role" = 'SUPER_ADMIN' AND "organizationId" IS NULL
)
UPDATE "User" AS users
SET "role" = 'ADMIN'
FROM ranked_global_admins AS ranked
WHERE users."id" = ranked."id" AND ranked.position > 1;

CREATE UNIQUE INDEX "User_single_global_super_admin_key"
ON "User" ("role")
WHERE "role" = 'SUPER_ADMIN';
