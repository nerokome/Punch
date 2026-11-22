"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignUserToShiftService = exports.deleteShiftService = exports.updateShiftService = exports.getShiftsByOfficeIdService = exports.createShiftService = exports.getAllOfficeLocationsService = exports.getOfficeLocationByOfficeId = exports.updateOfficeLocationService = exports.createOfficeLocationService = void 0;
const client_1 = require("../client");
const errors_1 = require("../errors");
const validateOfficeCoordinates = (data) => {
    const { latitude, longitude, radius } = data;
    const hasLat = latitude !== undefined && latitude !== null;
    const hasLng = longitude !== undefined && longitude !== null;
    if (hasLat !== hasLng) {
        throw new errors_1.BadRequestError("Both latitude and longitude must be provided together.");
    }
    if (hasLat && hasLng) {
        if (latitude < -90 || latitude > 90) {
            throw new errors_1.BadRequestError("Latitude must be between -90 and 90.");
        }
        if (longitude < -180 || longitude > 180) {
            throw new errors_1.BadRequestError("Longitude must be between -180 and 180.");
        }
    }
    if (radius !== undefined && radius !== null && radius <= 0) {
        throw new errors_1.BadRequestError("Radius must be a positive number of meters.");
    }
};
const createOfficeLocationService = async (data) => {
    validateOfficeCoordinates(data);
    try {
        const office = await client_1.prisma.officeLocation.create({
            data,
        });
        return office;
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to create office location");
    }
};
exports.createOfficeLocationService = createOfficeLocationService;
const updateOfficeLocationService = async (officeId, data) => {
    validateOfficeCoordinates(data);
    try {
        const info = await client_1.prisma.officeLocation.update({
            where: { id: officeId },
            data,
        });
        return info;
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to update office location");
    }
};
exports.updateOfficeLocationService = updateOfficeLocationService;
const getOfficeLocationByOfficeId = async (officeId) => {
    const info = await client_1.prisma.officeLocation.findUnique({
        where: { id: officeId },
        //   include: { users: true },
    });
    return info;
};
exports.getOfficeLocationByOfficeId = getOfficeLocationByOfficeId;
/**
 * Fetches office locations.
 *
 * - Pass nothing (undefined) -> every office (used by SUPER_ADMIN, whose
 *   resolveOfficeScope returns undefined = unrestricted).
 * - Pass a single officeId string -> just that one office.
 * - Pass an array of officeIds -> every office in that list (used by ADMIN,
 *   whose resolveOfficeScope returns their merged primary + assigned
 *   AdminOfficeAccess offices).
 */
const getAllOfficeLocationsService = async (officeId) => {
    const whereCondition = {};
    if (Array.isArray(officeId)) {
        if (officeId.length > 0) {
            whereCondition.id = { in: officeId };
        }
        else {
            // Caller has an explicit but empty scope (e.g. an admin with no
            // offices assigned yet) — they should see nothing, not everything.
            return [];
        }
    }
    else if (officeId) {
        whereCondition.id = officeId;
    }
    const allOffices = await client_1.prisma.officeLocation.findMany({
        where: whereCondition,
        // include: { users: true },
        orderBy: { createdAt: "desc" },
    });
    return allOffices;
};
exports.getAllOfficeLocationsService = getAllOfficeLocationsService;
// Shift services
const createShiftService = async (data) => {
    try {
        return await client_1.prisma.shift.create({
            data,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to create shift");
    }
};
exports.createShiftService = createShiftService;
const getShiftsByOfficeIdService = async (officeId) => {
    return await client_1.prisma.shift.findMany({
        where: { officeId },
        include: { users: true },
        orderBy: { createdAt: "desc" },
    });
};
exports.getShiftsByOfficeIdService = getShiftsByOfficeIdService;
const updateShiftService = async (shiftId, data) => {
    try {
        return await client_1.prisma.shift.update({
            where: { id: shiftId },
            data,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to update shift");
    }
};
exports.updateShiftService = updateShiftService;
const deleteShiftService = async (shiftId) => {
    const usersOnShift = await client_1.prisma.user.count({ where: { shiftId } });
    if (usersOnShift > 0) {
        throw new errors_1.BadRequestError(`Cannot delete shift: ${usersOnShift} user(s) are still assigned to it. Reassign them first.`);
    }
    try {
        return await client_1.prisma.shift.delete({
            where: { id: shiftId },
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to delete shift");
    }
};
exports.deleteShiftService = deleteShiftService;
const assignUserToShiftService = async (userId, shiftId) => {
    try {
        return await client_1.prisma.user.update({
            where: { id: userId },
            data: { shiftId },
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to assign user to shift");
    }
};
exports.assignUserToShiftService = assignUserToShiftService;
