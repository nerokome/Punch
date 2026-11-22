"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCategory = exports.isSuper = exports.isPlatformSuperAdmin = exports.isSuperAdmin = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../errors");
// export const isHRExecutive = (req: Request, _: Response, next: NextFunction) => {
//   // if (req.currentUser?.role !== Role.AFCTCA) throw new ForbiddenError();
//   // if (req.currentUser?.role !== Role.OLD_MUTUAL) throw new ForbiddenError();
//   if (req.currentUser?.role === Role.HR_EXECUTIVE || req.currentUser?.role === Role.SUPER_ADMIN || req.currentUser?.role === Role.HR_MANAGER) {
//     next();
//   } else {
//     throw new ForbiddenError();
//   }
// };
const isSuperAdmin = (req, _, next) => {
    const user = req.currentUser;
    const canManage = user?.role === client_1.Role.ADMIN ||
        (user?.role === client_1.Role.SUPER_ADMIN && !user.organizationId);
    if (canManage && user?.isActive === client_1.KYCStatus.active)
        return next();
    throw new errors_1.ForbiddenError();
};
exports.isSuperAdmin = isSuperAdmin;
const isPlatformSuperAdmin = (req, _, next) => {
    const user = req.currentUser;
    if (user?.role === client_1.Role.SUPER_ADMIN &&
        !user.organizationId &&
        user.isActive === client_1.KYCStatus.active)
        return next();
    throw new errors_1.ForbiddenError();
};
exports.isPlatformSuperAdmin = isPlatformSuperAdmin;
const isSuper = (req, _, next) => {
    // if (req.currentUser?.role !== Role.SUPER_ADMIN && req.currentUser?.isEnabled)
    //   throw new ForbiddenError();
    // next();
    const user = req.currentUser;
    const canCreateOffice = user?.role === client_1.Role.ADMIN ||
        (user?.role === client_1.Role.SUPER_ADMIN && !user.organizationId);
    if (canCreateOffice && user?.isActive === client_1.KYCStatus.active)
        return next();
    throw new errors_1.ForbiddenError();
};
exports.isSuper = isSuper;
exports.uploadCategory = {
    public: process.env.AWS_PUBLIC_CATEGORY + "/",
    private: process.env.AWS_PRIVATE_CATEGORY + "/",
};
