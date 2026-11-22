"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertOrganizationMatch = exports.assertShiftInOrganization = exports.assertUserInOrganization = exports.assertOfficeInOrganization = exports.getOrganizationOfficeIds = void 0;
const client_1 = require("../client");
const errors_1 = require("../errors");
const getOrganizationOfficeIds = async (organizationId) => {
    if (!organizationId)
        return undefined;
    const offices = await client_1.prisma.officeLocation.findMany({
        where: { organizationId },
        select: { id: true },
    });
    return offices.map(({ id }) => id);
};
exports.getOrganizationOfficeIds = getOrganizationOfficeIds;
const assertOfficeInOrganization = async (officeId, organizationId) => {
    if (!organizationId)
        return;
    const office = await client_1.prisma.officeLocation.findUnique({ where: { id: officeId }, select: { organizationId: true } });
    if (!office || office.organizationId !== organizationId)
        throw new errors_1.NotFoundError("Office not found");
};
exports.assertOfficeInOrganization = assertOfficeInOrganization;
const assertUserInOrganization = async (userId, organizationId) => {
    if (!organizationId)
        return;
    const user = await client_1.prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
    if (!user || user.organizationId !== organizationId)
        throw new errors_1.NotFoundError("User not found");
};
exports.assertUserInOrganization = assertUserInOrganization;
const assertShiftInOrganization = async (shiftId, organizationId) => {
    if (!organizationId)
        return;
    const shift = await client_1.prisma.shift.findUnique({
        where: { id: shiftId },
        select: { office: { select: { organizationId: true } } },
    });
    if (!shift || shift.office.organizationId !== organizationId)
        throw new errors_1.NotFoundError("Shift not found");
};
exports.assertShiftInOrganization = assertShiftInOrganization;
const assertOrganizationMatch = (actualOrganizationId, expectedOrganizationId) => {
    if (expectedOrganizationId && actualOrganizationId !== expectedOrganizationId) {
        throw new errors_1.ForbiddenError("This resource belongs to another organization");
    }
};
exports.assertOrganizationMatch = assertOrganizationMatch;
