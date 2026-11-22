# Global super admin setup

The role model has one platform-wide `SUPER_ADMIN` account. Organization signup creates an `ADMIN` attached to that organization. Organization admins can manage all offices and people in their own organization; the global super admin has platform-wide access. The database migration demotes organization-bound super admins and retains at most one global super admin.

## Seed the global account

Set these values in `.env` before running the seed. Use a strong, unique password and keep it out of source control.

```env
SUPER_ADMIN_NAME="Platform Admin"
SUPER_ADMIN_EMAIL="platform-admin@example.com"
SUPER_ADMIN_PASSWORD="replace-with-a-strong-password"
SUPER_ADMIN_PHONE=""
SUPER_ADMIN_GENDER="Male"
```

Apply migrations and seed:

```powershell
npx prisma migrate deploy
npm run seed
```

The seed is safe to rerun with the same email; it updates the name and password. To rotate credentials later, update the environment values and rerun `npm run seed` using the same email. The seed refuses to create a second global super admin or take over an organization account.

## Role assignment

`SUPER_ADMIN` is reserved for the seed. Organization signup, user registration, bulk upload, and admin role changes cannot grant it. Organization admins can create offices; each new office belongs to their organization and is immediately included in that organization's office and people scope.
