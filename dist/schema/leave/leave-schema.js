"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectLeaveRequestValidation = exports.approveLeaveRequestValidation = exports.getAllLeaveRequestsValidation = exports.getLeaveRequestValidation = exports.createLeaveRequestValidation = void 0;
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
exports.createLeaveRequestValidation = [
    (0, express_validator_1.body)("startDate")
        .notEmpty()
        .withMessage("Start date is required")
        .isISO8601()
        .withMessage("Start date must be a valid date"),
    (0, express_validator_1.body)("endDate")
        .notEmpty()
        .withMessage("End date is required")
        .isISO8601()
        .withMessage("End date must be a valid date"),
    (0, express_validator_1.body)("leaveType")
        .notEmpty()
        .withMessage("Leave type is required")
        .isIn(Object.values(client_1.LeaveType))
        .withMessage("Invalid leave type"),
    (0, express_validator_1.body)("reason")
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Reason cannot exceed 1000 characters"),
];
exports.getLeaveRequestValidation = [
    (0, express_validator_1.param)("leaveId")
        .isUUID()
        .withMessage("Invalid Leave Request ID"),
];
exports.getAllLeaveRequestsValidation = [
    (0, express_validator_1.query)("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be greater than 0"),
    (0, express_validator_1.query)("limit")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Limit must be greater than 0"),
    (0, express_validator_1.query)("status")
        .optional()
        .isIn(Object.values(client_1.LeaveStatus))
        .withMessage("Invalid leave status"),
    (0, express_validator_1.query)("leaveType")
        .optional()
        .isIn(Object.values(client_1.LeaveType))
        .withMessage("Invalid leave type"),
    (0, express_validator_1.query)("officeId")
        .optional()
        .isUUID()
        .withMessage("Invalid Office ID"),
    (0, express_validator_1.query)("search")
        .optional()
        .trim(),
];
exports.approveLeaveRequestValidation = [
    (0, express_validator_1.param)("leaveId")
        .isUUID()
        .withMessage("Invalid Leave Request ID"),
];
exports.rejectLeaveRequestValidation = [
    (0, express_validator_1.param)("leaveId")
        .isUUID()
        .withMessage("Invalid Leave Request ID"),
    (0, express_validator_1.body)("rejectionReason")
        .trim()
        .notEmpty()
        .withMessage("Rejection reason is required")
        .isLength({ max: 1000 })
        .withMessage("Rejection reason cannot exceed 1000 characters"),
];
