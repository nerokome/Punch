import { body, param, query } from "express-validator";

export const getAttendanceQuerySchema = () => {
  return [
    query("page")
      .optional({ values: "falsy" })
      .isInt({ min: 1 })
      .withMessage("Page must be an integer greater than 0"),

    query("limit")
      .optional({ values: "falsy" })
      .isInt({ min: 1 })
      .withMessage("Limit must be an integer greater than 0"),

    query("filterByDate")
      // Frontends commonly serialize an unselected filter as
      // `filterByDate=`. Treat that the same as the query parameter being
      // absent instead of rejecting an otherwise valid attendance request.
      .optional({ values: "falsy" })
      .isIn(["today", "range"])
      .withMessage("filterByDate must be either 'today' or 'range'"),

    query("startDate")
      .if(query("filterByDate").equals("range"))
      .notEmpty()
      .withMessage("startDate is required when filterByDate is 'range'")
      .isISO8601()
      .withMessage("startDate must be a valid ISO 8601 date"),

    query("endDate")
      .if(query("filterByDate").equals("range"))
      .notEmpty()
      .withMessage("endDate is required when filterByDate is 'range'")
      .isISO8601()
      .withMessage("endDate must be a valid ISO 8601 date"),

    query("search")
      .optional({ values: "falsy" })
      .isString()
      .withMessage("search must be a string"),

    query("officeId")
      .optional({ values: "falsy" })
      .custom((value) => {
        const items = Array.isArray(value) ? value : String(value || "").split(",");

        if (items.length === 0 || (items.length === 1 && !items[0].trim())) {
          return true;
        }

        for (const item of items) {
          const normalized = String(item).trim();
          if (!normalized) continue;

          const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
            normalized,
          );

          if (!isValidUuid) {
            throw new Error("officeId must be a valid UUID");
          }
        }

        return true;
      })
      .withMessage("officeId must be a valid UUID"),
  ];
};

// Body validation for POST / (scanAttendanceController).
// Requires the QR token, the scanning user, live device coordinates,
// and a deviceId — coordinates feed the geofence check, deviceId feeds
// the device-binding check (validateAndBindDevice), and both must be
// present and valid before the request reaches the service layer.
export const scanAttendanceSchema = () => {
  return [
    body("token")
      .notEmpty()
      .withMessage("token is required")
      .isString()
      .withMessage("token must be a string"),

    body("userId")
      .notEmpty()
      .withMessage("userId is required")
      .isUUID()
      .withMessage("userId must be a valid UUID"),

    body("userLat")
      .notEmpty()
      .withMessage("userLat is required")
      .isFloat({ min: -90, max: 90 })
      .withMessage("userLat must be a number between -90 and 90"),

    body("userLng")
      .notEmpty()
      .withMessage("userLng is required")
      .isFloat({ min: -180, max: 180 })
      .withMessage("userLng must be a number between -180 and 180"),

    body("deviceId")
      .notEmpty()
      .withMessage("deviceId is required")
      .isString()
      .withMessage("deviceId must be a string")
      .isLength({ min: 8, max: 255 })
      .withMessage("deviceId looks invalid"),
  ];
};

// Body validation for POST /manual (manualAttendanceController).
export const manualAttendanceSchema = () => {
  return [
    body("userId")
      .notEmpty()
      .withMessage("userId is required")
      .isUUID()
      .withMessage("userId must be a valid UUID"),

    body("type")
      .notEmpty()
      .withMessage("type is required")
      .isIn(["CHECK_IN", "CHECK_OUT"])
      .withMessage("type must be either 'CHECK_IN' or 'CHECK_OUT'"),

    body("officeId")
      .notEmpty()
      .withMessage("officeId is required")
      .isUUID()
      .withMessage("officeId must be a valid UUID"),
  ];
};

// Body validation for PUT /status/:attendanceId (updateAttendanceStatusController).
export const updateAttendanceStatusSchema = () => {
  return [
    body("status")
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

// Param validation for POST /:userId/reset-device (resetUserDeviceController).
export const resetUserDeviceSchema = () => {
  return [
    param("userId")
      .notEmpty()
      .withMessage("userId is required")
      .isUUID()
      .withMessage("userId must be a valid UUID"),
  ];
};


export const createOfficeSchema = () => {
  return [
    body("name")
      .notEmpty()
      .withMessage("name is required")
      .isString()
      .withMessage("name must be a string"),

    body("address")
      .notEmpty()
      .withMessage("address is required")
      .isString()
      .withMessage("address must be a string"),

    body("latitude")
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude must be a number between -90 and 90"),

    body("longitude")
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude must be a number between -180 and 180"),

    body("radius")
      .optional({ nullable: true })
      .isFloat({ gt: 0 })
      .withMessage("radius must be a positive number of meters"),
  ];
};

// Body validation for PUT /:officeId (updateOfficeLocationController).
// Same rules as create, but every field is optional since it's a
// partial update.
export const updateOfficeSchema = () => {
  return [
    body("name")
      .optional()
      .isString()
      .withMessage("name must be a string"),

    body("address")
      .optional()
      .isString()
      .withMessage("address must be a string"),

    body("latitude")
      .optional({ nullable: true })
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude must be a number between -90 and 90"),

    body("longitude")
      .optional({ nullable: true })
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude must be a number between -180 and 180"),

    body("radius")
      .optional({ nullable: true })
      .isFloat({ gt: 0 })
      .withMessage("radius must be a positive number of meters"),
  ];
};

// Body validation for POST / (generateQRTOkenController).
export const createQRTokenSchema = () => {
  return [
    body("officeId")
      .notEmpty()
      .withMessage("officeId is required")
      .isUUID()
      .withMessage("officeId must be a valid UUID"),

    body("type")
      .notEmpty()
      .withMessage("type is required")
      .isIn(["CHECK_IN", "CHECK_OUT"])
      .withMessage("type must be either 'CHECK_IN' or 'CHECK_OUT'"),
  ];
};
