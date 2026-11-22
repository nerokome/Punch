import { GenderEnum, KYCStatus, Role } from "@prisma/client";
import { prisma } from "../client";
import { BadRequestError } from "../errors";

export type OrganizationSignupInput = {
  organizationName: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  gender: GenderEnum;
};

export const createOrganizationAccount = async (input: OrganizationSignupInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new BadRequestError("An account with this email already exists");

  return prisma.$transaction(async (tx) => {
    const createdOwner = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: input.password,
        gender: input.gender,
        role: Role.ADMIN,
        isActive: KYCStatus.active,
      },
    });
    const organization = await tx.organization.create({
      data: { name: input.organizationName, ownerId: createdOwner.id },
    });
    const owner = await tx.user.update({
      where: { id: createdOwner.id },
      data: { organizationId: organization.id },
    });
    const { password: _password, ...safeOwner } = owner;
    return { organization, owner: safeOwner };
  });
};

export const updateOrganizationImage = async (
  organizationId: string,
  url: string,
) => {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new BadRequestError("Organization account not found");
  return prisma.organization.update({
    where: { id: organization.id },
    data: { bannerUrl: url },
  });
};

export const getOrganizationById = (organizationId: string) =>
  prisma.organization.findUnique({ where: { id: organizationId } });

export const getPlatformOrganizationSummary = async () => {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      createdAt: true,
      _count: {
        select: {
          users: { where: { role: Role.AGENT, isDeleted: false } },
        },
      },
    },
  });

  const organizationList = organizations.map(({ _count, ...organization }) => ({
    ...organization,
    agentCount: _count.users,
  }));

  return {
    totalOrganizations: organizationList.length,
    totalAgents: organizationList.reduce((total, organization) => total + organization.agentCount, 0),
    organizations: organizationList,
  };
};
