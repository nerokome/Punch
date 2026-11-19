import { Router } from "express";
import {
  validateRequestMiddleware,
} from "../helpers";
import { isSuperAdmin } from "../helpers/protected-route-helpers";
import { currentUserMiddleware, requireAuthMiddleware } from "../middleware";
import { generateQRTOkenController } from "../controllers";

const router = Router();

router.use(currentUserMiddleware, requireAuthMiddleware);


router
  .route("/")
  .post(
    validateRequestMiddleware,
    generateQRTOkenController
  );

export { router as qRRoutes };
