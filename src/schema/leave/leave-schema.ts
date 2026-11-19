import { body, param, query } from "express-validator";
import { LeaveStatus, LeaveType } from "@prisma/client";

export const createLeaveRequestValidation = [
  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date"),

  body("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date"),

  body("leaveType")
    .notEmpty()
    .withMessage("Leave type is required")
    .isIn(Object.values(LeaveType))
    .withMessage("Invalid leave type"),

  body("reason")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason cannot exceed 1000 characters"),
];

export const getLeaveRequestValidation = [
  param("leaveId")
    .isUUID()
    .withMessage("Invalid Leave Request ID"),
];

export const getAllLeaveRequestsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be greater than 0"),

  query("limit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Limit must be greater than 0"),

  query("status")
    .optional()
    .isIn(Object.values(LeaveStatus))
    .withMessage("Invalid leave status"),

  query("leaveType")
    .optional()
    .isIn(Object.values(LeaveType))
    .withMessage("Invalid leave type"),

  query("officeId")
    .optional()
    .isUUID()
    .withMessage("Invalid Office ID"),

  query("search")
    .optional()
    .trim(),
];

export const approveLeaveRequestValidation = [
  param("leaveId")
    .isUUID()
    .withMessage("Invalid Leave Request ID"),
];

export const rejectLeaveRequestValidation = [
  param("leaveId")
    .isUUID()
    .withMessage("Invalid Leave Request ID"),

  body("rejectionReason")
    .trim()
    .notEmpty()
    .withMessage("Rejection reason is required")
    .isLength({ max: 1000 })
    .withMessage("Rejection reason cannot exceed 1000 characters"),
];