import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { successResponse } from "../helpers";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import { AttendanceStatus, Role } from "@prisma/client";
import moment from "moment";
import { prisma } from "../client";
import {
  getAllAttendanceRecordsService,
  getDashboardStatsService,
  getAdminOfficeIds,
  getOfficeLocationByOfficeId,
  getOfficeUsersWithAttendance,
  getUserByIdService,
  getUserAllAttendanceRecordsService,
  getUsersWithAttendance,
  handleAttendanceService,
  manualAttendanceService,
  resetUserDeviceService,
  updateAttendanceStatusService,
} from "../services";

const getAttendanceOfficeScope = async (req: Request): Promise<string[] | undefined> => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");

  if (req.currentUser.role === Role.SUPER_ADMIN) return undefined;
  if (req.currentUser.role !== Role.ADMIN) throw new ForbiddenError();

  const officeIds = await getAdminOfficeIds(req.currentUser.id);
  if (!officeIds.length) {
    throw new ForbiddenError("No offices assigned to this admin");
  }

  return officeIds;
};

const assertOfficeInScope = (officeId: string, officeIds?: string[]): void => {
  if (officeIds !== undefined && !officeIds.includes(officeId)) {
    throw new ForbiddenError("You do not have access to this office");
  }
};

const normalizeOfficeIds = (value: unknown): string[] => {
  const rawValues = Array.isArray(value) ? value : [value];

  return rawValues
    .flatMap((entry) => {
      if (typeof entry !== "string") return [];
      return entry
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    })
    .filter((entry, index, arr) => entry && arr.indexOf(entry) === index);
};

export const scanAttendanceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, userId, userLat, userLng, deviceId } = req.body;
  const parsedLat =
    userLat !== undefined && userLat !== null ? parseFloat(userLat) : undefined;
  const parsedLng =
    userLng !== undefined && userLng !== null ? parseFloat(userLng) : undefined;

  if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
    throw new BadRequestError("deviceId is required to clock in/out.");
  }

  const record = await handleAttendanceService(
    token,
    userId,
    parsedLat as number,
    parsedLng as number,
    deviceId,
  );

  successResponse(res, StatusCodes.OK, {
    message: "Attendance saved successfully",
    data: record,
  });
};

export const manualAttendanceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, type, officeId } = req.body;
  const officeIds = await getAttendanceOfficeScope(req);
  assertOfficeInScope(officeId, officeIds);

  const record = await manualAttendanceService(userId, type, officeId);

  successResponse(res, StatusCodes.OK, {
    message: "Attendance saved successfully",
    data: record,
  });
};

// Admin-only: unbind a user's device from the account (e.g. lost/broken
// phone). Their next clock-in from a new device will bind fresh. There
// is no self-service or automatic version of this — see
// resetUserDeviceService for why.
export const resetUserDeviceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");

  if (
    req.currentUser.role !== Role.ADMIN &&
    req.currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  const { userId } = req.params;
  if (!userId) throw new BadRequestError("Invalid userId");

  const officeIds = await getAttendanceOfficeScope(req);
  const user = await getUserByIdService(userId);
  if (!user?.officeId) throw new BadRequestError("User has no office assigned");
  assertOfficeInScope(user.officeId, officeIds);

  const updatedUser = await resetUserDeviceService(userId);

  successResponse(res, StatusCodes.OK, {
    message: "Device reset successfully. The user can bind a new device on their next clock-in.",
    data: updatedUser,
  });
};

export const getAttendancesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      page,
      limit,
      filterByDate,
      startDate,
      endDate,
      search,
      officeId: queryOfficeId,
    } = req.query;

    if (!req.currentUser) throw new BadRequestError("User not authorized");

    const officeIds = await getAttendanceOfficeScope(req);
    const selectedOfficeIds = normalizeOfficeIds(queryOfficeId);

    if (
      req.currentUser.role === Role.SUPER_ADMIN &&
      selectedOfficeIds.length > 0
    ) {
      const records = await getAllAttendanceRecordsService({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 10,
        filterByDate: filterByDate as "today" | "range" | undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        officeIds: selectedOfficeIds,
        search: search as string,
      });

      successResponse(res, StatusCodes.OK, {
        message: "Attendance Records",
        data: records,
      });
      return;
    }

    const records = await getAllAttendanceRecordsService({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 10,
      filterByDate: filterByDate as "today" | "range" | undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      officeIds,
      search: search as string,
    });

    successResponse(res, StatusCodes.OK, {
      message: "Attendance Records",
      data: records,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to get record");
  }
};

