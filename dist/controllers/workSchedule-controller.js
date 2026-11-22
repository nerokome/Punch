"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateWorkScheduleController = exports.bulkCreateWorkScheduleController = exports.deleteWorkScheduleController = exports.getWorkScheduleByIdController = exports.getUserWorkSchedulesController = exports.getAllWorkSchedulesController = exports.updateWorkScheduleController = exports.createWorkScheduleController = void 0;
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const organization_access_1 = require("../helpers/organization-access");
const services_1 = require("../services");
/**
 * Create Work Schedule
 */
const createWorkScheduleController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const { userId, officeDays, workMode, effectiveFrom, } = req.body;
        const schedule = await (0, services_1.createWorkScheduleService)(req.currentUser, {
            userId,
            officeDays,
            workMode,
            effectiveFrom,
        });
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
            message: "Work schedule created successfully",
            data: schedule,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to create work schedule");
    }
};
exports.createWorkScheduleController = createWorkScheduleController;
/**
 * Update Work Schedule
 */
const updateWorkScheduleController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const { scheduleId } = req.params;
        const { officeDays, workMode, effectiveFrom, } = req.body;
        const schedule = await (0, services_1.updateWorkScheduleService)(req.currentUser, scheduleId, {
            officeDays,
            workMode,
            effectiveFrom,
        });
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Work schedule updated successfully",
            data: schedule,
        });
    }
    catch (error) {
        console.error("UPDATE WORK SCHEDULE ERROR:", error);
        if (error instanceof errors_1.BadRequestError ||
            error.name === "ForbiddenError") {
            throw error;
        }
        throw new errors_1.BadRequestError(error?.message || "Failed to update work schedule");
    }
};
exports.updateWorkScheduleController = updateWorkScheduleController;
/**
 * Get All Work Schedules
 */
const getAllWorkSchedulesController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const schedules = await (0, services_1.getAllWorkSchedulesService)(req.currentUser);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Work schedules fetched successfully",
            data: schedules,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to fetch work schedules");
    }
};
exports.getAllWorkSchedulesController = getAllWorkSchedulesController;
/**
 * Get User Work Schedules
 */
const getUserWorkSchedulesController = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!req.currentUser)
            throw new errors_1.BadRequestError("User not authorized");
        await (0, organization_access_1.assertUserInOrganization)(userId, req.currentUser.organizationId);
        const schedules = await (0, services_1.getUserWorkSchedulesService)(userId, req.currentUser.organizationId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "User work schedules fetched successfully",
            data: schedules,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to fetch user work schedules");
    }
};
exports.getUserWorkSchedulesController = getUserWorkSchedulesController;
/**
 * Get Single Work Schedule
 */
const getWorkScheduleByIdController = async (req, res) => {
    try {
        const { scheduleId } = req.params;
        if (!req.currentUser)
            throw new errors_1.BadRequestError("User not authorized");
        const schedule = await (0, services_1.getWorkScheduleByIdService)(scheduleId, req.currentUser.organizationId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Work schedule fetched successfully",
            data: schedule,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to fetch work schedule");
    }
};
exports.getWorkScheduleByIdController = getWorkScheduleByIdController;
/**
 * Delete Work Schedule
 */
const deleteWorkScheduleController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const { scheduleId } = req.params;
        const schedule = await (0, services_1.deleteWorkScheduleService)(req.currentUser, scheduleId);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Work schedule deleted successfully",
            data: schedule,
        });
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to delete work schedule");
    }
};
exports.deleteWorkScheduleController = deleteWorkScheduleController;
/**
 * Bulk Create Work Schedules
 */
const bulkCreateWorkScheduleController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const { userIds, officeDays, workMode, effectiveFrom, } = req.body;
        const schedules = await (0, services_1.bulkCreateWorkScheduleService)(req.currentUser, {
            userIds,
            officeDays,
            workMode,
            effectiveFrom,
        });
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
            message: "Work schedules created successfully",
            data: schedules,
        });
    }
    catch (error) {
        console.error("BULK CREATE WORK SCHEDULE ERROR:", error);
        if (error instanceof errors_1.BadRequestError ||
            error.name === "ForbiddenError") {
            throw error;
        }
        throw new errors_1.BadRequestError(error?.message || "Failed to create work schedules");
    }
};
exports.bulkCreateWorkScheduleController = bulkCreateWorkScheduleController;
/**
 * Bulk Update Work Schedules
 */
const bulkUpdateWorkScheduleController = async (req, res) => {
    try {
        if (!req.currentUser) {
            throw new errors_1.BadRequestError("User not authorized");
        }
        const { userIds, officeDays, workMode, effectiveFrom, } = req.body;
        const schedules = await (0, services_1.bulkUpdateWorkScheduleService)(req.currentUser, {
            userIds,
            officeDays,
            workMode,
            effectiveFrom,
        });
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "Work schedules updated successfully",
            data: schedules,
        });
    }
    catch (error) {
        console.error("BULK UPDATE WORK SCHEDULE ERROR:", error);
        if (error instanceof errors_1.BadRequestError ||
            error.name === "ForbiddenError") {
            throw error;
        }
        throw new errors_1.BadRequestError(error?.message || "Failed to update work schedules");
    }
};
exports.bulkUpdateWorkScheduleController = bulkUpdateWorkScheduleController;
