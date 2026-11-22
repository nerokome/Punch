"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.officeLocationRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const protected_route_helpers_1 = require("../helpers/protected-route-helpers");
const middleware_1 = require("../middleware");
const controllers_1 = require("../controllers");
const schema_1 = require("../schema");
const router = (0, express_1.Router)();
exports.officeLocationRoutes = router;
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
router
    .route("/")
    .get(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.getAllOfficeLocationController)
    .post(protected_route_helpers_1.isSuper, helpers_1.validateRequestMiddleware, (0, schema_1.createOfficeSchema)(), controllers_1.createOfficeController);
router.route("/:officeId")
    .get(helpers_1.validateRequestMiddleware, controllers_1.getOfficeLocationController)
    .patch(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, (0, schema_1.updateOfficeSchema)(), controllers_1.updateOfficeLocationController);
// Shift routes
router.route("/:officeId/shifts")
    .get(helpers_1.validateRequestMiddleware, controllers_1.getShiftsByOfficeIdController)
    .post(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.createShiftController);
// Static path declared before the dynamic /:shiftId path below, so
// POST /shifts/assign can never be shadowed by a future handler added
// to /shifts/:shiftId.
router.route("/shifts/assign")
    .post(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.assignUserToShiftController);
router.route("/shifts/:shiftId")
    .patch(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.updateShiftController)
    .delete(protected_route_helpers_1.isSuperAdmin, helpers_1.validateRequestMiddleware, controllers_1.deleteShiftController);
