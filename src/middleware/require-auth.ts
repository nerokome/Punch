import { NextFunction, Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../errors";
import { KYCStatus } from "@prisma/client";

export const requireAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser) throw new UnauthorizedError();
  if (req.currentUser.isActive === KYCStatus.deactivated)
    throw new BadRequestError("Your account is disabled");
  next();
};
