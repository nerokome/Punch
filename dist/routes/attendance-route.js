"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const protected_route_helpers_1 = require("../helpers/protected-route-helpers");
const middleware_1 = require("../middleware");
const controllers_1 = require("../controllers");
const schema_1 = require("../schema");
const router = (0, express_1.Router)();
exports.attendanceRoutes = router;
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
router
    .route("/")
    .get((0, schema_1.getAttendanceQuerySchema)(), helpers_1.validateRequestMiddleware, controllers_1.getAttendancesController)
    .post((0, schema_1.scanAttendanceSchema)(), helpers_1.validateRequestMiddleware, controllers_1.scanAttendanceController);
router
    .route("/manual")
    .post(protected_route_helpers_1.isSuperAdmin, (0, schema_1.manualAttendanceSchema)(), helpers_1.validateRequestMiddleware, controllers_1.manualAttendanceController);
router
    .route("/summary")
    .get(protected_route_helpers_1.isSuperAdmin, (0, schema_1.getAttendanceQuerySchema)(), helpers_1.validateRequestMiddleware, controllers_1.getAttendanceSummary);
router
    .route("/summary/:officeId")
    .get(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.getOfficeAttendanceSummary);
router
    .route("/dashboard/stats")
    .get(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.getDashboardStatsController);
// Keep the specific attendance routes before the generic /:userId route.
// Otherwise, summary and status endpoints can be misread as a user lookup.
router
    .route("/:userId/reset-device")
    .post((0, schema_1.resetUserDeviceSchema)(), helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.resetUserDeviceController);
router
    .route("/:userId")
    .get((0, schema_1.getAttendanceQuerySchema)(), helpers_1.validateRequestMiddleware, controllers_1.getUserAttendancesController);
router
    .route("/status/:attendanceId")
    .put(protected_route_helpers_1.isSuperAdmin, (0, schema_1.updateAttendanceStatusSchema)(), helpers_1.validateRequestMiddleware, controllers_1.updateAttendanceStatusController);
