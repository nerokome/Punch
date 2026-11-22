"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignUserToShiftController = exports.deleteShiftController = exports.updateShiftController = exports.getShiftsByOfficeIdController = exports.createShiftController = exports.updateOfficeLocationController = exports.getOfficeLocationController = exports.getAllOfficeLocationController = exports.createOfficeController = void 0;
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const client_1 = require("../client");
const organization_access_1 = require("../helpers/organization-access");
const services_1 = require("../services");
const parseCoordinate = (val) => {
    if (val === undefined || val === null || val === "")
        return undefined;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
};
const createOfficeController = async (req, res) => {
    try {
        const { name, address, latitude, longitude, radius, } = req.body;
        const data = {
            name,
            address,
            latitude: parseCoordinate(latitude),
            longitude: parseCoordinate(longitude),
            radius: parseCoordinate(radius),
            organizationId: req.currentUser?.organizationId,
        };
        const record = await (0, services_1.createOfficeLocationService)(data);
        // The organization owner must immediately be able to manage the office
        // they created (and see its people through the normal admin scope).
        if (req.currentUser?.role === "ADMIN") {
            await client_1.prisma.adminOfficeAccess.upsert({
                where: { adminId_officeId: { adminId: req.currentUser.id, officeId: record.id } },
                update: {},
                create: { adminId: req.currentUser.id, officeId: record.id },
            });
            if (!req.currentUser.officeId) {
                await client_1.prisma.user.update({ where: { id: req.currentUser.id }, data: { officeId: record.id } });
            }
        }
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Office Location saved successfully",
            data: record,
        });
    }
    catch (error) {
        // Preserve the real error (e.g. coordinate validation messages from
        // the service) instead of masking everything as a generic failure.
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to save record");
    }
};
exports.createOfficeController = createOfficeController;
const getAllOfficeLocationController = async (req, res) => {
    try {
        if (!req.currentUser)
            throw new errors_1.BadRequestError('User not authorized');
        // undefined -> SUPER_ADMIN, no restriction, sees every office.
        // string[]  -> ADMIN, sees only offices in their merged scope
        //              (primary officeId + everything from AdminOfficeAccess).
        //              Can be [] if they have nothing assigned yet.
        const officeScope = await (0, services_1.resolveOfficeScope)(req.currentUser.role, req.currentUser.id, req.currentUser.organizationId);
        const records = await (0, services_1.getAllOfficeLocationsService)(officeScope);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Office Locations fetched successfully",
            data: records,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to fetch records");
    }
};
exports.getAllOfficeLocationController = getAllOfficeLocationController;
const getOfficeLocationController = async (req, res) => {
    try {
        const { officeId } = req.params;
        await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
        const record = await (0, services_1.getOfficeLocationByOfficeId)(officeId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Office Location fetched successfully",
            data: record,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to fetch records");
    }
};
exports.getOfficeLocationController = getOfficeLocationController;
const updateOfficeLocationController = async (req, res) => {
    try {
        const { officeId } = req.params;
        await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
        const { name, address, latitude, longitude, radius, } = req.body;
        const data = {
            name,
            address,
            latitude: parseCoordinate(latitude),
            longitude: parseCoordinate(longitude),
            radius: parseCoordinate(radius),
        };
        const record = await (0, services_1.updateOfficeLocationService)(officeId, data);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Office Location updated successfully",
            data: record,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to update record");
    }
};
exports.updateOfficeLocationController = updateOfficeLocationController;
// Shift controllers
const createShiftController = async (req, res) => {
    try {
        const { name, startTime, endTime, officeId } = req.body;
        await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
        const data = { name, startTime, endTime, officeId };
        const shift = await (0, services_1.createShiftService)(data);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Shift created successfully",
            data: shift,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to create shift");
    }
};
exports.createShiftController = createShiftController;
const getShiftsByOfficeIdController = async (req, res) => {
    try {
        const { officeId } = req.params;
        await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
        const shifts = await (0, services_1.getShiftsByOfficeIdService)(officeId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Shifts fetched successfully",
            data: shifts,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to fetch shifts");
    }
};
exports.getShiftsByOfficeIdController = getShiftsByOfficeIdController;
const updateShiftController = async (req, res) => {
    try {
        const { shiftId } = req.params;
        await (0, organization_access_1.assertShiftInOrganization)(shiftId, req.currentUser?.organizationId);
        const { name, startTime, endTime } = req.body;
        const data = { name, startTime, endTime };
        const shift = await (0, services_1.updateShiftService)(shiftId, data);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Shift updated successfully",
            data: shift,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to update shift");
    }
};
exports.updateShiftController = updateShiftController;
const deleteShiftController = async (req, res) => {
    try {
        const { shiftId } = req.params;
        await (0, organization_access_1.assertShiftInOrganization)(shiftId, req.currentUser?.organizationId);
        const shift = await (0, services_1.deleteShiftService)(shiftId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Shift deleted successfully",
            data: shift,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to delete shift");
    }
};
exports.deleteShiftController = deleteShiftController;
const assignUserToShiftController = async (req, res) => {
    try {
        const { userId, shiftId } = req.body;
        await (0, organization_access_1.assertUserInOrganization)(userId, req.currentUser?.organizationId);
        await (0, organization_access_1.assertShiftInOrganization)(shiftId, req.currentUser?.organizationId);
        const user = await (0, services_1.assignUserToShiftService)(userId, shiftId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "User assigned to shift successfully",
            data: user,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to assign user to shift");
    }
};
exports.assignUserToShiftController = assignUserToShiftController;
