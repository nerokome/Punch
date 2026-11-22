import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import {
  generateJWT,
  Password,
  successResponse,
} from "../helpers";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";
import Logger from "../logger";
import axios from "axios";
import { sendAdminUserSetPasswordLinkEmail } from "../helpers/emails";
import {
  bulkUploadUsersService,
  getAllUsersService,
  getOfficeLocationByOfficeId,
  getUserByEmailService,
  getUserByIdService,
  registerUserService,
  updatePasswordService,
  updateUserService,
  getAdminOfficesService,
  getUserWithOfficesService,
  getAdminOfficeIds,
  assignOfficeToAdminService,
  removeOfficeFromAdminService,
} from "../services";
import { KYCStatus, Role } from "@prisma/client";
import moment from "moment";
import { absoluteAssetUrl } from "../helpers";
import { updateUserProfilePictureService } from "../services/user-service";
import { assertOfficeInOrganization, assertUserInOrganization } from "../helpers/organization-access";

export const registerUserController = async (req: Request, res: Response): Promise<void> => {
    const { 
        name,
        email,
        password,
        phone,
        officeId,
        role,
        gender
     } = req.body;
  
    let user = await getUserByEmailService(email);
  
    if (user)
      throw new BadRequestError(`User with the email ${email} exists`);

    let office = await getOfficeLocationByOfficeId(officeId);
    if (!office)
      throw new BadRequestError(`Office with the id ${officeId} does not exist`);
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);

    const data = await registerUserService({
        name,
        email,
        password,
        phone,
        officeId,
        role,
        gender,
        isActive: KYCStatus.active,
        organizationId: req.currentUser?.organizationId ?? office.organizationId ?? null,
    });
  
  
    // await sendAdminUserSetPasswordLinkEmail(data.id, data.email);
    delete data.password
  
    successResponse(res, StatusCodes.CREATED, data);
};

export const loginUserController = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const userByEmail = await getUserByEmailService(email);
    if (!userByEmail) throw new BadRequestError("Invalid credentials");
    const user = await getUserWithOfficesService(userByEmail.id, userByEmail.organizationId);
  
    if (!user) throw new BadRequestError("Invalid credentials");
  
    const passwordMatch = await Password.comparePassword(
        password,
        user?.password!
      );
    
    if (!passwordMatch) throw new BadRequestError("Invalid credentials");

    if(user.isActive === KYCStatus.deactivated) {
        throw new BadRequestError("Your account has been deactivated");
    }

    // Include both the legacy primary office and the explicit office-access
    // assignments. This keeps a newly issued token consistent with the
    // multi-office access model.
    const officeIds =
      user.role === Role.ADMIN
        ? await getAdminOfficeIds(user.id)
        : [];

    const userJWT = generateJWT(req, {
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

    successResponse(res, StatusCodes.OK, {
      user,
      token: userJWT
    });
};

export const currentUserController = async (req: Request, res: Response): Promise<void> => {
    if (!req.currentUser) {
        res.status(StatusCodes.UNAUTHORIZED).json({ currentUser: null });
        return
    }
  
    const currentUser = await getUserWithOfficesService(req.currentUser.id, req.currentUser.organizationId)
    delete currentUser?.password;
    
    successResponse(res, StatusCodes.OK, {
        message: "success",
        currentUser
    });
};

export const updateUserProfilePictureController = async (req: Request, res: Response): Promise<void> => {
    if (!req.currentUser) throw new BadRequestError("User not authorized");
    if (!req.file) throw new BadRequestError("Choose a profile picture to upload");
    const profilePictureUrl = absoluteAssetUrl(req, `/profiles/${req.file.filename}`);
    const user = await updateUserProfilePictureService(req.currentUser.id, profilePictureUrl);
    successResponse(res, StatusCodes.OK, {
      message: "Profile picture updated",
      user,
    });
};

export const getUsersController = async (req: Request, res: Response): Promise<void> => {

    if(!req.currentUser) throw new BadRequestError('User not authorized')

    let officeFilter = undefined;
    let officeIds: string[] = [];
    
    const { page, limit, search, officeId: queryOfficeId } = req.query;

    if (req.currentUser.role === Role.SUPER_ADMIN) {
      // Platform super admins are unrestricted; organization owners are
      // filtered by their organization in the service.
      if (queryOfficeId && typeof queryOfficeId === 'string' && queryOfficeId.trim() !== '') {
        await assertOfficeInOrganization(queryOfficeId, req.currentUser.organizationId);
        officeFilter = queryOfficeId;
      }
    } else if (req.currentUser.role === Role.ADMIN) {
    
      // Do not trust the list in the JWT here. Office assignments can be
      // added or removed while a token is still valid; resolving from the
      // database ensures this response always covers every currently
      // assigned office and never retains a removed assignment.
      officeIds = await getAdminOfficeIds(req.currentUser.id);

      if (officeIds.length === 0) {
        throw new ForbiddenError("No offices assigned to this admin");
      }
    } else {
      throw new ForbiddenError("Unauthorized access");
    }

    const users = await getAllUsersService({
      officeId: officeFilter,
      officeIds: officeIds,
      organizationId: req.currentUser.organizationId,
      page: page as any,
      limit: limit as any,
      searchTerm: search as string,
    });
    successResponse(res, StatusCodes.OK, users);
};

export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
  
    const user = await getUserWithOfficesService(id, req.currentUser?.organizationId);
  
    if (!user) throw new NotFoundError("User not found");
    await assertUserInOrganization(id, req.currentUser?.organizationId);
  
    delete user.password;
  
    successResponse(res, StatusCodes.OK, user);
};

