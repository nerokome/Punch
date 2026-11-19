import { prisma } from "../client";
import { Role, User, KYCStatus } from "@prisma/client";
import { BadRequestError } from "../errors";
import * as XLSX from "xlsx";

interface GetAllUsersParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  officeId?: string;
  officeIds?: string[];
}

interface PaginatedUsers {
  total: number;
  pages: number;
  currentPage: number;
  users: ReturnedUser[];
}

export type UserAccount = Pick<
  User,
  | "name"
  | "role"
  | "email"
  | "phone"
  | "password"
  | "gender"
  | "officeId"
  | "isActive"
>;

// excluded password types
export type ReturnedUser = Partial<Pick<User, "password">> &
  Omit<User, "password">;

export const mergeAdminOfficeIds = (
  primaryOfficeId: string | null | undefined,
  assignedOfficeIds: Array<string | null | undefined>,
): string[] => {
  const uniqueOfficeIds = new Set<string>();

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

export const pickPrimaryAdminOfficeId = (
  primaryOfficeId: string | null | undefined,
  assignedOfficeIds: Array<string | null | undefined>,
): string | null => {
  if (primaryOfficeId) {
    return primaryOfficeId;
  }

  const firstAssignedOffice = assignedOfficeIds.find(
    (officeId): officeId is string => Boolean(officeId),
  );

  return firstAssignedOffice ?? null;
};

const syncAdminPrimaryOffice = async (adminId: string): Promise<void> => {
  const [admin, accesses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: adminId },
      select: { officeId: true },
    }),
    prisma.adminOfficeAccess.findMany({
      where: { adminId },
      select: { officeId: true },
    }),
  ]);

  if (!admin) {
    return;
  }

  const assignedOfficeIds = accesses.map((access) => access.officeId);
  const nextPrimaryOfficeId = pickPrimaryAdminOfficeId(
    admin.officeId,
    assignedOfficeIds,
  );

  if (admin.officeId !== nextPrimaryOfficeId) {
    await prisma.user.update({
      where: { id: adminId },
      data: { officeId: nextPrimaryOfficeId },
    });
  }
};

