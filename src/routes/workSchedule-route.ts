import { Router } from "express";
import { validateRequestMiddleware } from "../helpers";
import { isSuperAdmin } from "../helpers/protected-route-helpers";
import {
  currentUserMiddleware,
  requireAuthMiddleware,
} from "../middleware";

import {
  createWorkScheduleController,
  updateWorkScheduleController,
  getAllWorkSchedulesController,
  getUserWorkSchedulesController,
  getWorkScheduleByIdController,
  deleteWorkScheduleController,
  bulkCreateWorkScheduleController,
  bulkUpdateWorkScheduleController,
} from "../controllers";

import {
  createWorkScheduleValidation,
  updateWorkScheduleValidation,
  getUserWorkSchedulesValidation,
  getWorkScheduleValidation,
  deleteWorkScheduleValidation,
  bulkCreateWorkScheduleValidation,
  bulkUpdateWorkScheduleValidation,
} from "../schema/workSchedule/workSchedule-schema";

const router = Router();

router.use(currentUserMiddleware, requireAuthMiddleware);

/**
 * Get all schedules
 * Create single schedule
 */
router
  .route("/")
  .get(
    validateRequestMiddleware,
    isSuperAdmin,
    getAllWorkSchedulesController,
  )
  .post(
    createWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    createWorkScheduleController,
  );

/**
 * Bulk create schedules
 */
router
  .route("/bulk")
  .post(
    bulkCreateWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    bulkCreateWorkScheduleController,
  )
  .patch(
    bulkUpdateWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    bulkUpdateWorkScheduleController,
  );

/**
 * Get schedules for a user
 */
router
  .route("/user/:userId")
  .get(
    getUserWorkSchedulesValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    getUserWorkSchedulesController,
  );

/**
 * Get / Update / Delete a schedule
 */
router
  .route("/:scheduleId")
  .get(
    getWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    getWorkScheduleByIdController,
  )
  .patch(
    updateWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    updateWorkScheduleController,
  )
  .delete(
    deleteWorkScheduleValidation,
    validateRequestMiddleware,
    isSuperAdmin,
    deleteWorkScheduleController,
  );

export { router as workScheduleRoutes };