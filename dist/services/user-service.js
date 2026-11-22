"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserWithOfficesService = exports.getAdminOfficesService = exports.removeOfficeFromAdminService = exports.assignOfficeToAdminService = exports.getAllUsersService = exports.bulkUploadUsersService = exports.getOfficeFilter = exports.getAdminOfficeIds = exports.resolveOfficeScope = exports.verifyUserService = exports.updatePasswordService = exports.updateUserProfilePictureService = exports.updateUserService = exports.getUserByIdService = exports.getUserByEmailService = exports.registerUserService = exports.pickPrimaryAdminOfficeId = exports.mergeAdminOfficeIds = void 0;
const client_1 = require("../client");
const client_2 = require("@prisma/client");
const errors_1 = require("../errors");
const XLSX = __importStar(require("xlsx"));
const mergeAdminOfficeIds = (primaryOfficeId, assignedOfficeIds) => {
    const uniqueOfficeIds = new Set();
    if (primaryOfficeId) {
        uniqueOfficeIds.add(primaryOfficeId);
    }
    for (const officeId of assignedOfficeIds) {
        if (officeId) {
            uniqueOfficeIds.add(officeId);
        }
    }
    return Array.from(uniqueOfficeIds);
};
exports.mergeAdminOfficeIds = mergeAdminOfficeIds;
const pickPrimaryAdminOfficeId = (primaryOfficeId, assignedOfficeIds) => {
    if (primaryOfficeId) {
        return primaryOfficeId;
    }
    const firstAssignedOffice = assignedOfficeIds.find((officeId) => Boolean(officeId));
    return firstAssignedOffice ?? null;
};
exports.pickPrimaryAdminOfficeId = pickPrimaryAdminOfficeId;
const syncAdminPrimaryOffice = async (adminId) => {
    const [admin, accesses] = await Promise.all([
        client_1.prisma.user.findUnique({
            where: { id: adminId },
            select: { officeId: true, organizationId: true },
        }),
        client_1.prisma.adminOfficeAccess.findMany({
            where: { adminId },
            select: { officeId: true },
        }),
    ]);
    if (!admin) {
        return;
    }
    const assignedOfficeIds = accesses.map((access) => access.officeId);
    const nextPrimaryOfficeId = (0, exports.pickPrimaryAdminOfficeId)(admin.officeId, assignedOfficeIds);
    if (admin.officeId !== nextPrimaryOfficeId) {
        await client_1.prisma.user.update({
            where: { id: adminId },
            data: { officeId: nextPrimaryOfficeId },
        });
    }
};
const registerUserService = async (data) => {
    if (data.role === client_2.Role.SUPER_ADMIN) {
        throw new errors_1.BadRequestError("The global super admin account can only be created by the seed workflow");
    }
    if (data.organizationId && data.officeId) {
        const office = await client_1.prisma.officeLocation.findUnique({
            where: { id: data.officeId },
            select: { organizationId: true },
        });
        if (!office || office.organizationId !== data.organizationId) {
            throw new errors_1.BadRequestError("User and office must belong to the same organization");
        }
    }
    const user = await client_1.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
            data: { ...data },
        });
        if (createdUser.role === client_2.Role.ADMIN && createdUser.officeId) {
            await tx.adminOfficeAccess.create({
                data: {
                    adminId: createdUser.id,
                    officeId: createdUser.officeId,
                },
            });
        }
        return createdUser;
    });
    delete user.password;
    return user;
};
exports.registerUserService = registerUserService;
const getUserByEmailService = async (email) => {
    const user = await client_1.prisma.user.findUnique({
        where: { email },
        include: {
            office: true,
            shift: true,
        },
    });
    return user;
};
exports.getUserByEmailService = getUserByEmailService;
const getUserByIdService = async (id) => {
    const user = await client_1.prisma.user.findUnique({
        where: { id },
        include: {
            office: true,
            shift: true,
        },
    });
    return user;
};
exports.getUserByIdService = getUserByIdService;
const updateUserService = async (id, data) => {
    const user = await client_1.prisma.user.update({
        where: { id },
        data: { ...data },
    });
    delete user.password;
    return user;
};
exports.updateUserService = updateUserService;
const updateUserProfilePictureService = async (userId, profilePictureUrl) => {
    return client_1.prisma.user.update({
        where: { id: userId },
        data: { profilePictureUrl },
        select: {
            id: true,
            name: true,
            email: true,
            profilePictureUrl: true,
        },
    });
};
exports.updateUserProfilePictureService = updateUserProfilePictureService;
const updatePasswordService = async (email, password) => {
    const user = await client_1.prisma.user.update({
        where: { email },
        data: { password },
    });
    delete user.password;
    return user;
};
exports.updatePasswordService = updatePasswordService;
const verifyUserService = async (email) => {
    const user = await client_1.prisma.user.update({
        where: { email },
        data: { isVerified: true },
    });
    delete user.password;
    return user;
};
exports.verifyUserService = verifyUserService;
/**
 * Returns the list of officeIds a requester is scoped to.
 *
 * - organization SUPER_ADMIN -> their organization's office IDs
 * - legacy platform SUPER_ADMIN -> undefined (unrestricted)
 * - ADMIN        -> string[]   (their assigned offices via AdminOfficeAccess;
 *                                can be an empty array, meaning they currently
 *                                have no offices assigned and should see nothing)
 * - anything else -> throws (agents/unknown roles should not be resolving
 *                             a multi-office scope at all)
 *
 * Replaces the old single-office `getOfficeFilter`, which only ever returned
 * one officeId for an ADMIN and silently ignored any additional assigned
 * offices in AdminOfficeAccess.
 */
