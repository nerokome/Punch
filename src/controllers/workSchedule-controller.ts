import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import {
  successResponse,
} from "../helpers";
import { BadRequestError } from "../errors";

import {
  createWorkScheduleService,
  updateWorkScheduleService,
  getUserWorkSchedulesService,
  getAllWorkSchedulesService,
  getWorkScheduleByIdService,
  deleteWorkScheduleService,
  bulkCreateWorkScheduleService,
  bulkUpdateWorkScheduleService,
} from "../services";

/**
 * Create Work Schedule
 */
export const createWorkScheduleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const {
      userId,
      officeDays,
      workMode,
      effectiveFrom,
    } = req.body;

    const schedule = await createWorkScheduleService(
      req.currentUser,
      {
        userId,
        officeDays,
        workMode,
        effectiveFrom,
      },
    );

    successResponse(res, StatusCodes.CREATED, {
      message: "Work schedule created successfully",
      data: schedule,
    });
  } catch (error) {
    throw new BadRequestError("Failed to create work schedule");
  }
};

/**
 * Update Work Schedule
 */
export const updateWorkScheduleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const { scheduleId } = req.params;

    const {
      officeDays,
      workMode,
      effectiveFrom,
    } = req.body;

    const schedule = await updateWorkScheduleService(
      req.currentUser,
      scheduleId,
      {
        officeDays,
        workMode,
        effectiveFrom,
      },
    );

    successResponse(res, StatusCodes.OK, {
      message: "Work schedule updated successfully",
      data: schedule,
    });
  } catch (error: any) {
    console.error("UPDATE WORK SCHEDULE ERROR:", error);

    if (
      error instanceof BadRequestError ||
      error.name === "ForbiddenError"
    ) {
      throw error;
    }

    throw new BadRequestError(
      error?.message || "Failed to update work schedule",
    );
  }
};
/**
 * Get All Work Schedules
 */
export const getAllWorkSchedulesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const schedules = await getAllWorkSchedulesService(
      req.currentUser,
    );

    successResponse(res, StatusCodes.OK, {
      message: "Work schedules fetched successfully",
      data: schedules,
    });
  } catch (error) {
    throw new BadRequestError("Failed to fetch work schedules");
  }
};

/**
 * Get User Work Schedules
 */
export const getUserWorkSchedulesController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const schedules = await getUserWorkSchedulesService(
      userId,
    );

    successResponse(res, StatusCodes.OK, {
      message: "User work schedules fetched successfully",
      data: schedules,
    });
  } catch (error) {
    throw new BadRequestError(
      "Failed to fetch user work schedules",
    );
  }
};

/**
 * Get Single Work Schedule
 */
export const getWorkScheduleByIdController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { scheduleId } = req.params;

    const schedule = await getWorkScheduleByIdService(
      scheduleId,
    );

    successResponse(res, StatusCodes.OK, {
      message: "Work schedule fetched successfully",
      data: schedule,
    });
  } catch (error) {
    throw new BadRequestError(
      "Failed to fetch work schedule",
    );
  }
};

/**
 * Delete Work Schedule
 */
export const deleteWorkScheduleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const { scheduleId } = req.params;

    const schedule = await deleteWorkScheduleService(
      req.currentUser,
      scheduleId,
    );

    successResponse(res, StatusCodes.OK, {
      message: "Work schedule deleted successfully",
      data: schedule,
    });
  } catch (error) {
    throw new BadRequestError(
      "Failed to delete work schedule",
    );
  }
};
/**
 * Bulk Create Work Schedules
 */
export const bulkCreateWorkScheduleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const {
      userIds,
      officeDays,
      workMode,
      effectiveFrom,
    } = req.body;

    const schedules = await bulkCreateWorkScheduleService(
      req.currentUser,
      {
        userIds,
        officeDays,
        workMode,
        effectiveFrom,
      },
    );

    successResponse(res, StatusCodes.CREATED, {
      message: "Work schedules created successfully",
      data: schedules,
    });
  } catch (error: any) {
    console.error("BULK CREATE WORK SCHEDULE ERROR:", error);

    if (
      error instanceof BadRequestError ||
      error.name === "ForbiddenError"
    ) {
      throw error;
    }

    throw new BadRequestError(
      error?.message || "Failed to create work schedules",
    );
  }
};

/**
 * Bulk Update Work Schedules
 */
export const bulkUpdateWorkScheduleController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.currentUser) {
      throw new BadRequestError("User not authorized");
    }

    const {
      userIds,
      officeDays,
      workMode,
      effectiveFrom,
    } = req.body;

    const schedules = await bulkUpdateWorkScheduleService(
      req.currentUser,
      {
        userIds,
        officeDays,
        workMode,
        effectiveFrom,
      },
    );

    successResponse(res, StatusCodes.OK, {
      message: "Work schedules updated successfully",
      data: schedules,
    });
  } catch (error: any) {
    console.error("BULK UPDATE WORK SCHEDULE ERROR:", error);

    if (
      error instanceof BadRequestError ||
      error.name === "ForbiddenError"
    ) {
      throw error;
    }

    throw new BadRequestError(
      error?.message || "Failed to update work schedules",
    );
  }
};