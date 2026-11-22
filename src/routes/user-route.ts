import { Router } from "express";
import {
  validateRequestMiddleware,
} from "../helpers";
import { isSuperAdmin } from "../helpers/protected-route-helpers";
import { currentUserMiddleware, requireAuthMiddleware } from "../middleware";
import { adminUpdateUserSchema, getUsersSchema, loginSchema, registerUserSchema, userUpdatePasswordSchema, userUpdateProfileSchema } from "../schema";
import {
  adminUpdateUserController,
  bulkUploadUsersController,
  currentUserController,
  getUserByIdController,
  getUsersController,
  loginUserController,
  registerUserController,
  userUpdatePasswordController,
  userUpdateProfileController,
  updateUserProfilePictureController,
  assignOfficeToAdminController,
  removeOfficeFromAdminController,
  getAdminOfficesController,
} from "../controllers";
import { uploadCsvExcel, uploadProfilePicture } from "../utils";


const router = Router();

router
  .route("/login")
  .post(loginSchema(), validateRequestMiddleware, loginUserController);

router.use(currentUserMiddleware, requireAuthMiddleware);

router.route("/current-user").get(currentUserController);
router.put(
  "/me/profile-picture",
  uploadProfilePicture.single("image"),
  updateUserProfilePictureController,
);

router.post(
    "/register",
    isSuperAdmin,
    registerUserSchema(),
    validateRequestMiddleware,
    registerUserController
  );

router
  .route("/update-password")
  .patch(
    userUpdatePasswordSchema(),
    validateRequestMiddleware,
    userUpdatePasswordController
  );

router
  .route("/update-profile")
  .patch(
    userUpdateProfileSchema(),
    validateRequestMiddleware,
    userUpdateProfileController
  );

router.get("/", getUsersSchema(), validateRequestMiddleware, getUsersController);

router.post(
  "/upload/:officeId",
  isSuperAdmin,
  uploadCsvExcel.single("file"),
  bulkUploadUsersController
);

// ---------------------------------------------------------------------------
// Admin <-> Office assignment (SUPER_ADMIN only, same pattern as /register
// and /upload/:officeId above)
// ---------------------------------------------------------------------------

router.post(
  "/admin/assign-location/:adminId/:officeId",
  isSuperAdmin,
  assignOfficeToAdminController
);

router.delete(
  "/admin/remove-location/:adminId/:officeId",
  isSuperAdmin,
  removeOfficeFromAdminController
);

router.get(
  "/admin/:adminId/locations",
  isSuperAdmin,
  getAdminOfficesController
);

router
  .route("/:id")
  .get(validateRequestMiddleware, getUserByIdController)
  .patch(
    isSuperAdmin,
    adminUpdateUserSchema(),
    validateRequestMiddleware,
    adminUpdateUserController
  );


export { router as userRoutes };
