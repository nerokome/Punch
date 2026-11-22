"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentUserMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../client");
const currentUserMiddleware = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Set token from Bearer Token
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        // throw new BadRequestError("Invalid email");
        res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({ Message: 'Not Logged In' });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(
        // req.session.jwt,
        token, process.env.JWT_SECRET);
        const user = await client_1.prisma.user.findUnique({
            where: { id: payload.id },
            select: { role: true, isActive: true, organizationId: true, officeId: true },
        });
        if (!user) {
            res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
            return;
        }
        let officeIds = payload.officeIds;
        if (user.role === "ADMIN") {
            if (user.organizationId) {
                // Tenant admins can manage all locations and staff in their own org.
                const offices = await client_1.prisma.officeLocation.findMany({
                    where: { organizationId: user.organizationId },
                    select: { id: true },
                });
                officeIds = offices.map(({ id }) => id);
            }
            else {
                const accesses = await client_1.prisma.adminOfficeAccess.findMany({
                    where: {
                        adminId: payload.id,
                    },
                    select: { officeId: true },
                });
                const candidates = [...new Set([user.officeId, ...accesses.map(({ officeId }) => officeId)].filter((id) => Boolean(id)))];
                const offices = await client_1.prisma.officeLocation.findMany({
                    where: {
                        id: { in: candidates },
                    },
                    select: { id: true },
                });
                officeIds = offices.map(({ id }) => id);
            }
        }
        req.currentUser = { ...payload, ...user, officeIds };
    }
    catch (error) {
        res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({ message: "Invalid token" });
        return;
    }
    next();
};
exports.currentUserMiddleware = currentUserMiddleware;
