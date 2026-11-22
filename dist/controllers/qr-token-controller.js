"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQRTOkenController = void 0;
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const services_1 = require("../services");
const generateQRTOkenController = async (req, res) => {
    try {
        if (!req.currentUser)
            throw new errors_1.BadRequestError("User not authorized");
        const { officeId, type, } = req.body;
        if (!officeId)
            throw new errors_1.BadRequestError("officeId is required");
        if (!type)
            throw new errors_1.BadRequestError("type is required");
        // AGENT should never reach this at all — only ADMIN/SUPER_ADMIN can
        // generate QR codes. resolveOfficeScope throws for any other role,
        // which the catch block below now correctly surfaces (previously
        // it would have been swallowed into a misleading BadRequestError).
        const officeScope = await (0, services_1.resolveOfficeScope)(req.currentUser.role, req.currentUser.id, req.currentUser.organizationId);
        // undefined => SUPER_ADMIN, unrestricted.
        // otherwise => ADMIN must have this exact office in their scope
        // (primary office OR an AdminOfficeAccess assignment).
        if (officeScope !== undefined && !officeScope.includes(officeId)) {
            throw new errors_1.ForbiddenError("You do not have access to generate a QR code for this office");
        }
        const record = await (0, services_1.createQRTokenService)(officeId, type);
        (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
            message: "QR generated saved successfully",
            data: record,
        });
    }
    catch (error) {
        if (error instanceof errors_1.BadRequestError ||
            error instanceof errors_1.NotFoundError ||
            error instanceof errors_1.ForbiddenError)
            throw error;
        throw new errors_1.BadRequestError("Failed to save record");
    }
};
exports.generateQRTOkenController = generateQRTOkenController;
