"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWorkScheduleValidation = exports.getWorkScheduleValidation = exports.getUserWorkSchedulesValidation = exports.bulkUpdateWorkScheduleValidation = exports.bulkCreateWorkScheduleValidation = exports.updateWorkScheduleValidation = exports.createWorkScheduleValidation = void 0;
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
exports.createWorkScheduleValidation = [
    (0, express_validator_1.body)("userId")
        .trim()
        .notEmpty()
        .withMessage("User ID is required")
        .isUUID()
        .withMessage("Invalid User ID"),
    (0, express_validator_1.body)("officeDays")
        .isArray({ min: 1 })
        .withMessage("At least one office day is required"),
    (0, express_validator_1.body)("officeDays.*")
        .isIn(Object.values(client_1.DayOfWeek))
        .withMessage("Invalid office day"),
    (0, express_validator_1.body)("workMode")
        .notEmpty()
        .withMessage("Work mode is required")
        .isIn(Object.values(client_1.AttendanceDayStatus))
        .withMessage("Invalid work mode"),
    (0, express_validator_1.body)("effectiveFrom")
        .optional()
        .isISO8601()
        .withMessage("Effective From must be a valid date"),
];
exports.updateWorkScheduleValidation = [
    (0, express_validator_1.param)("scheduleId")
        .isUUID()
        .withMessage("Invalid Schedule ID"),
    (0, express_validator_1.body)("officeDays")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Office days must be a non-empty array"),
    (0, express_validator_1.body)("officeDays.*")
        .optional()
        .isIn(Object.values(client_1.DayOfWeek))
        .withMessage("Invalid office day"),
    (0, express_validator_1.body)("workMode")
        .optional()
        .isIn(Object.values(client_1.AttendanceDayStatus))
        .withMessage("Invalid work mode"),
    (0, express_validator_1.body)("effectiveFrom")
        .optional()
        .isISO8601()
        .withMessage("Effective From must be a valid date"),
];
/**
 * Bulk Create
 */
exports.bulkCreateWorkScheduleValidation = [
    (0, express_validator_1.body)("userIds")
        .isArray({ min: 1 })
        .withMessage("At least one user is required"),
    (0, express_validator_1.body)("userIds.*")
        .isUUID()
        .withMessage("Invalid User ID"),
    (0, express_validator_1.body)("officeDays")
        .isArray({ min: 1 })
        .withMessage("At least one office day is required"),
    (0, express_validator_1.body)("officeDays.*")
        .isIn(Object.values(client_1.DayOfWeek))
        .withMessage("Invalid office day"),
    (0, express_validator_1.body)("workMode")
        .notEmpty()
        .withMessage("Work mode is required")
        .isIn(Object.values(client_1.AttendanceDayStatus))
        .withMessage("Invalid work mode"),
    (0, express_validator_1.body)("effectiveFrom")
        .optional()
        .isISO8601()
        .withMessage("Effective From must be a valid date"),
];
/**
 * Bulk Update
 */
exports.bulkUpdateWorkScheduleValidation = [
    (0, express_validator_1.body)("userIds")
        .isArray({ min: 1 })
        .withMessage("At least one user is required"),
    (0, express_validator_1.body)("userIds.*")
        .isUUID()
        .withMessage("Invalid User ID"),
    (0, express_validator_1.body)("officeDays")
        .optional()
        .isArray({ min: 1 })
        .withMessage("Office days must be a non-empty array"),
    (0, express_validator_1.body)("officeDays.*")
        .optional()
        .isIn(Object.values(client_1.DayOfWeek))
        .withMessage("Invalid office day"),
    (0, express_validator_1.body)("workMode")
        .optional()
        .isIn(Object.values(client_1.AttendanceDayStatus))
        .withMessage("Invalid work mode"),
    (0, express_validator_1.body)("effectiveFrom")
        .optional()
        .isISO8601()
        .withMessage("Effective From must be a valid date"),
];
exports.getUserWorkSchedulesValidation = [
    (0, express_validator_1.param)("userId")
        .isUUID()
        .withMessage("Invalid User ID"),
];
exports.getWorkScheduleValidation = [
    (0, express_validator_1.param)("scheduleId")
        .isUUID()
        .withMessage("Invalid Schedule ID"),
];
exports.deleteWorkScheduleValidation = [
    (0, express_validator_1.param)("scheduleId")
        .isUUID()
        .withMessage("Invalid Schedule ID"),
];
