import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import {
  successResponse,
} from "../helpers";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import moment from "moment";
import { prisma } from "../client";
import { createQRTokenService, resolveOfficeScope } from "../services";
import { Role } from "@prisma/client";

export const generateQRTOkenController = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
        if (!req.currentUser) throw new BadRequestError("User not authorized");

        const {
            officeId,
            type,
        } = req.body;

        if (!officeId) throw new BadRequestError("officeId is required");
        if (!type) throw new BadRequestError("type is required");

        // AGENT should never reach this at all — only ADMIN/SUPER_ADMIN can
        // generate QR codes. resolveOfficeScope throws for any other role,
        // which the catch block below now correctly surfaces (previously
        // it would have been swallowed into a misleading BadRequestError).
        const officeScope = await resolveOfficeScope(
          req.currentUser.role as Role,
          req.currentUser.id,
          req.currentUser.organizationId,
        );

        // undefined => SUPER_ADMIN, unrestricted.
        // otherwise => ADMIN must have this exact office in their scope
        // (primary office OR an AdminOfficeAccess assignment).
        if (officeScope !== undefined && !officeScope.includes(officeId)) {
          throw new ForbiddenError(
            "You do not have access to generate a QR code for this office",
          );
        }

        const record = await createQRTokenService(officeId, type);

        successResponse(res, StatusCodes.OK, {
            message: "QR generated saved successfully",
            data: record,
        });
    
    } catch (error) {
        
        if (
          error instanceof BadRequestError ||
          error instanceof NotFoundError ||
          error instanceof ForbiddenError
        )
          throw error;
        throw new BadRequestError("Failed to save record");
    }
};
