import { prisma } from "../client";
import { ForbiddenError, NotFoundError } from "../errors";

export const getOrganizationOfficeIds = async (organizationId?: string | null): Promise<string[] | undefined> => {
  if (!organizationId) return undefined;
  const offices = await prisma.officeLocation.findMany({
    where: { organizationId },
    select: { id: true },
  });
  return offices.map(({ id }) => id);
};

export const assertOfficeInOrganization = async (officeId: string, organizationId?: string | null): Promise<void> => {
  if (!organizationId) return;
  const office = await prisma.officeLocation.findUnique({ where: { id: officeId }, select: { organizationId: true } });
  if (!office || office.organizationId !== organizationId) throw new NotFoundError("Office not found");
};

export const assertUserInOrganization = async (userId: string, organizationId?: string | null): Promise<void> => {
  if (!organizationId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
  if (!user || user.organizationId !== organizationId) throw new NotFoundError("User not found");
};

export const assertShiftInOrganization = async (shiftId: string, organizationId?: string | null): Promise<void> => {
  if (!organizationId) return;
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    select: { office: { select: { organizationId: true } } },
  });
  if (!shift || shift.office.organizationId !== organizationId) throw new NotFoundError("Shift not found");
};

export const assertOrganizationMatch = (actualOrganizationId?: string | null, expectedOrganizationId?: string | null): void => {
  if (expectedOrganizationId && actualOrganizationId !== expectedOrganizationId) {
    throw new ForbiddenError("This resource belongs to another organization");
  }
};