export const registerUserService = async (
  data: UserAccount,
): Promise<ReturnedUser> => {
  const user: ReturnedUser = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { ...data },
    });

    if (createdUser.role === Role.ADMIN && createdUser.officeId) {
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

export const getUserByEmailService = async (
  email: string,
): Promise<ReturnedUser | null> => {
  const user: ReturnedUser | null = await prisma.user.findUnique({
    where: { email },
    include: {
      office: true,
      shift: true,
    },
  });
  return user;
};

export const getUserByIdService = async (
  id: string,
): Promise<ReturnedUser | null> => {
  const user: ReturnedUser | null = await prisma.user.findUnique({
    where: { id },
    include: {
      office: true,
      shift: true,
    },
  });
  return user;
};

export const updateUserService = async (
  id: string,
  data: Partial<UserAccount>,
): Promise<ReturnedUser> => {
  const user: ReturnedUser = await prisma.user.update({
    where: { id },
    data: { ...data },
  });
  delete user.password;

  return user;
};

export const updatePasswordService = async (
  email: string,
  password: string,
): Promise<ReturnedUser> => {
  const user: ReturnedUser = await prisma.user.update({
    where: { email },
    data: { password },
  });
  delete user.password;

  return user;
};

export const verifyUserService = async (
  email: string,
): Promise<ReturnedUser> => {
  const user: ReturnedUser = await prisma.user.update({
    where: { email },
    data: { isVerified: true },
  });
  delete user.password;

  return user;
};

/**
 * Returns the list of officeIds a requester is scoped to.
 *
 * - SUPER_ADMIN  -> undefined  (no restriction; caller should skip filtering)
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
export const resolveOfficeScope = async (
  role: Role,
  userId: string,
): Promise<string[] | undefined> => {
  if (role === Role.SUPER_ADMIN) {
    return undefined; // no restriction
  }

  if (role === Role.ADMIN) {
    return getAdminOfficeIds(userId); // may be []
  }

  throw new Error("Unauthorized access");
};

export const getAdminOfficeIds = async (
  adminId: string,
): Promise<string[]> => {
  const [admin, accesses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: adminId },
      select: { officeId: true },
    }),
    prisma.adminOfficeAccess.findMany({
      where: { adminId },
      select: { officeId: true },
    }),
  ]);

  const result = mergeAdminOfficeIds(
    admin?.officeId,
    accesses.map((access) => access.officeId),
  );

  console.log(`[DEBUG] getAdminOfficeIds(${adminId}):`, {
    adminPrimaryOffice: admin?.officeId,
    adminOfficeAccessCount: accesses.length,
    assignedOfficeIds: accesses.map((access) => access.officeId),
    mergedResult: result,
  });

  return result;
};

export const getOfficeFilter = (
  role: Role,
  officeId?: string | null,
): string | undefined => {
  if (role === Role.ADMIN) {
    return officeId ?? undefined;
  }

  return undefined;
};

interface BulkUploadResult {
  created: number;
  failed: { row: number; email: string; reason: string }[];
  skipped: { row: number; email: string; reason: string }[];
}

export const bulkUploadUsersService = async (
  fileBuffer: Buffer,
  officeId: string,
): Promise<BulkUploadResult> => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const result: BulkUploadResult = { created: 0, failed: [], skipped: [] };
  const validRoles = ["ADMIN", "SUPER_ADMIN", "AGENT"];
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

    const existing = await getUserByEmailService(email);
    if (existing) {
      result.skipped.push({
        row: rowNum,
        email,
        reason: "Email already exists",
      });
      continue;
    }

    try {
      await registerUserService({
        name,
        email,
        password,
        phone,
        officeId,
        role: role as any,
        gender: (gender || undefined) as any,
        isActive: KYCStatus.active,
      });
      result.created++;
    } catch (error: any) {
      result.failed.push({
        row: rowNum,
        email,
        reason: error.message || "Failed to create user",
      });
    }
  }

  return result;
};

export const getAllUsersService = async ({
  page = 1,
  limit = 10,
  searchTerm = "",
  officeId = "",
  officeIds = [],
}: GetAllUsersParams): Promise<PaginatedUsers> => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);
  const skip = (pageNumber - 1) * limitNumber;

  const whereCondition: any = {
    isDeleted: false,
    OR: [
      { name: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
    ],
  };

  // Resolve the effective set of office ids we're filtering by (supports
  // either a single officeId or an array of officeIds from the caller).
  const targetOfficeIds =
    officeIds && officeIds.length > 0
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
    prisma.user.findMany({
      where: whereCondition,
      skip,
      take: limitNumber,
      orderBy: { createdAt: "desc" },
      include: {
        office: true,
        shift: true,
        adminOfficeAccess: { include: { office: true } },
      },
    }),
    prisma.user.count({
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
// Admin Office Access Services
export const assignOfficeToAdminService = async (
  adminId: string,
  officeId: string,
): Promise<any> => {
  // Verify admin exists and is actually an admin
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new BadRequestError("Admin not found");
  if (admin.role !== Role.ADMIN)
    throw new BadRequestError("User is not an admin");

  // Verify office exists
  const office = await prisma.officeLocation.findUnique({
    where: { id: officeId },
  });
  if (!office) throw new BadRequestError("Office not found");

  // Create or ignore if already exists
  const access = await prisma.adminOfficeAccess.upsert({
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

export const removeOfficeFromAdminService = async (
  adminId: string,
  officeId: string,
): Promise<void> => {
  // Verify admin exists
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new BadRequestError("Admin not found");

  // Delete the access record
  await prisma.adminOfficeAccess.deleteMany({
    where: { adminId, officeId },
  });

  await syncAdminPrimaryOffice(adminId);
};

export const getAdminOfficesService = async (adminId: string): Promise<any> => {
  // Verify admin exists
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    include: { office: true },
  });
  if (!admin) throw new BadRequestError("Admin not found");

  const offices = await prisma.adminOfficeAccess.findMany({
    where: { adminId },
    include: { office: true },
  });

  // Keep admins created before AdminOfficeAccess was introduced visible.
  if (
    admin.officeId &&
    admin.office &&
    !offices.some((access) => access.officeId === admin.officeId)
  ) {
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

export const getUserWithOfficesService = async (
  id: string,
): Promise<any> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      office: true,
      shift: true,
      adminOfficeAccess: {
        include: { office: true },
      },
    },
  });

  return user;
};