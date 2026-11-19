import { Router } from "express";
import { validateRequestMiddleware } from "../helpers";
import { isSuperAdmin } from "../helpers/protected-route-helpers";
import {
  currentUserMiddleware,
  requireAuthMiddleware,
} from "../middleware";

import {
  approveLeaveRequestController,
  createLeaveRequestController,
  getLeaveRequestController,
  getLeaveRequestsController,
  getMyLeaveRequestsController,
  rejectLeaveRequestController,
} from "../controllers";

import {
  approveLeaveRequestValidation,
  createLeaveRequestValidation,
  getAllLeaveRequestsValidation,
  getLeaveRequestValidation,
  rejectLeaveRequestValidation,
} from "../schema/leave/leave-schema";

const router = Router();

router.use(currentUserMiddleware, requireAuthMiddleware);

router
  .route("/")
  .get(
    validateRequestMiddleware,
    isSuperAdmin,
    getAllLeaveRequestsValidation,
    getLeaveRequestsController,
  )
  .post(
    validateRequestMiddleware,
    createLeaveRequestValidation,
    createLeaveRequestController,
  );

router
  .route("/my")
  .get(
    validateRequestMiddleware,
    getMyLeaveRequestsController,
  );

router
  .route("/:leaveId")
  .get(
    validateRequestMiddleware,
    getLeaveRequestValidation,
    getLeaveRequestController,
  );

router
  .route("/:leaveId/approve")
  .put(
    validateRequestMiddleware,
    isSuperAdmin,
    approveLeaveRequestValidation,
    approveLeaveRequestController,
  );

router
  .route("/:leaveId/reject")
  .put(
    validateRequestMiddleware,
    isSuperAdmin,
    rejectLeaveRequestValidation,
    rejectLeaveRequestController,
  );

export { router as leaveRoutes };