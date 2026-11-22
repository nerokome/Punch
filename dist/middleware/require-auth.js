"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthMiddleware = void 0;
const errors_1 = require("../errors");
const client_1 = require("@prisma/client");
const requireAuthMiddleware = (req, res, next) => {
    if (!req.currentUser)
        throw new errors_1.UnauthorizedError();
    if (req.currentUser.isActive === client_1.KYCStatus.deactivated)
        throw new errors_1.BadRequestError("Your account is disabled");
    next();
};
exports.requireAuthMiddleware = requireAuthMiddleware;