const resolveOfficeScope = async (role, userId, organizationId) => {
    if (role === client_2.Role.SUPER_ADMIN) {
        if (!organizationId)
            return undefined; // legacy platform super admin
        const offices = await client_1.prisma.officeLocation.findMany({
            where: { organizationId },
            select: { id: true },
        });
        return offices.map((office) => office.id);
    }
    if (role === client_2.Role.ADMIN) {
        return (0, exports.getAdminOfficeIds)(userId); // may be []
    }
    throw new Error("Unauthorized access");
};
exports.resolveOfficeScope = resolveOfficeScope;
const getAdminOfficeIds = async (adminId) => {
    const [admin, accesses] = await Promise.all([
        client_1.prisma.user.findUnique({
            where: { id: adminId },
            select: { officeId: true, organizationId: true },
        }),
        client_1.prisma.adminOfficeAccess.findMany({
            where: { adminId },
            select: { officeId: true },
        }),
    ]);
    const merged = (0, exports.mergeAdminOfficeIds)(admin?.officeId, accesses.map((access) => access.officeId));
    // Organization admins manage every office in their own tenant. Platform
    // admins without an organization retain explicit office assignments only.
    const result = admin?.organizationId
        ? (await client_1.prisma.officeLocation.findMany({
            where: { organizationId: admin.organizationId },
            select: { id: true },
        })).map((office) => office.id)
        : merged;
    console.log(`[DEBUG] getAdminOfficeIds(${adminId}):`, {
        adminPrimaryOffice: admin?.officeId,
        adminOfficeAccessCount: accesses.length,
        assignedOfficeIds: accesses.map((access) => access.officeId),
        mergedResult: result,
    });
    return result;
};
exports.getAdminOfficeIds = getAdminOfficeIds;
const getOfficeFilter = (role, officeId) => {
    if (role === client_2.Role.ADMIN) {
        return officeId ?? undefined;
    }
    return undefined;
};
exports.getOfficeFilter = getOfficeFilter;
const bulkUploadUsersService = async (fileBuffer, officeId, organizationId) => {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const result = { created: 0, failed: [], skipped: [] };
    const validRoles = ["ADMIN", "AGENT"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const name = String(row.name || "").trim();
        const email = String(row.email || "").trim();
        const password = String(row.password || "").trim();
        const phone = String(row.phone || "").trim();
        const role = String(row.role || "").trim();
        const gender = String(row.gender || "").trim();
        if (!name || !email || !password || !phone || !role) {
            result.failed.push({
                row: rowNum,
                email: email || "(empty)",
                reason: "Missing required fields: name, email, password, phone, role",
            });
            continue;
        }
        if (!emailRegex.test(email)) {
            result.failed.push({
                row: rowNum,
                email,
                reason: "Invalid email format",
            });
            continue;
        }
        if (password.length < 6) {
            result.failed.push({
                row: rowNum,
                email,
                reason: "Password must be at least 6 characters",
            });
            continue;
        }
        if (!validRoles.includes(role)) {
            result.failed.push({
                row: rowNum,
                email,
                reason: `Role must be one of: ${validRoles.join(", ")}`,
            });
            continue;
        }
        if (gender && !["Male", "Female"].includes(gender)) {
            result.failed.push({
                row: rowNum,
                email,
                reason: "Gender must be 'Male' or 'Female'",
            });
            continue;
        }
        const existing = await (0, exports.getUserByEmailService)(email);
        if (existing) {
            result.skipped.push({
                row: rowNum,
                email,
                reason: "Email already exists",
            });
            continue;
        }
        try {
            await (0, exports.registerUserService)({
                name,
                email,
                password,
                phone,
                officeId,
                role: role,
                gender: (gender || undefined),
                isActive: client_2.KYCStatus.active,
                organizationId: organizationId ?? null,
            });
            result.created++;
        }
        catch (error) {
            result.failed.push({
                row: rowNum,
                email,
                reason: error.message || "Failed to create user",
            });
        }
    }
    return result;
};
exports.bulkUploadUsersService = bulkUploadUsersService;
const getAllUsersService = async ({ page = 1, limit = 10, searchTerm = "", officeId = "", officeIds = [], organizationId, }) => {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const whereCondition = {
        isDeleted: false,
        ...(organizationId ? { organizationId } : {}),
        OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
        ],
    };
    // Resolve the effective set of office ids we're filtering by (supports
    // either a single officeId or an array of officeIds from the caller).
    const targetOfficeIds = officeIds && officeIds.length > 0
        ? officeIds
        : officeId
            ? [officeId]
            : [];
    if (targetOfficeIds.length > 0) {
        // Match a user whose PRIMARY office is one of the target offices
        // (covers agents, and admins whose officeId happens to be here),
        // OR whose AdminOfficeAccess grants them one of the target offices
        // (covers admins assigned here whose primary office is elsewhere).
        // AND is combined with the existing search OR via Prisma's implicit
        // top-level AND, so search still narrows results as before.
        whereCondition.AND = [
            {
                OR: [
                    { officeId: { in: targetOfficeIds } },
                    {
                        adminOfficeAccess: {
                            some: { officeId: { in: targetOfficeIds } },
                        },
                    },
                ],
            },
        ];
    }
    const [users, total] = await Promise.all([
        client_1.prisma.user.findMany({
            where: whereCondition,
            skip,
            take: limitNumber,
            orderBy: { createdAt: "desc" },
            include: {
                office: true,
                shift: true,
                adminOfficeAccess: {
                    ...(organizationId ? { where: { office: { organizationId } } } : {}),
                    include: { office: true },
                },
            },
        }),
        client_1.prisma.user.count({
            where: whereCondition,
        }),
    ]);
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    const pages = Math.ceil(total / limitNumber);
    return {
        total,
        pages,
        currentPage: pageNumber,
        users: sanitizedUsers,
    };
};
exports.getAllUsersService = getAllUsersService;
// Admin Office Access Services
const assignOfficeToAdminService = async (adminId, officeId) => {
    // Verify admin exists and is actually an admin
    const admin = await client_1.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin)
        throw new errors_1.BadRequestError("Admin not found");
    if (admin.role !== client_2.Role.ADMIN)
        throw new errors_1.BadRequestError("User is not an admin");
    // Verify office exists
    const office = await client_1.prisma.officeLocation.findUnique({
        where: { id: officeId },
    });
    if (!office)
        throw new errors_1.BadRequestError("Office not found");
    if (admin.organizationId && office.organizationId !== admin.organizationId) {
        throw new errors_1.BadRequestError("Admin and office must belong to the same organization");
    }
    // Create or ignore if already exists
    const access = await client_1.prisma.adminOfficeAccess.upsert({
        where: {
            adminId_officeId: { adminId, officeId },
        },
        update: {},
        create: { adminId, officeId },
        include: { office: true },
    });
    await syncAdminPrimaryOffice(adminId);
    return access;
};
exports.assignOfficeToAdminService = assignOfficeToAdminService;
const removeOfficeFromAdminService = async (adminId, officeId) => {
    // Verify admin exists
    const admin = await client_1.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin)
        throw new errors_1.BadRequestError("Admin not found");
    const office = await client_1.prisma.officeLocation.findUnique({ where: { id: officeId } });
    if (!office)
        throw new errors_1.BadRequestError("Office not found");
    if (admin.organizationId && office.organizationId !== admin.organizationId) {
        throw new errors_1.BadRequestError("Admin and office must belong to the same organization");
    }
    // Delete the access record
    await client_1.prisma.adminOfficeAccess.deleteMany({
        where: { adminId, officeId },
    });
    await syncAdminPrimaryOffice(adminId);
};
exports.removeOfficeFromAdminService = removeOfficeFromAdminService;
const getAdminOfficesService = async (adminId) => {
    // Verify admin exists
    const admin = await client_1.prisma.user.findUnique({
        where: { id: adminId },
        include: { office: true },
    });
    if (!admin)
        throw new errors_1.BadRequestError("Admin not found");
    const offices = await client_1.prisma.adminOfficeAccess.findMany({
        where: {
            adminId,
            ...(admin.organizationId ? { office: { organizationId: admin.organizationId } } : {}),
        },
        include: { office: true },
    });
    // Keep admins created before AdminOfficeAccess was introduced visible.
    if (admin.officeId &&
        admin.office &&
        (!admin.organizationId || admin.office.organizationId === admin.organizationId) &&
        !offices.some((access) => access.officeId === admin.officeId)) {
        offices.unshift({
            id: `legacy-${admin.id}-${admin.officeId}`,
            adminId: admin.id,
            officeId: admin.officeId,
            office: admin.office,
            createdAt: admin.createdAt,
        });
    }
    return offices;
};
exports.getAdminOfficesService = getAdminOfficesService;
const getUserWithOfficesService = async (id, organizationId) => {
    const user = await client_1.prisma.user.findUnique({
        where: { id },
        include: {
            office: true,
            shift: true,
            adminOfficeAccess: {
                ...(organizationId ? { where: { office: { organizationId } } } : {}),
                include: { office: true },
            },
        },
    });
    return user;
};
exports.getUserWithOfficesService = getUserWithOfficesService;
