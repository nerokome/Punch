"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const client_2 = require("./client");
dotenv_1.default.config();
const required = (key) => {
    const value = process.env[key]?.trim();
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
};
async function main() {
    const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";
    const email = (process.env.SUPER_ADMIN_EMAIL?.trim() || "superadmin@example.com").toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD || "12345678";
    if (password.length < 6)
        throw new Error("SUPER_ADMIN_PASSWORD must be at least 6 characters");
    const existing = await client_2.prisma.user.findUnique({ where: { email } });
    if (existing && (existing.organizationId || existing.role !== client_1.Role.SUPER_ADMIN)) {
        throw new Error("SUPER_ADMIN_EMAIL is already used by a non-platform account");
    }
    const globalAdmin = await client_2.prisma.user.findFirst({ where: { role: client_1.Role.SUPER_ADMIN, organizationId: null } });
    if (globalAdmin && globalAdmin.id !== existing?.id) {
        throw new Error(`A global super admin already exists (${globalAdmin.email}); use that email to rotate its password`);
    }
    const data = {
        name,
        email,
        password, // Prisma client middleware hashes passwords on create/update.
        phone: process.env.SUPER_ADMIN_PHONE?.trim() || null,
        gender: process.env.SUPER_ADMIN_GENDER || client_1.GenderEnum.Male,
        role: client_1.Role.SUPER_ADMIN,
        organizationId: null,
        officeId: null,
        isActive: client_1.KYCStatus.active,
        isVerified: true,
        isDeleted: false,
    };
    const user = existing
        ? await client_2.prisma.user.update({ where: { id: existing.id }, data })
        : await client_2.prisma.user.create({ data });
    console.log(`Global super admin ready: ${user.email}`);
}
main()
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(async () => client_2.prisma.$disconnect());
