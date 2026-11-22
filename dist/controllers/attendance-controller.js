"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAttendanceStatusController = exports.getDashboardStatsController = exports.getAttendanceSummary = exports.getOfficeAttendanceSummary = exports.getUserAttendancesController = exports.getAttendancesController = exports.resetUserDeviceController = exports.manualAttendanceController = exports.scanAttendanceController = void 0;
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const client_1 = require("@prisma/client");
const services_1 = require("../services");
const organization_access_1 = require("../helpers/organization-access");
const getAttendanceOfficeScope = async (req) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (req.currentUser.role === client_1.Role.SUPER_ADMIN) {
        const officeIds = await (0, organization_access_1.getOrganizationOfficeIds)(req.currentUser.organizationId);
        if (officeIds !== undefined && officeIds.length === 0) {
            throw new errors_1.ForbiddenError("No offices are available in this organization yet");
        }
        return officeIds;
    }
    if (req.currentUser.role !== client_1.Role.ADMIN)
        throw new errors_1.ForbiddenError();
    const officeIds = await (0, services_1.getAdminOfficeIds)(req.currentUser.id);
    if (!officeIds.length) {
        throw new errors_1.ForbiddenError("No offices assigned to this admin");
    }
    return officeIds;
};
const assertOfficeInScope = (officeId, officeIds) => {
    if (officeIds !== undefined && !officeIds.includes(officeId)) {
        throw new errors_1.ForbiddenError("You do not have access to this office");
    }
};
const normalizeOfficeIds = (value) => {
    const rawValues = Array.isArray(value) ? value : [value];
    return rawValues
        .flatMap((entry) => {
        if (typeof entry !== "string")
            return [];
        return entry
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    })
        .filter((entry, index, arr) => entry && arr.indexOf(entry) === index);
};
const scanAttendanceController = async (req, res) => {
    const { token, userId, userLat, userLng, deviceId } = req.body;
    const parsedLat = userLat !== undefined && userLat !== null ? parseFloat(userLat) : undefined;
    const parsedLng = userLng !== undefined && userLng !== null ? parseFloat(userLng) : undefined;
    if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
        throw new errors_1.BadRequestError("deviceId is required to clock in/out.");
    }
    const record = await (0, services_1.handleAttendanceService)(token, userId, parsedLat, parsedLng, deviceId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance saved successfully",
        data: record,
    });
};
exports.scanAttendanceController = scanAttendanceController;
const manualAttendanceController = async (req, res) => {
    const { userId, type, officeId } = req.body;
    const officeIds = await getAttendanceOfficeScope(req);
    assertOfficeInScope(officeId, officeIds);
    await (0, organization_access_1.assertUserInOrganization)(userId, req.currentUser?.organizationId);
    const record = await (0, services_1.manualAttendanceService)(userId, type, officeId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance saved successfully",
        data: record,
    });
};
exports.manualAttendanceController = manualAttendanceController;
// Admin-only: unbind a user's device from the account (e.g. lost/broken
// phone). Their next clock-in from a new device will bind fresh. There
// is no self-service or automatic version of this — see
// resetUserDeviceService for why.
const resetUserDeviceController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (req.currentUser.role !== client_1.Role.ADMIN &&
        req.currentUser.role !== client_1.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    const { userId } = req.params;
    if (!userId)
        throw new errors_1.BadRequestError("Invalid userId");
    const officeIds = await getAttendanceOfficeScope(req);
    const user = await (0, services_1.getUserByIdService)(userId);
    if (!user?.officeId)
        throw new errors_1.BadRequestError("User has no office assigned");
    await (0, organization_access_1.assertUserInOrganization)(userId, req.currentUser.organizationId);
    assertOfficeInScope(user.officeId, officeIds);
    const updatedUser = await (0, services_1.resetUserDeviceService)(userId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Device reset successfully. The user can bind a new device on their next clock-in.",
        data: updatedUser,
    });
};
exports.resetUserDeviceController = resetUserDeviceController;
const getAttendancesController = async (req, res) => {
    try {
        const { page, limit, filterByDate, startDate, endDate, search, officeId: queryOfficeId, } = req.query;
        if (!req.currentUser)
            throw new errors_1.BadRequestError("User not authorized");
        const officeIds = await getAttendanceOfficeScope(req);
        const selectedOfficeIds = normalizeOfficeIds(queryOfficeId);
        selectedOfficeIds.forEach((id) => assertOfficeInScope(id, officeIds));
        if (req.currentUser.role === client_1.Role.SUPER_ADMIN &&
            selectedOfficeIds.length > 0) {
            const records = await (0, services_1.getAllAttendanceRecordsService)({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                filterByDate: filterByDate,
                startDate: startDate,
                endDate: endDate,
                officeIds: selectedOfficeIds,
                search: search,
            });
            (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
                message: "Attendance Records",
                data: records,
            });
            return;
        }
        const records = await (0, services_1.getAllAttendanceRecordsService)({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 10,
            filterByDate: filterByDate,
            startDate: startDate,
            endDate: endDate,
            officeIds,
            search: search,
        });
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Attendance Records",
            data: records,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError)
            throw error;
        throw new errors_1.BadRequestError("Failed to get record");
    }
};
exports.getAttendancesController = getAttendancesController;
const getUserAttendancesController = async (req, res) => {
    const { userId } = req.params;
    if (!userId)
        throw new errors_1.BadRequestError("Invalid userId");
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (req.currentUser.role === client_1.Role.AGENT && req.currentUser.id !== userId) {
        throw new errors_1.ForbiddenError();
    }
    const officeIds = req.currentUser.role === client_1.Role.AGENT
        ? undefined
        : await getAttendanceOfficeScope(req);
    await (0, organization_access_1.assertUserInOrganization)(userId, req.currentUser.organizationId);
    const user = await (0, services_1.getUserByIdService)(userId);
    if (!user)
        throw new errors_1.BadRequestError("User not found");
    assertOfficeInScope(user.officeId ?? "", officeIds);
    const { page, limit, filterByDate, startDate, endDate, search } = req.query;
    const records = await (0, services_1.getUserAllAttendanceRecordsService)(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        filterByDate: filterByDate,
        startDate: startDate,
        endDate: endDate,
        search: search,
        officeIds,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance Records",
        data: records,
    });
};
exports.getUserAttendancesController = getUserAttendancesController;
const getOfficeAttendanceSummary = async (req, res) => {
    const { officeId } = req.params;
    if (!officeId)
        throw new errors_1.BadRequestError("Invalid officeId");
    const requestedOfficeIds = normalizeOfficeIds(officeId);
    if (requestedOfficeIds.length === 0)
        throw new errors_1.BadRequestError("Invalid officeId");
    const officeIds = await getAttendanceOfficeScope(req);
    requestedOfficeIds.forEach((id) => assertOfficeInScope(id, officeIds));
    for (const id of requestedOfficeIds) {
        const office = await (0, services_1.getOfficeLocationByOfficeId)(id);
        if (!office)
            throw new errors_1.BadRequestError(`Invalid officeId: ${id}`);
    }
    const { startDate, endDate, page, limit, search, status } = req.query;
    const data = await (0, services_1.getOfficeUsersWithAttendance)(requestedOfficeIds, {
        startDate: startDate,
        endDate: endDate,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search: search,
        status: status,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance Records",
        data,
    });
};
exports.getOfficeAttendanceSummary = getOfficeAttendanceSummary;
const getAttendanceSummary = async (req, res) => {
    const { startDate, filterByDate, endDate, page, limit, search } = req.query;
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    const officeIds = await getAttendanceOfficeScope(req);
    // ^ this resolves ALL offices the admin is assigned to
    //   (primary officeId + every AdminOfficeAccess row), fresh from the DB
    const data = await (0, services_1.getUsersWithAttendance)({
        startDate: startDate,
        endDate: endDate,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        officeIds,
        search: search,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance Records",
        data,
    });
};
exports.getAttendanceSummary = getAttendanceSummary;
const getDashboardStatsController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    let officeIds = await getAttendanceOfficeScope(req);
    const selectedOfficeIds = normalizeOfficeIds(req.query.officeId);
    if (req.currentUser.role === client_1.Role.SUPER_ADMIN &&
        selectedOfficeIds.length > 0) {
        selectedOfficeIds.forEach((id) => assertOfficeInScope(id, officeIds));
        officeIds = selectedOfficeIds;
    }
    const { startDate, endDate } = req.query;
    const stats = await (0, services_1.getDashboardStatsService)(officeIds, startDate, endDate);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Dashboard statistics retrieved successfully",
        data: stats,
    });
};
exports.getDashboardStatsController = getDashboardStatsController;
const updateAttendanceStatusController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    // Only allow admins and super admins to update status
    if (req.currentUser.role !== client_1.Role.ADMIN &&
        req.currentUser.role !== client_1.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    const { attendanceId } = req.params;
    const { status } = req.body;
    if (!attendanceId)
        throw new errors_1.BadRequestError("Invalid attendanceId");
    if (!status)
        throw new errors_1.BadRequestError("Status is required");
    const officeIds = await getAttendanceOfficeScope(req);
    const updatedRecord = await (0, services_1.updateAttendanceStatusService)(attendanceId, status, officeIds);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Attendance status updated successfully",
        data: updatedRecord,
    });
};
exports.updateAttendanceStatusController = updateAttendanceStatusController;
