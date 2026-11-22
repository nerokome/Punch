import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { UserPayload } from "../typings/express";
import { prisma } from "../client";

export const currentUserMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {

  let token

  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Set token from Bearer Token
      token = req.headers.authorization.split(' ')[1]
  }

  if(!token) {
    // throw new BadRequestError("Invalid email");
    res.status(StatusCodes.UNAUTHORIZED).json({ Message: 'Not Logged In' });
    return;
}

  try {
    const payload = jwt.verify(
      // req.session.jwt,
      token,
      process.env.JWT_SECRET!
    ) as UserPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { role: true, isActive: true, organizationId: true, officeId: true },
    });
    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
      return;
    }
    let officeIds = payload.officeIds;
    if (user.role === "ADMIN") {
      if (user.organizationId) {
        // Tenant admins can manage all locations and staff in their own org.
        const offices = await prisma.officeLocation.findMany({
          where: { organizationId: user.organizationId },
          select: { id: true },
        });
        officeIds = offices.map(({ id }) => id);
      } else {
      const accesses = await prisma.adminOfficeAccess.findMany({
        where: {
          adminId: payload.id,
        },
        select: { officeId: true },
      });
      const candidates = [...new Set([user.officeId, ...accesses.map(({ officeId }) => officeId)].filter((id): id is string => Boolean(id)))];
      const offices = await prisma.officeLocation.findMany({
        where: {
          id: { in: candidates },
        },
        select: { id: true },
      });
      officeIds = offices.map(({ id }) => id);
      }
    }
    req.currentUser = { ...payload, ...user, officeIds };
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
    return;
  }
  next();
};
