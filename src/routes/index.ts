import { Router } from "express";
import { userRoutes } from "./user-route";
import { attendanceRoutes } from "./attendance-route";
import { officeLocationRoutes } from "./ofice-location-route";
import { qRRoutes } from "./qr-token-route";
import { workScheduleRoutes } from "./workSchedule-route";
import { leaveRoutes } from "./leave-route";
import { organizationRoutes } from "./organization-route";

const router = Router();

router.use("/users", userRoutes);
router.use("/office-location", officeLocationRoutes);
router.use("/qr-token", qRRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/work-schedules", workScheduleRoutes);
router.use("/leave", leaveRoutes);
router.use("/organizations", organizationRoutes);

export { router as applicationRoutes };
