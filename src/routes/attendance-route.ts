import { Router } from "express";
import { validateRequestMiddleware } from "../helpers";
import { isSuperAdmin } from "../helpers/protected-route-helpers";
import { currentUserMiddleware, requireAuthMiddleware } from "../middleware";
import {
  createOfficeController,
  getAllOfficeLocationController,
  getAttendancesController,
  getAttendanceSummary,
  getDashboardStatsController,
  getOfficeAttendanceSummary,
  getOfficeLocationController,
  getUserAttendancesController,
  manualAttendanceController,
  resetUserDeviceController,
  scanAttendanceController,
  updateOfficeLocationController,
  updateAttendanceStatusController,
} from "../controllers";
import {
  getAttendanceQuerySchema,
  manualAttendanceSchema,
  resetUserDeviceSchema,
  scanAttendanceSchema,
  updateAttendanceStatusSchema,
} from "../schema";

const router = Router();

router.use(currentUserMiddleware, requireAuthMiddleware);

router
  .route("/")
  .get(
    getAttendanceQuerySchema(),
    validateRequestMiddleware,
    getAttendancesController,
  )
  .post(scanAttendanceSchema(), validateRequestMiddleware, scanAttendanceController);

router
  .route("/manual")
  .post(
    isSuperAdmin,
    manualAttendanceSchema(),
    validateRequestMiddleware,
    manualAttendanceController,
  );

router
  .route("/summary")
  .get(
    isSuperAdmin,
    getAttendanceQuerySchema(),
    validateRequestMiddleware,
    getAttendanceSummary,
  );

router
  .route("/summary/:officeId")
  .get(isSuperAdmin, validateRequestMiddleware, getOfficeAttendanceSummary);

router
  .route("/dashboard/stats")
  .get(isSuperAdmin, validateRequestMiddleware, getDashboardStatsController);

// Keep the specific attendance routes before the generic /:userId route.
// Otherwise, summary and status endpoints can be misread as a user lookup.
router
  .route("/:userId/reset-device")
  .post(
    resetUserDeviceSchema(),
    validateRequestMiddleware,
    isSuperAdmin,
    resetUserDeviceController,
  );

router
  .route("/:userId")
  .get(
    getAttendanceQuerySchema(),
    validateRequestMiddleware,
    getUserAttendancesController,
  );

router
  .route("/status/:attendanceId")
  .put(
    isSuperAdmin,
    updateAttendanceStatusSchema(),
    validateRequestMiddleware,
    updateAttendanceStatusController,
  );

export { router as attendanceRoutes };
