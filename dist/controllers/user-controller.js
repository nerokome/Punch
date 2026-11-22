"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminOfficesController = exports.removeOfficeFromAdminController = exports.assignOfficeToAdminController = exports.userUpdatePasswordController = exports.bulkUploadUsersController = exports.adminUpdateUserController = exports.userUpdateProfileController = exports.getUserByIdController = exports.getUsersController = exports.updateUserProfilePictureController = exports.currentUserController = exports.loginUserController = exports.registerUserController = void 0;
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("../helpers");
const errors_1 = require("../errors");
const services_1 = require("../services");
const client_1 = require("@prisma/client");
const helpers_2 = require("../helpers");
const user_service_1 = require("../services/user-service");
const organization_access_1 = require("../helpers/organization-access");
const registerUserController = async (req, res) => {
    const { name, email, password, phone, officeId, role, gender } = req.body;
    let user = await (0, services_1.getUserByEmailService)(email);
    if (user)
        throw new errors_1.BadRequestError(`User with the email ${email} exists`);
    let office = await (0, services_1.getOfficeLocationByOfficeId)(officeId);
    if (!office)
        throw new errors_1.BadRequestError(`Office with the id ${officeId} does not exist`);
    await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
    const data = await (0, services_1.registerUserService)({
        name,
        email,
        password,
        phone,
        officeId,
        role,
        gender,
        isActive: client_1.KYCStatus.active,
        organizationId: req.currentUser?.organizationId ?? office.organizationId ?? null,
    });
    // await sendAdminUserSetPasswordLinkEmail(data.id, data.email);
    delete data.password;
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, data);
};
exports.registerUserController = registerUserController;
const loginUserController = async (req, res) => {
    const { email, password } = req.body;
    const userByEmail = await (0, services_1.getUserByEmailService)(email);
    if (!userByEmail)
        throw new errors_1.BadRequestError("Invalid credentials");
    const user = await (0, services_1.getUserWithOfficesService)(userByEmail.id, userByEmail.organizationId);
    if (!user)
        throw new errors_1.BadRequestError("Invalid credentials");
    const passwordMatch = await helpers_1.Password.comparePassword(password, user?.password);
    if (!passwordMatch)
        throw new errors_1.BadRequestError("Invalid credentials");
    if (user.isActive === client_1.KYCStatus.deactivated) {
        throw new errors_1.BadRequestError("Your account has been deactivated");
    }
    // Include both the legacy primary office and the explicit office-access
    // assignments. This keeps a newly issued token consistent with the
    // multi-office access model.
    const officeIds = user.role === client_1.Role.ADMIN
        ? await (0, services_1.getAdminOfficeIds)(user.id)
        : [];
    const userJWT = (0, helpers_1.generateJWT)(req, {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        officeId: user.officeId,
        organizationId: user.organizationId,
        officeIds,
    });
    delete user.password;
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        user,
        token: userJWT
    });
};
exports.loginUserController = loginUserController;
const currentUserController = async (req, res) => {
    if (!req.currentUser) {
        res.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).json({ currentUser: null });
        return;
    }
    const currentUser = await (0, services_1.getUserWithOfficesService)(req.currentUser.id, req.currentUser.organizationId);
    delete currentUser?.password;
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "success",
        currentUser
    });
};
exports.currentUserController = currentUserController;
const updateUserProfilePictureController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError("User not authorized");
    if (!req.file)
        throw new errors_1.BadRequestError("Choose a profile picture to upload");
    const profilePictureUrl = (0, helpers_2.absoluteAssetUrl)(req, `/profiles/${req.file.filename}`);
    const user = await (0, user_service_1.updateUserProfilePictureService)(req.currentUser.id, profilePictureUrl);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Profile picture updated",
        user,
    });
};
exports.updateUserProfilePictureController = updateUserProfilePictureController;
const getUsersController = async (req, res) => {
    if (!req.currentUser)
        throw new errors_1.BadRequestError('User not authorized');
    let officeFilter = undefined;
    let officeIds = [];
    const { page, limit, search, officeId: queryOfficeId } = req.query;
    if (req.currentUser.role === client_1.Role.SUPER_ADMIN) {
        // Platform super admins are unrestricted; organization owners are
        // filtered by their organization in the service.
        if (queryOfficeId && typeof queryOfficeId === 'string' && queryOfficeId.trim() !== '') {
            await (0, organization_access_1.assertOfficeInOrganization)(queryOfficeId, req.currentUser.organizationId);
            officeFilter = queryOfficeId;
        }
    }
    else if (req.currentUser.role === client_1.Role.ADMIN) {
        // Do not trust the list in the JWT here. Office assignments can be
        // added or removed while a token is still valid; resolving from the
        // database ensures this response always covers every currently
        // assigned office and never retains a removed assignment.
        officeIds = await (0, services_1.getAdminOfficeIds)(req.currentUser.id);
        if (officeIds.length === 0) {
            throw new errors_1.ForbiddenError("No offices assigned to this admin");
        }
    }
    else {
        throw new errors_1.ForbiddenError("Unauthorized access");
    }
    const users = await (0, services_1.getAllUsersService)({
        officeId: officeFilter,
        officeIds: officeIds,
        organizationId: req.currentUser.organizationId,
        page: page,
        limit: limit,
        searchTerm: search,
    });
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, users);
};
exports.getUsersController = getUsersController;
const getUserByIdController = async (req, res) => {
    const { id } = req.params;
    const user = await (0, services_1.getUserWithOfficesService)(id, req.currentUser?.organizationId);
    if (!user)
        throw new errors_1.NotFoundError("User not found");
    await (0, organization_access_1.assertUserInOrganization)(id, req.currentUser?.organizationId);
    delete user.password;
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, user);
};
exports.getUserByIdController = getUserByIdController;
const userUpdateProfileController = async (req, res) => {
    const email = req.currentUser?.email;
    if (!email)
        throw new errors_1.BadRequestError("Invalid email");
    let user = await (0, services_1.getUserByEmailService)(email);
    if (!user)
        throw new errors_1.BadRequestError("Invalid user - not found");
    const payload = {
        name: req.body.name || user.name,
        phone: req.body.phone || user.phone,
        officeId: req.body.officeId || user.officeId,
        gender: req.body.gender || user.gender,
    };
    if (req.body.officeId) {
        await (0, organization_access_1.assertOfficeInOrganization)(req.body.officeId, user.organizationId);
    }
    await (0, services_1.updateUserService)(user.id, payload);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: "User Profile updated",
    });
};
exports.userUpdateProfileController = userUpdateProfileController;
const adminUpdateUserController = async (req, res) => {
    const { id } = req.params;
    const user = await (0, services_1.getUserByIdService)(id);
    if (!user)
        throw new errors_1.NotFoundError("User not found");
    await (0, organization_access_1.assertUserInOrganization)(id, req.currentUser?.organizationId);
    const { name, email, phone, gender, officeId, role, isActive } = req.body;
    // The platform root account is provisioned only by the seed workflow.
    if (role === client_1.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError("The global super admin role cannot be assigned through this endpoint");
    }
    if (user.role === client_1.Role.SUPER_ADMIN && role !== undefined) {
        throw new errors_1.ForbiddenError("The global super admin role cannot be changed through this endpoint");
    }
    if (email && email !== user.email) {
        const existing = await (0, services_1.getUserByEmailService)(email);
        if (existing)
            throw new errors_1.BadRequestError(`A user with email ${email} already exists`);
    }
    if (officeId) {
        const office = await (0, services_1.getOfficeLocationByOfficeId)(officeId);
        if (!office)
            throw new errors_1.BadRequestError(`Office with id ${officeId} does not exist`);
        await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
    }
    const payload = {};
    if (name !== undefined)
        payload.name = name;
    if (email !== undefined)
        payload.email = email;
    if (phone !== undefined)
        payload.phone = phone;
    if (gender !== undefined)
        payload.gender = gender;
    if (officeId !== undefined) {
        payload.officeId = officeId;
        if (!req.currentUser?.organizationId) {
            const office = await (0, services_1.getOfficeLocationByOfficeId)(officeId);
            payload.organizationId = office?.organizationId ?? null;
        }
    }
    if (role !== undefined)
        payload.role = role;
    if (isActive !== undefined)
        payload.isActive = isActive;
    const updated = await (0, services_1.updateUserService)(id, payload);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, { message: "User updated successfully", user: updated });
};
exports.adminUpdateUserController = adminUpdateUserController;
const bulkUploadUsersController = async (req, res) => {
    const { officeId } = req.params;
    const office = await (0, services_1.getOfficeLocationByOfficeId)(officeId);
    if (!office)
        throw new errors_1.BadRequestError(`Office with id ${officeId} does not exist`);
    await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
    if (!req.file)
        throw new errors_1.BadRequestError("No file uploaded. Send a CSV or Excel file in the 'file' field");
    const result = await (0, services_1.bulkUploadUsersService)(req.file.buffer, officeId, req.currentUser?.organizationId ?? office.organizationId ?? null);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: `Bulk upload complete. ${result.created} user(s) created.`,
        ...result,
    });
};
exports.bulkUploadUsersController = bulkUploadUsersController;
const userUpdatePasswordController = async (req, res) => {
    const email = req.currentUser?.email;
    const { oldPassword, newPassword } = req.body;
    if (!email)
        throw new errors_1.BadRequestError("Invalid email");
    const user = await (0, services_1.getUserByEmailService)(email);
    if (!user)
        throw new errors_1.BadRequestError("Invalid credentials");
    const passwordMatch = await helpers_1.Password.comparePassword(oldPassword, user?.password);
    if (!passwordMatch)
        throw new errors_1.BadRequestError("Invalid credentials");
    await (0, services_1.updatePasswordService)(email, newPassword);
    (0, helpers_1.generateJWT)(req, {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone || "",
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        officeId: user.officeId,
    });
    // remove password from the user object
    delete user.password;
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: "password updated",
    });
};
exports.userUpdatePasswordController = userUpdatePasswordController;
// ---------------------------------------------------------------------------
// Admin <-> Office assignment endpoints (SUPER_ADMIN only — enforce that in
// your route middleware, e.g. requireRole(Role.SUPER_ADMIN), since it's not
// checked here).
// ---------------------------------------------------------------------------
const assignOfficeToAdminController = async (req, res) => {
    const { adminId, officeId } = req.params;
    await (0, organization_access_1.assertUserInOrganization)(adminId, req.currentUser?.organizationId);
    await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
    const access = await (0, services_1.assignOfficeToAdminService)(adminId, officeId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.CREATED, {
        message: "Office assigned to admin",
        access,
    });
};
exports.assignOfficeToAdminController = assignOfficeToAdminController;
const removeOfficeFromAdminController = async (req, res) => {
    const { adminId, officeId } = req.params;
    await (0, organization_access_1.assertUserInOrganization)(adminId, req.currentUser?.organizationId);
    await (0, organization_access_1.assertOfficeInOrganization)(officeId, req.currentUser?.organizationId);
    await (0, services_1.removeOfficeFromAdminService)(adminId, officeId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, {
        message: "Office removed from admin",
    });
};
exports.removeOfficeFromAdminController = removeOfficeFromAdminController;
const getAdminOfficesController = async (req, res) => {
    const { adminId } = req.params;
    await (0, organization_access_1.assertUserInOrganization)(adminId, req.currentUser?.organizationId);
    const offices = await (0, services_1.getAdminOfficesService)(adminId);
    (0, helpers_1.successResponse)(res, http_status_codes_1.StatusCodes.OK, offices);
};
exports.getAdminOfficesController = getAdminOfficesController;