export const userUpdateProfileController = async (req: Request, res: Response): Promise<void> => {
    const email = req.currentUser?.email
    if(!email) throw new BadRequestError("Invalid email");
  
    let user = await getUserByEmailService(email)
  
    if(!user) throw new BadRequestError("Invalid user - not found");
  
    const payload = {
        name: req.body.name || user.name,
        phone: req.body.phone || user.phone,
        officeId: req.body.officeId || user.officeId,
        gender: req.body.gender || user.gender,
    }

    if (req.body.officeId) {
      await assertOfficeInOrganization(req.body.officeId, user.organizationId);
    }
  
    await updateUserService(user.id, payload)
  
    successResponse(res, StatusCodes.CREATED, {
      message: "User Profile updated",
    });
};


export const adminUpdateUserController = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const user = await getUserByIdService(id);
    if (!user) throw new NotFoundError("User not found");
    await assertUserInOrganization(id, req.currentUser?.organizationId);

    const { name, email, phone, gender, officeId, role, isActive } = req.body;

    // The platform root account is provisioned only by the seed workflow.
    if (role === Role.SUPER_ADMIN) {
      throw new ForbiddenError("The global super admin role cannot be assigned through this endpoint");
    }
    if (user.role === Role.SUPER_ADMIN && role !== undefined) {
      throw new ForbiddenError("The global super admin role cannot be changed through this endpoint");
    }

    if (email && email !== user.email) {
        const existing = await getUserByEmailService(email);
        if (existing) throw new BadRequestError(`A user with email ${email} already exists`);
    }

    if (officeId) {
        const office = await getOfficeLocationByOfficeId(officeId);
        if (!office) throw new BadRequestError(`Office with id ${officeId} does not exist`);
        await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);
    }

    const payload: Record<string, unknown> = {};
    if (name !== undefined) payload.name = name;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;
    if (gender !== undefined) payload.gender = gender;
    if (officeId !== undefined) {
      payload.officeId = officeId;
      if (!req.currentUser?.organizationId) {
        const office = await getOfficeLocationByOfficeId(officeId);
        payload.organizationId = office?.organizationId ?? null;
      }
    }
    if (role !== undefined) payload.role = role;
    if (isActive !== undefined) payload.isActive = isActive;

    const updated = await updateUserService(id, payload as any);

    successResponse(res, StatusCodes.OK, { message: "User updated successfully", user: updated });
};

export const bulkUploadUsersController = async (req: Request, res: Response): Promise<void> => {
    const { officeId } = req.params;

    const office = await getOfficeLocationByOfficeId(officeId);
    if (!office) throw new BadRequestError(`Office with id ${officeId} does not exist`);
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);

    if (!req.file) throw new BadRequestError("No file uploaded. Send a CSV or Excel file in the 'file' field");

    const result = await bulkUploadUsersService(req.file.buffer, officeId, req.currentUser?.organizationId ?? office.organizationId ?? null);

    successResponse(res, StatusCodes.CREATED, {
        message: `Bulk upload complete. ${result.created} user(s) created.`,
        ...result,
    });
};

export const userUpdatePasswordController = async (req: Request, res: Response): Promise<void> => {
    const email = req.currentUser?.email
    const { oldPassword, newPassword } = req.body;
  
    if(!email) throw new BadRequestError("Invalid email");
  
    const user = await getUserByEmailService(email);
  
    if (!user) throw new BadRequestError("Invalid credentials");
    
    const passwordMatch = await Password.comparePassword(
      oldPassword,
      user?.password!
    );
  
    if (!passwordMatch) throw new BadRequestError("Invalid credentials");
  
    await updatePasswordService(email, newPassword);
  
    generateJWT(req, {
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
  
  
    successResponse(res, StatusCodes.CREATED, {
      message: "password updated",
    });
};

// ---------------------------------------------------------------------------
// Admin <-> Office assignment endpoints (SUPER_ADMIN only — enforce that in
// your route middleware, e.g. requireRole(Role.SUPER_ADMIN), since it's not
// checked here).
// ---------------------------------------------------------------------------

export const assignOfficeToAdminController = async (req: Request, res: Response): Promise<void> => {
    const { adminId, officeId } = req.params;
    await assertUserInOrganization(adminId, req.currentUser?.organizationId);
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);

    const access = await assignOfficeToAdminService(adminId, officeId);

    successResponse(res, StatusCodes.CREATED, {
      message: "Office assigned to admin",
      access,
    });
};

export const removeOfficeFromAdminController = async (req: Request, res: Response): Promise<void> => {
    const { adminId, officeId } = req.params;
    await assertUserInOrganization(adminId, req.currentUser?.organizationId);
    await assertOfficeInOrganization(officeId, req.currentUser?.organizationId);

    await removeOfficeFromAdminService(adminId, officeId);

    successResponse(res, StatusCodes.OK, {
      message: "Office removed from admin",
    });
};

export const getAdminOfficesController = async (req: Request, res: Response): Promise<void> => {
    const { adminId } = req.params;
    await assertUserInOrganization(adminId, req.currentUser?.organizationId);

    const offices = await getAdminOfficesService(adminId);

    successResponse(res, StatusCodes.OK, offices);
};
