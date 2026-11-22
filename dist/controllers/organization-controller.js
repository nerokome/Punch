"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentOrganizationController = exports.updateOrganizationBannerController = exports.uploadOrganizationImageController = exports.signupOrganizationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const errors_1 = require("../errors");
const helpers_1 = require("../helpers");
const organization_service_1 = require("../services/organization-service");
const signupOrganizationController = async (req, res) => {
    const result = await (0, organization_service_1.createOrganizationAccount)({
        organizationName: req.body.organizationName.trim(),
        name: req.body.name.trim(),
        email: req.body.email.trim().toLowerCase(),
        phone: req.body.phone.trim(),
        password: req.body.password,
        gender: req.body.gender,
    });
    const token = (0, helpers_1.generateJWT)(req, {
        id: result.owner.id,
        email: result.owner.email,
        name: result.owner.name,
        phone: result.owner.phone || "",
        role: result.owner.role,
        isVerified: result.owner.isVerified,
        isActive: result.owner.isActive,
        officeId: result.owner.officeId,
        organizationId: result.owner.organizationId,
        officeIds: [],
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: "Organization created. Add a logo or banner to continue.",
        organization: result.organization,
        user: result.owner,
        token,
    });
};
exports.signupOrganizationController = signupOrganizationController;
const uploadOrganizationImageController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (!req.file)
        throw new errors_1.BadRequestError("Choose an image to upload");
    if (req.body.imageType && req.body.imageType !== "banner") {
        throw new errors_1.BadRequestError("Only organization banners can be uploaded");
    }
    const url = (0, helpers_1.absoluteAssetUrl)(req, `/organizations/${req.file.filename}`);
    if (!req.currentUser.organizationId)
        throw new errors_1.BadRequestError("User is not assigned to an organization");
    const organization = await (0, organization_service_1.updateOrganizationImage)(req.currentUser.organizationId, url);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, { message: "Organization banner uploaded", organization });
};
exports.uploadOrganizationImageController = uploadOrganizationImageController;
const updateOrganizationBannerController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (!req.file)
        throw new errors_1.BadRequestError("Choose a banner image to upload");
    const url = (0, helpers_1.absoluteAssetUrl)(req, `/organizations/${req.file.filename}`);
    if (!req.currentUser.organizationId)
        throw new errors_1.BadRequestError("User is not assigned to an organization");
    const organization = await (0, organization_service_1.updateOrganizationImage)(req.currentUser.organizationId, url);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, { message: "Organization banner updated", organization });
};
exports.updateOrganizationBannerController = updateOrganizationBannerController;
const currentOrganizationController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (!req.currentUser.organizationId)
        throw new errors_1.BadRequestError("User is not assigned to an organization");
    const organization = await (0, organization_service_1.getOrganizationById)(req.currentUser.organizationId);
    if (!organization)
        throw new errors_1.BadRequestError("Organization account not found");
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, { organization });
};
exports.currentOrganizationController = currentOrganizationController;
