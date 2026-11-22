"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const protected_route_helpers_1 = require("../helpers/protected-route-helpers");
const middleware_1 = require("../middleware");
const controllers_1 = require("../controllers");
const leave_schema_1 = require("../schema/leave/leave-schema");
const router = (0, express_1.Router)();
exports.leaveRoutes = router;
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
router
    .route("/")
    .get(helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, leave_schema_1.getAllLeaveRequestsValidation, controllers_1.getLeaveRequestsController)
    .post(helpers_1.validateRequestMiddleware, leave_schema_1.createLeaveRequestValidation, controllers_1.createLeaveRequestController);
router
    .route("/my")
    .get(helpers_1.validateRequestMiddleware, controllers_1.getMyLeaveRequestsController);
router
    .route("/:leaveId")
    .get(helpers_1.validateRequestMiddleware, leave_schema_1.getLeaveRequestValidation, controllers_1.getLeaveRequestController);
router
    .route("/:leaveId/approve")
    .put(helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, leave_schema_1.approveLeaveRequestValidation, controllers_1.approveLeaveRequestController);
router
    .route("/:leaveId/reject")
    .put(helpers_1.validateRequestMiddleware, protected_route_helpers_1.isSuperAdmin, leave_schema_1.rejectLeaveRequestValidation, controllers_1.rejectLeaveRequestController);
