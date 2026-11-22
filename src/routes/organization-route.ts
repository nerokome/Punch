import { Router } from "express";
import { currentUserMiddleware, requireAuthMiddleware } from "../middleware";
import { validateRequestMiddleware } from "../helpers";
import { organizationSignupSchema } from "../schema/user/user-schema";
import { uploadOrganizationImage } from "../utils";
import { isPlatformSuperAdmin } from "../helpers/protected-route-helpers";
import {
  currentOrganizationController,
  platformOrganizationSummaryController,
  signupOrganizationController,
  updateOrganizationBannerController,
  uploadOrganizationImageController,
} from "../controllers/organization-controller";

const router = Router();

router.post("/signup", organizationSignupSchema(), validateRequestMiddleware, signupOrganizationController);
router.use(currentUserMiddleware, requireAuthMiddleware);
router.get("/platform-summary", isPlatformSuperAdmin, platformOrganizationSummaryController);
router.get("/me", currentOrganizationController);
router.post("/me/image", uploadOrganizationImage.single("image"), uploadOrganizationImageController);
router.put("/me/banner", uploadOrganizationImage.single("image"), updateOrganizationBannerController);

export { router as organizationRoutes };
