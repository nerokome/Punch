"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectLeaveRequestController = exports.approveLeaveRequestController = exports.getLeaveRequestsController = exports.getLeaveRequestController = exports.getMyLeaveRequestsController = exports.createLeaveRequestController = void 0;
const http_status_codes_1 = require("http-status-codes");
const client_1 = require("@prisma/client");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const organization_access_1 = require("../helpers/organization-access");
const services_1 = require("../services");
const createLeaveRequestController = async (req, res) => {
    if (!req.currentUser) {
        throw new errors_1.BadRequestError("User not authorized");
    }
    const { startDate, endDate, leaveType, reason } = req.body;
    const leave = await (0, services_1.createLeaveRequestService)(req.currentUser.id, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        leaveType,
        reason,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: "Leave request submitted successfully",
        data: leave,
    });
};
exports.createLeaveRequestController = createLeaveRequestController;
const getMyLeaveRequestsController = async (req, res) => {
    if (!req.currentUser) {
        throw new errors_1.BadRequestError("User not authorized");
    }
    const data = await (0, services_1.getUserLeaveRequestsService)(req.currentUser.id);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Leave requests retrieved successfully",
        data,
    });
};
exports.getMyLeaveRequestsController = getMyLeaveRequestsController;
const getLeaveRequestController = async (req, res) => {
    const { leaveId } = req.params;
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    const data = await (0, services_1.getLeaveRequestByIdService)(leaveId);
    await (0, organization_access_1.assertUserInOrganization)(data.employee.id, req.currentUser.organizationId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Leave request retrieved successfully",
        data,
    });
};
exports.getLeaveRequestController = getLeaveRequestController;
const getLeaveRequestsController = async (req, res) => {
    if (!req.currentUser) {
        throw new errors_1.BadRequestError("User not authorized");
    }
    let officeFilter;
    let officeScope;
    if (req.currentUser.role === client_1.Role.ADMIN) {
        officeScope = await (0, services_1.getAdminOfficeIds)(req.currentUser.id);
        if (!officeScope.length) {
            throw new errors_1.ForbiddenError("No offices assigned to this admin");
        }
    }
    if (req.currentUser.role === client_1.Role.SUPER_ADMIN && req.currentUser.organizationId) {
        officeScope = await (0, organization_access_1.getOrganizationOfficeIds)(req.currentUser.organizationId);
        if (req.query.officeId && typeof req.query.officeId === "string") {
            await (0, organization_access_1.assertOfficeInOrganization)(req.query.officeId, req.currentUser.organizationId);
            officeScope = [req.query.officeId];
        }
    }
    if (req.currentUser.role === client_1.Role.SUPER_ADMIN &&
        req.query.officeId &&
        typeof req.query.officeId === "string") {
        officeFilter = req.query.officeId;
    }
    const { page, limit, status, leaveType, search } = req.query;
    const data = await (0, services_1.getAllLeaveRequestsService)({
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        status: status,
        leaveType: leaveType,
        search: search,
        officeId: officeFilter,
        officeIds: officeScope,
        organizationId: req.currentUser.organizationId,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Leave requests retrieved successfully",
        data,
    });
};
exports.getLeaveRequestsController = getLeaveRequestsController;
const approveLeaveRequestController = async (req, res) => {
    if (!req.currentUser) {
        throw new errors_1.BadRequestError("User not authorized");
    }
    if (req.currentUser.role !== client_1.Role.ADMIN &&
        req.currentUser.role !== client_1.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    const { leaveId } = req.params;
    const leave = await (0, services_1.getLeaveRequestByIdService)(leaveId);
    await (0, organization_access_1.assertUserInOrganization)(leave.employee.id, req.currentUser.organizationId);
    const data = await (0, services_1.approveLeaveRequestService)(leaveId, req.currentUser.id);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Leave request approved successfully",
        data,
    });
};
exports.approveLeaveRequestController = approveLeaveRequestController;
const rejectLeaveRequestController = async (req, res) => {
    if (!req.currentUser) {
        throw new errors_1.BadRequestError("User not authorized");
    }
    if (req.currentUser.role !== client_1.Role.ADMIN &&
        req.currentUser.role !== client_1.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    const { leaveId } = req.params;
    const leave = await (0, services_1.getLeaveRequestByIdService)(leaveId);
    await (0, organization_access_1.assertUserInOrganization)(leave.employee.id, req.currentUser.organizationId);
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
        throw new errors_1.BadRequestError("Rejection reason is required");
    }
    const data = await (0, services_1.rejectLeaveRequestService)(leaveId, req.currentUser.id, rejectionReason);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Leave request rejected successfully",
        data,
    });
};
exports.rejectLeaveRequestController = rejectLeaveRequestController;
