"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const protected_route_helpers_1 = require("../helpers/protected-route-helpers");
const middleware_1 = require("../middleware");
const schema_1 = require("../schema");
const controllers_1 = require("../controllers");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
exports.userRoutes = router;
router
    .route("/login")
    .post((0, schema_1.loginSchema)(), helpers_1.validateRequestMiddleware, controllers_1.loginUserController);
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
router.route("/current-user").get(controllers_1.currentUserController);
router.put("/me/profile-picture", utils_1.uploadProfilePicture.single("image"), controllers_1.updateUserProfilePictureController);
router.post("/register", protected_route_helpers_1.isSuperAdmin, (0, schema_1.registerUserSchema)(), helpers_1.validateRequestMiddleware, controllers_1.registerUserController);
router
    .route("/update-password")
    .patch((0, schema_1.userUpdatePasswordSchema)(), helpers_1.validateRequestMiddleware, controllers_1.userUpdatePasswordController);
router
    .route("/update-profile")
    .patch((0, schema_1.userUpdateProfileSchema)(), helpers_1.validateRequestMiddleware, controllers_1.userUpdateProfileController);
router.get("/", (0, schema_1.getUsersSchema)(), helpers_1.validateRequestMiddleware, controllers_1.getUsersController);
router.post("/upload/:officeId", protected_route_helpers_1.isSuperAdmin, utils_1.uploadCsvExcel.single("file"), controllers_1.bulkUploadUsersController);
// ---------------------------------------------------------------------------
// Admin <-> Office assignment (SUPER_ADMIN only, same pattern as /register
// and /upload/:officeId above)
// ---------------------------------------------------------------------------
router.post("/admin/assign-location/:adminId/:officeId", protected_route_helpers_1.isSuperAdmin, controllers_1.assignOfficeToAdminController);
router.delete("/admin/remove-location/:adminId/:officeId", protected_route_helpers_1.isSuperAdmin, controllers_1.removeOfficeFromAdminController);
router.get("/admin/:adminId/locations", protected_route_helpers_1.isSuperAdmin, controllers_1.getAdminOfficesController);
router
    .route("/:id")
    .get(helpers_1.validateRequestMiddleware, controllers_1.getUserByIdController)
    .patch(protected_route_helpers_1.isSuperAdmin, (0, schema_1.adminUpdateUserSchema)(), helpers_1.validateRequestMiddleware, controllers_1.adminUpdateUserController);
