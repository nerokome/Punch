import { body, param } from "express-validator";
import {
  AttendanceDayStatus,
  DayOfWeek,
} from "@prisma/client";

export const createWorkScheduleValidation = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required")
    .isUUID()
    .withMessage("Invalid User ID"),

  body("officeDays")
    .isArray({ min: 1 })
    .withMessage("At least one office day is required"),

  body("officeDays.*")
    .isIn(Object.values(DayOfWeek))
    .withMessage("Invalid office day"),

  body("workMode")
    .notEmpty()
    .withMessage("Work mode is required")
    .isIn(Object.values(AttendanceDayStatus))
    .withMessage("Invalid work mode"),

  body("effectiveFrom")
    .optional()
    .isISO8601()
    .withMessage("Effective From must be a valid date"),
];

export const updateWorkScheduleValidation = [
  param("scheduleId")
    .isUUID()
    .withMessage("Invalid Schedule ID"),

  body("officeDays")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Office days must be a non-empty array"),

  body("officeDays.*")
    .optional()
    .isIn(Object.values(DayOfWeek))
    .withMessage("Invalid office day"),

  body("workMode")
    .optional()
    .isIn(Object.values(AttendanceDayStatus))
    .withMessage("Invalid work mode"),

  body("effectiveFrom")
    .optional()
    .isISO8601()
    .withMessage("Effective From must be a valid date"),
];

/**
 * Bulk Create
 */
export const bulkCreateWorkScheduleValidation = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("At least one user is required"),

  body("userIds.*")
    .isUUID()
    .withMessage("Invalid User ID"),

  body("officeDays")
    .isArray({ min: 1 })
    .withMessage("At least one office day is required"),

  body("officeDays.*")
    .isIn(Object.values(DayOfWeek))
    .withMessage("Invalid office day"),

  body("workMode")
    .notEmpty()
    .withMessage("Work mode is required")
    .isIn(Object.values(AttendanceDayStatus))
    .withMessage("Invalid work mode"),

  body("effectiveFrom")
    .optional()
    .isISO8601()
    .withMessage("Effective From must be a valid date"),
];

/**
 * Bulk Update
 */
export const bulkUpdateWorkScheduleValidation = [
  body("userIds")
    .isArray({ min: 1 })
    .withMessage("At least one user is required"),

  body("userIds.*")
    .isUUID()
    .withMessage("Invalid User ID"),

  body("officeDays")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Office days must be a non-empty array"),

  body("officeDays.*")
    .optional()
    .isIn(Object.values(DayOfWeek))
    .withMessage("Invalid office day"),

  body("workMode")
    .optional()
    .isIn(Object.values(AttendanceDayStatus))
    .withMessage("Invalid work mode"),

  body("effectiveFrom")
    .optional()
    .isISO8601()
    .withMessage("Effective From must be a valid date"),
];

export const getUserWorkSchedulesValidation = [
  param("userId")
    .isUUID()
    .withMessage("Invalid User ID"),
];

export const getWorkScheduleValidation = [
  param("scheduleId")
    .isUUID()
    .withMessage("Invalid Schedule ID"),
];

export const deleteWorkScheduleValidation = [
  param("scheduleId")
    .isUUID()
    .withMessage("Invalid Schedule ID"),
];