export const getUserAttendancesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params;
  if (!userId) throw new BadRequestError("Invalid userId");

  if (!req.currentUser) throw new BadRequestError("User not authorized");
  if (req.currentUser.role === Role.AGENT && req.currentUser.id !== userId) {
    throw new ForbiddenError();
  }

  const officeIds =
    req.currentUser.role === Role.AGENT
      ? undefined
      : await getAttendanceOfficeScope(req);
  const user = await getUserByIdService(userId);
  if (!user) throw new BadRequestError("User not found");
  assertOfficeInScope(user.officeId ?? "", officeIds);

  const { page, limit, filterByDate, startDate, endDate, search } = req.query;

  const records = await getUserAllAttendanceRecordsService(userId, {
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 10,
    filterByDate: filterByDate as "today" | "range" | undefined,
    startDate: startDate as string,
    endDate: endDate as string,
    search: search as string,
    officeIds,
  });

  successResponse(res, StatusCodes.OK, {
    message: "Attendance Records",
    data: records,
  });
};

export const getOfficeAttendanceSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { officeId } = req.params;
  if (!officeId) throw new BadRequestError("Invalid officeId");

  const requestedOfficeIds = normalizeOfficeIds(officeId);

  const officeIds = await getAttendanceOfficeScope(req);
  requestedOfficeIds.forEach((id) => assertOfficeInScope(id, officeIds));

  for (const id of requestedOfficeIds) {
    const office = await getOfficeLocationByOfficeId(id);
    if (!office) throw new BadRequestError(`Invalid officeId: ${id}`);
  }

  const { startDate, endDate, page, limit, search, status } = req.query;

  const data = await getOfficeUsersWithAttendance(requestedOfficeIds, {
    startDate: startDate as string,
    endDate: endDate as string,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
    search: search as string,
    status: status as AttendanceStatus | undefined,
  });

  successResponse(res, StatusCodes.OK, {
    message: "Attendance Records",
    data,
  });
};

export const getAttendanceSummary = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { startDate, filterByDate, endDate, page, limit, search } = req.query;

  if (!req.currentUser) throw new BadRequestError("User not authorized");

  const officeIds = await getAttendanceOfficeScope(req);
  // ^ this resolves ALL offices the admin is assigned to
  //   (primary officeId + every AdminOfficeAccess row), fresh from the DB

  const data = await getUsersWithAttendance({
    startDate: startDate as string,
    endDate: endDate as string,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
    officeIds,
    search: search as string,
  });

  successResponse(res, StatusCodes.OK, {
    message: "Attendance Records",
    data,
  });
};

export const getDashboardStatsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");

  let officeIds = await getAttendanceOfficeScope(req);
  const selectedOfficeIds = normalizeOfficeIds(req.query.officeId);
  if (
    req.currentUser.role === Role.SUPER_ADMIN &&
    selectedOfficeIds.length > 0
  ) {
    officeIds = selectedOfficeIds;
  }

  const { startDate, endDate } = req.query;

  const stats = await getDashboardStatsService(
    officeIds,
    startDate as string,
    endDate as string,
  );

  successResponse(res, StatusCodes.OK, {
    message: "Dashboard statistics retrieved successfully",
    data: stats,
  });
};

export const updateAttendanceStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");

  // Only allow admins and super admins to update status
  if (
    req.currentUser.role !== Role.ADMIN &&
    req.currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  const { attendanceId } = req.params;
  const { status } = req.body;

  if (!attendanceId) throw new BadRequestError("Invalid attendanceId");
  if (!status) throw new BadRequestError("Status is required");

  const officeIds = await getAttendanceOfficeScope(req);

  const updatedRecord = await updateAttendanceStatusService(
    attendanceId,
    status,
    officeIds,
  );

  successResponse(res, StatusCodes.OK, {
    message: "Attendance status updated successfully",
    data: updatedRecord,
  });
};
