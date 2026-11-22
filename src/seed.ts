import dotenv from "dotenv";
import { GenderEnum, KYCStatus, Role } from "@prisma/client";
import { prisma } from "./client";

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

async function main() {
  const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";
  const email = (process.env.SUPER_ADMIN_EMAIL?.trim() || "superadmin@example.com").toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "12345678";
  if (password.length < 6) throw new Error("SUPER_ADMIN_PASSWORD must be at least 6 characters");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && (existing.organizationId || existing.role !== Role.SUPER_ADMIN)) {
    throw new Error("SUPER_ADMIN_EMAIL is already used by a non-platform account");
  }
  const globalAdmin = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN, organizationId: null } });
  if (globalAdmin && globalAdmin.id !== existing?.id) {
    throw new Error(`A global super admin already exists (${globalAdmin.email}); use that email to rotate its password`);
  }

  const data = {
    name,
    email,
    password, // Prisma client middleware hashes passwords on create/update.
    phone: process.env.SUPER_ADMIN_PHONE?.trim() || null,
    gender: (process.env.SUPER_ADMIN_GENDER as GenderEnum) || GenderEnum.Male,
    role: Role.SUPER_ADMIN,
    organizationId: null,
    officeId: null,
    isActive: KYCStatus.active,
    isVerified: true,
    isDeleted: false,
  };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });
  console.log(`Global super admin ready: ${user.email}`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
