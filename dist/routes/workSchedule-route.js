"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workScheduleRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const protected_route_helpers_1 = require("../helpers/protected-route-helpers");
const middleware_1 = require("../middleware");
const controllers_1 = require("../controllers");
const workSchedule_schema_1 = require("../schema/workSchedule/workSchedule-schema");
const router = (0, express_1.Router)();
exports.workScheduleRoutes = router;
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
/**
 * Get all schedules
 * Create single schedule
 */
router
    .route("/")
    .get(helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.getAllWorkSchedulesController)
    .post(workSchedule_schema_1.createWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.createWorkScheduleController);
/**
 * Bulk create schedules
 */
router
    .route("/bulk")
    .post(workSchedule_schema_1.bulkCreateWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.bulkCreateWorkScheduleController)
    .patch(workSchedule_schema_1.bulkUpdateWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.bulkUpdateWorkScheduleController);
/**
 * Get schedules for a user
 */
router
    .route("/user/:userId")
    .get(workSchedule_schema_1.getUserWorkSchedulesValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.getUserWorkSchedulesController);
/**
 * Get / Update / Delete a schedule
 */
router
    .route("/:scheduleId")
    .get(workSchedule_schema_1.getWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.getWorkScheduleByIdController)
    .patch(workSchedule_schema_1.updateWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.updateWorkScheduleController)
    .delete(workSchedule_schema_1.deleteWorkScheduleValidation, helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, controllers_1.deleteWorkScheduleController);
