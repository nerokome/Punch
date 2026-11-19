import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { LeaveStatus, LeaveType, Role } from "@prisma/client";

import { successResponse } from "../helpers";
import { BadRequestError, ForbiddenError } from "../errors";

import {
  createLeaveRequestService,
  getUserLeaveRequestsService,
  getLeaveRequestByIdService,
  getAllLeaveRequestsService,
  approveLeaveRequestService,
  rejectLeaveRequestService,
  getAdminOfficeIds,
} from "../services";

export const createLeaveRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) {
    throw new BadRequestError("User not authorized");
  }

  const { startDate, endDate, leaveType, reason } = req.body;

  const leave = await createLeaveRequestService(req.currentUser.id, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    leaveType,
    reason,
  });

  successResponse(res, StatusCodes.CREATED, {
    message: "Leave request submitted successfully",
    data: leave,
  });
};

export const getMyLeaveRequestsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) {
    throw new BadRequestError("User not authorized");
  }

  const data = await getUserLeaveRequestsService(req.currentUser.id);

  successResponse(res, StatusCodes.OK, {
    message: "Leave requests retrieved successfully",
    data,
  });
};

export const getLeaveRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { leaveId } = req.params;

  const data = await getLeaveRequestByIdService(leaveId);

  successResponse(res, StatusCodes.OK, {
    message: "Leave request retrieved successfully",
    data,
  });
};

export const getLeaveRequestsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) {
    throw new BadRequestError("User not authorized");
  }

  let officeFilter: string | undefined;
  let officeScope: string[] | undefined;

  if (req.currentUser.role === Role.ADMIN) {
    officeScope = await getAdminOfficeIds(req.currentUser.id);

    if (!officeScope.length) {
      throw new ForbiddenError("No offices assigned to this admin");
    }
  }

  if (
    req.currentUser.role === Role.SUPER_ADMIN &&
    req.query.officeId &&
    typeof req.query.officeId === "string"
  ) {
    officeFilter = req.query.officeId;
  }

  const { page, limit, status, leaveType, search } = req.query;

  const data = await getAllLeaveRequestsService({
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    status: status as LeaveStatus,
    leaveType: leaveType as LeaveType,
    search: search as string,
    officeId: officeFilter,
    officeIds: officeScope,
  });

  successResponse(res, StatusCodes.OK, {
    message: "Leave requests retrieved successfully",
    data,
  });
};

export const approveLeaveRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) {
    throw new BadRequestError("User not authorized");
  }

  if (
    req.currentUser.role !== Role.ADMIN &&
    req.currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  const { leaveId } = req.params;

  const data = await approveLeaveRequestService(
    leaveId,
    req.currentUser.id,
  );

  successResponse(res, StatusCodes.OK, {
    message: "Leave request approved successfully",
    data,
  });
};

export const rejectLeaveRequestController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.currentUser) {
    throw new BadRequestError("User not authorized");
  }

  if (
    req.currentUser.role !== Role.ADMIN &&
    req.currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  const { leaveId } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    throw new BadRequestError("Rejection reason is required");
  }

  const data = await rejectLeaveRequestService(
    leaveId,
    req.currentUser.id,
    rejectionReason,
  );

  successResponse(res, StatusCodes.OK, {
    message: "Leave request rejected successfully",
    data,
  });
};