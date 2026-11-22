"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQRTokenSchema = exports.updateOfficeSchema = exports.createOfficeSchema = exports.resetUserDeviceSchema = exports.updateAttendanceStatusSchema = exports.manualAttendanceSchema = exports.scanAttendanceSchema = exports.getAttendanceQuerySchema = void 0;
const express_validator_1 = require("express-validator");
const getAttendanceQuerySchema = () => {
    return [
        (0, express_validator_1.query)("page")
            .optional({ values: "falsy" })
            .isInt({ min: 1 })
            .withMessage("Page must be an integer greater than 0"),
        (0, express_validator_1.query)("limit")
            .optional({ values: "falsy" })
            .isInt({ min: 1 })
            .withMessage("Limit must be an integer greater than 0"),
        (0, express_validator_1.query)("filterByDate")
            // Frontends commonly serialize an unselected filter as
            // `filterByDate=`. Treat that the same as the query parameter being
            // absent instead of rejecting an otherwise valid attendance request.
            .optional({ values: "falsy" })
            .isIn(["today", "range"])
            .withMessage("filterByDate must be either 'today' or 'range'"),
        (0, express_validator_1.query)("startDate")
            .if((0, express_validator_1.query)("filterByDate").equals("range"))
            .notEmpty()
            .withMessage("startDate is required when filterByDate is 'range'")
            .isISO8601()
            .withMessage("startDate must be a valid ISO 8601 date"),
        (0, express_validator_1.query)("endDate")
            .if((0, express_validator_1.query)("filterByDate").equals("range"))
            .notEmpty()
            .withMessage("endDate is required when filterByDate is 'range'")
            .isISO8601()
            .withMessage("endDate must be a valid ISO 8601 date"),
        (0, express_validator_1.query)("search")
            .optional({ values: "falsy" })
            .isString()
            .withMessage("search must be a string"),
        (0, express_validator_1.query)("officeId")
            .optional({ values: "falsy" })
            .custom((value) => {
            const items = Array.isArray(value) ? value : String(value || "").split(",");
            if (items.length === 0 || (items.length === 1 && !items[0].trim())) {
                return true;
            }
            for (const item of items) {
                const normalized = String(item).trim();
                if (!normalized)
                    continue;
                const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(normalized);
                if (!isValidUuid) {
                    throw new Error("officeId must be a valid UUID");
                }
            }
            return true;
        })
            .withMessage("officeId must be a valid UUID"),
    ];
};
exports.getAttendanceQuerySchema = getAttendanceQuerySchema;
// Body validation for POST / (scanAttendanceController).
// Requires the QR token, the scanning user, live device coordinates,
// and a deviceId — coordinates feed the geofence check, deviceId feeds
// the device-binding check (validateAndBindDevice), and both must be
// present and valid before the request reaches the service layer.
const scanAttendanceSchema = () => {
    return [
        (0, express_validator_1.body)("token")
            .notEmpty()
            .withMessage("token is required")
            .isString()
            .withMessage("token must be a string"),
        (0, express_validator_1.body)("userId")
            .notEmpty()
            .withMessage("userId is required")
            .isUUID()
            .withMessage("userId must be a valid UUID"),
        (0, express_validator_1.body)("userLat")
            .notEmpty()
            .withMessage("userLat is required")
            .isFloat({ min: -90, max: 90 })
            .withMessage("userLat must be a number between -90 and 90"),
        (0, express_validator_1.body)("userLng")
            .notEmpty()
            .withMessage("userLng is required")
            .isFloat({ min: -180, max: 180 })
            .withMessage("userLng must be a number between -180 and 180"),
        (0, express_validator_1.body)("deviceId")
            .notEmpty()
            .withMessage("deviceId is required")
            .isString()
            .withMessage("deviceId must be a string")
            .isLength({ min: 8, max: 255 })
            .withMessage("deviceId looks invalid"),
    ];
};
exports.scanAttendanceSchema = scanAttendanceSchema;
// Body validation for POST /manual (manualAttendanceController).
const manualAttendanceSchema = () => {
    return [
        (0, express_validator_1.body)("userId")
            .notEmpty()
            .withMessage("userId is required")
            .isUUID()
            .withMessage("userId must be a valid UUID"),
        (0, express_validator_1.body)("type")
            .notEmpty()
            .withMessage("type is required")
            .isIn(["CHECK_IN", "CHECK_OUT"])
            .withMessage("type must be either 'CHECK_IN' or 'CHECK_OUT'"),
        (0, express_validator_1.body)("officeId")
            .notEmpty()
            .withMessage("officeId is required")
            .isUUID()
            .withMessage("officeId must be a valid UUID"),
    ];
};
exports.manualAttendanceSchema = manualAttendanceSchema;
// Body validation for PUT /status/:attendanceId (updateAttendanceStatusController).
const updateAttendanceStatusSchema = () => {
    return [
        (0, express_validator_1.body)("status")
            .notEmpty()
            .withMessage("status is required")
            .isIn([
            "NOT_CLOCKED_IN",
            "ON_TIME",
            "EARLY",
            "LATE",
            "ABSENT",
            "TRAVELED",
            "NOT_AVAILABLE",
            "WFH",
            "ON_LEAVE",
        ])
            .withMessage("status must be a valid AttendanceStatus value"),
    ];
};
exports.updateAttendanceStatusSchema = updateAttendanceStatusSchema;
// Param validation for POST /:userId/reset-device (resetUserDeviceController).
const resetUserDeviceSchema = () => {
    return [
        (0, express_validator_1.param)("userId")
            .notEmpty()
            .withMessage("userId is required")
            .isUUID()
            .withMessage("userId must be a valid UUID"),
    ];
};
exports.resetUserDeviceSchema = resetUserDeviceSchema;
const createOfficeSchema = () => {
    return [
        (0, express_validator_1.body)("name")
            .notEmpty()
            .withMessage("name is required")
            .isString()
            .withMessage("name must be a string"),
        (0, express_validator_1.body)("address")
            .notEmpty()
            .withMessage("address is required")
            .isString()
            .withMessage("address must be a string"),
        (0, express_validator_1.body)("latitude")
            .optional({ nullable: true })
            .isFloat({ min: -90, max: 90 })
            .withMessage("latitude must be a number between -90 and 90"),
        (0, express_validator_1.body)("longitude")
            .optional({ nullable: true })
            .isFloat({ min: -180, max: 180 })
            .withMessage("longitude must be a number between -180 and 180"),
        (0, express_validator_1.body)("radius")
            .optional({ nullable: true })
            .isFloat({ gt: 0 })
            .withMessage("radius must be a positive number of meters"),
    ];
};
exports.createOfficeSchema = createOfficeSchema;
// Body validation for PUT /:officeId (updateOfficeLocationController).
// Same rules as create, but every field is optional since it's a
// partial update.
const updateOfficeSchema = () => {
    return [
        (0, express_validator_1.body)("name")
            .optional()
            .isString()
            .withMessage("name must be a string"),
        (0, express_validator_1.body)("address")
            .optional()
            .isString()
            .withMessage("address must be a string"),
        (0, express_validator_1.body)("latitude")
            .optional({ nullable: true })
            .isFloat({ min: -90, max: 90 })
            .withMessage("latitude must be a number between -90 and 90"),
        (0, express_validator_1.body)("longitude")
            .optional({ nullable: true })
            .isFloat({ min: -180, max: 180 })
            .withMessage("longitude must be a number between -180 and 180"),
        (0, express_validator_1.body)("radius")
            .optional({ nullable: true })
            .isFloat({ gt: 0 })
            .withMessage("radius must be a positive number of meters"),
    ];
};
exports.updateOfficeSchema = updateOfficeSchema;
// Body validation for POST / (generateQRTOkenController).
const createQRTokenSchema = () => {
    return [
        (0, express_validator_1.body)("officeId")
            .notEmpty()
            .withMessage("officeId is required")
            .isUUID()
            .withMessage("officeId must be a valid UUID"),
        (0, express_validator_1.body)("type")
            .notEmpty()
            .withMessage("type is required")
            .isIn(["CHECK_IN", "CHECK_OUT"])
            .withMessage("type must be either 'CHECK_IN' or 'CHECK_OUT'"),
    ];
};
exports.createQRTokenSchema = createQRTokenSchema;
