"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationById = exports.updateOrganizationImage = exports.createOrganizationAccount = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../client");
const errors_1 = require("../errors");
const createOrganizationAccount = async (input) => {
    const existing = await client_2.prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
        throw new errors_1.BadRequestError("An account with this email already exists");
    return client_2.prisma.$transaction(async (tx) => {
        const createdOwner = await tx.user.create({
            data: {
                name: input.name,
                email: input.email,
                phone: input.phone,
                password: input.password,
                gender: input.gender,
                role: client_1.Role.ADMIN,
                isActive: client_1.KYCStatus.active,
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
exports.createOrganizationAccount = createOrganizationAccount;
const updateOrganizationImage = async (organizationId, url) => {
    const organization = await client_2.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization)
        throw new errors_1.BadRequestError("Organization account not found");
    return client_2.prisma.organization.update({
        where: { id: organization.id },
        data: { bannerUrl: url },
    });
};
exports.updateOrganizationImage = updateOrganizationImage;
const getOrganizationById = (organizationId) => client_2.prisma.organization.findUnique({ where: { id: organizationId } });
exports.getOrganizationById = getOrganizationById;
