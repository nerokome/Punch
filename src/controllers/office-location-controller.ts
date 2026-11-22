import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import {
  successResponse,
} from "../helpers";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import moment from "moment";
import { prisma } from "../client";
import { assertOfficeInOrganization, assertShiftInOrganization, assertUserInOrganization } from "../helpers/organization-access";
import {
  createOfficeLocationService,
  getAllOfficeLocationsService,
  resolveOfficeScope,
  getOfficeLocationByOfficeId,
  updateOfficeLocationService,
  createShiftService,
  getShiftsByOfficeIdService,
  updateShiftService,
  deleteShiftService,
  assignUserToShiftService,
} from "../services";

const parseCoordinate = (val: any) => {
    if (val === undefined || val === null || val === "") return undefined;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
};

export const createOfficeController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
        const {
            name,
            address,
            latitude,
            longitude,
            radius,
        } = req.body;
  
        const data = {
            name,
            address,
            latitude: parseCoordinate(latitude),
            longitude: parseCoordinate(longitude),
            radius: parseCoordinate(radius),
            organizationId: req.currentUser?.organizationId,
        };
  
        const record = await createOfficeLocationService(data);

        // The organization owner must immediately be able to manage the office
        // they created (and see its people through the normal admin scope).
        if (req.currentUser?.role === "ADMIN") {
          await prisma.adminOfficeAccess.upsert({
            where: { adminId_officeId: { adminId: req.currentUser.id, officeId: record.id } },
            update: {},
            create: { adminId: req.currentUser.id, officeId: record.id },
          });
          if (!req.currentUser.officeId) {
            await prisma.user.update({ where: { id: req.currentUser.id }, data: { officeId: record.id } });
          }
        }

        successResponse(res, StatusCodes.OK, {
            message: "Office Location saved successfully",
            data: record,
        });
    
    } catch (error) {
        // Preserve the real error (e.g. coordinate validation messages from
        // the service) instead of masking everything as a generic failure.
        if (error instanceof BadRequestError) throw error;
        throw new BadRequestError("Failed to save record");
    }
};

export const getAllOfficeLocationController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {

        if(!req.currentUser) throw new BadRequestError('User not authorized')

        // undefined -> SUPER_ADMIN, no restriction, sees every office.
        // string[]  -> ADMIN, sees only offices in their merged scope
        //              (primary officeId + everything from AdminOfficeAccess).
        //              Can be [] if they have nothing assigned yet.
        const officeScope = await resolveOfficeScope(
          req.currentUser.role,
          req.currentUser.id,
          req.currentUser.organizationId,
        );

        const records = await getAllOfficeLocationsService(officeScope);
    
        successResponse(res, StatusCodes.OK, {
            message: "Office Locations fetched successfully",
            data: records,
        });
    } catch (error) {
        if (error instanceof BadRequestError) throw error;
        throw new BadRequestError("Failed to fetch records");
    }
};

export const getOfficeLocationController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {

        const { officeId } = req.params;
        await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);
        const record = await getOfficeLocationByOfficeId(officeId);
    
        successResponse(res, StatusCodes.OK, {
            message: "Office Location fetched successfully",
            data: record,
        });
    } catch (error) {
        if (error instanceof BadRequestError) throw error;
        throw new BadRequestError("Failed to fetch records");
    }
};

export const updateOfficeLocationController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
        const { officeId } = req.params;
        await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);
        const {
            name,
            address,
            latitude,
            longitude,
            radius,
        } = req.body;

        const data = {
            name,
            address,
            latitude: parseCoordinate(latitude),
            longitude: parseCoordinate(longitude),
            radius: parseCoordinate(radius),
        };
  
        const record = await updateOfficeLocationService(officeId, data);

        successResponse(res, StatusCodes.OK, {
            message: "Office Location updated successfully",
            data: record,
        });
    
    } catch (error) {
        if (error instanceof BadRequestError) throw error;
        throw new BadRequestError("Failed to update record");
    }
};

// Shift controllers
export const createShiftController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, startTime, endTime, officeId } = req.body;
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);
    const data = { name, startTime, endTime, officeId };
    const shift = await createShiftService(data);
    successResponse(res, StatusCodes.OK, {
      message: "Shift created successfully",
      data: shift,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to create shift");
  }
};

export const getShiftsByOfficeIdController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { officeId } = req.params;
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);
    const shifts = await getShiftsByOfficeIdService(officeId);
    successResponse(res, StatusCodes.OK, {
      message: "Shifts fetched successfully",
      data: shifts,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to fetch shifts");
  }
};

export const updateShiftController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { shiftId } = req.params;
    await assertShiftInOrganization(shiftId, req.currentUser?.organizationId);
    const { name, startTime, endTime } = req.body;
    const data = { name, startTime, endTime };
    const shift = await updateShiftService(shiftId, data);
    successResponse(res, StatusCodes.OK, {
      message: "Shift updated successfully",
      data: shift,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to update shift");
  }
};

export const deleteShiftController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { shiftId } = req.params;
    await assertShiftInOrganization(shiftId, req.currentUser?.organizationId);
    const shift = await deleteShiftService(shiftId);
    successResponse(res, StatusCodes.OK, {
      message: "Shift deleted successfully",
      data: shift,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to delete shift");
  }
};

export const assignUserToShiftController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, shiftId } = req.body;
    await assertUserInOrganization(userId, req.currentUser?.organizationId);
    await assertShiftInOrganization(shiftId, req.currentUser?.organizationId);
    const user = await assignUserToShiftService(userId, shiftId);
    successResponse(res, StatusCodes.OK, {
      message: "User assigned to shift successfully",
      data: user,
    });
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to assign user to shift");
  }
};
