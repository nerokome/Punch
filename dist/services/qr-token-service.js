"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQRTokenService = void 0;
const client_1 = require("../client");
const uuid_1 = require("uuid");
const errors_1 = require("../errors");
const QR_TOKEN_EXPIRY_MINUTES = 720;
const createQRTokenService = async (officeId, type) => {
    const office = await client_1.prisma.officeLocation.findUnique({
        where: { id: officeId },
    });
    if (!office)
        throw new errors_1.BadRequestError("Office not found");
    const token = (0, uuid_1.v4)();
    try {
        const qRToken = await client_1.prisma.qRToken.create({
            data: {
                officeId,
                type,
                token,
                expiresAt: new Date(Date.now() + 1000 * 60 * QR_TOKEN_EXPIRY_MINUTES),
            },
        });
        return qRToken;
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to create QR token");
    }
};
exports.createQRTokenService = createQRTokenService;
