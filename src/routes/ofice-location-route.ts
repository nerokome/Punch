import { Router } from "express";
import {
  validateRequestMiddleware,
} from "../helpers";
import { isSuper, isSuperAdmin } from "../helpers/protected-route-helpers";
import { currentUserMiddleware, requireAuthMiddleware } from "../middleware";
import { createOfficeController, getAllOfficeLocationController, getOfficeLocationController, updateOfficeLocationController, createShiftController, getShiftsByOfficeIdController, updateShiftController, deleteShiftController, assignUserToShiftController } from "../controllers";
import { createOfficeSchema, updateOfficeSchema } from "../schema";

const router = Router();

router.use(currentUserMiddleware, requireAuthMiddleware);


router
  .route("/")
  .get(
    isSuperAdmin,
    validateRequestMiddleware,
    getAllOfficeLocationController
  )
  .post(
    isSuper,
    validateRequestMiddleware,
    createOfficeSchema(),
    createOfficeController
  );
  
router.route("/:officeId")
  .get(validateRequestMiddleware, getOfficeLocationController)
  .patch(
    
    isSuperAdmin,
    validateRequestMiddleware,
    updateOfficeSchema(),
    updateOfficeLocationController,
  );

// Shift routes
router.route("/:officeId/shifts")
  .get(validateRequestMiddleware, getShiftsByOfficeIdController)
  .post(isSuperAdmin, validateRequestMiddleware, createShiftController);

// Static path declared before the dynamic /:shiftId path below, so
// POST /shifts/assign can never be shadowed by a future handler added
// to /shifts/:shiftId.
router.route("/shifts/assign")
  .post(isSuperAdmin, validateRequestMiddleware, assignUserToShiftController);

router.route("/shifts/:shiftId")
  .patch(isSuperAdmin, validateRequestMiddleware, updateShiftController)
  .delete(isSuperAdmin, validateRequestMiddleware, deleteShiftController);

export { router as officeLocationRoutes };