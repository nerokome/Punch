import { KYCStatus, Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors";


// export const isHRExecutive = (req: Request, _: Response, next: NextFunction) => {
//   // if (req.currentUser?.role !== Role.AFCTCA) throw new ForbiddenError();
//   // if (req.currentUser?.role !== Role.OLD_MUTUAL) throw new ForbiddenError();
//   if (req.currentUser?.role === Role.HR_EXECUTIVE || req.currentUser?.role === Role.SUPER_ADMIN || req.currentUser?.role === Role.HR_MANAGER) {
//     next();
//   } else {
//     throw new ForbiddenError();
//   }
// };



export const isSuperAdmin = (req: Request, _: Response, next: NextFunction) => {
  const user = req.currentUser;
  const canManage = user?.role === Role.ADMIN ||
    (user?.role === Role.SUPER_ADMIN && !user.organizationId);
  if (canManage && user?.isActive === KYCStatus.active) return next();
  throw new ForbiddenError();
};

export const isPlatformSuperAdmin = (req: Request, _: Response, next: NextFunction) => {
  const user = req.currentUser;
  if (
    user?.role === Role.SUPER_ADMIN &&
    !user.organizationId &&
    user.isActive === KYCStatus.active
  ) return next();
  throw new ForbiddenError();
};

export const isSuper = (req: Request, _: Response, next: NextFunction) => {
  // if (req.currentUser?.role !== Role.SUPER_ADMIN && req.currentUser?.isEnabled)
  //   throw new ForbiddenError();
  // next();
  const user = req.currentUser;
  const canCreateOffice = user?.role === Role.ADMIN ||
    (user?.role === Role.SUPER_ADMIN && !user.organizationId);
  if (canCreateOffice && user?.isActive === KYCStatus.active) return next();
  throw new ForbiddenError();
};

export const uploadCategory = {
  public: process.env.AWS_PUBLIC_CATEGORY! + "/",
  private: process.env.AWS_PRIVATE_CATEGORY! + "/",
};
