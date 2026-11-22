import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { GenderEnum } from "@prisma/client";
import { BadRequestError } from "../errors";
import { absoluteAssetUrl, generateJWT, successResponse } from "../helpers";
import {
  createOrganizationAccount,
  getOrganizationById,
  getPlatformOrganizationSummary,
  updateOrganizationImage,
} from "../services/organization-service";

export const signupOrganizationController = async (req: Request, res: Response) => {
  const result = await createOrganizationAccount({
    organizationName: req.body.organizationName.trim(),
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    phone: req.body.phone.trim(),
    password: req.body.password,
    gender: req.body.gender as GenderEnum,
  });
  const token = generateJWT(req, {
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
  successResponse(res, StatusCodes.CREATED, {
    message: "Organization created. Add a logo or banner to continue.",
    organization: result.organization,
    user: result.owner,
    token,
  });
};

export const uploadOrganizationImageController = async (req: Request, res: Response) => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");
  if (!req.file) throw new BadRequestError("Choose an image to upload");
  if (req.body.imageType && req.body.imageType !== "banner") {
    throw new BadRequestError("Only organization banners can be uploaded");
  }
  const url = absoluteAssetUrl(req, `/organizations/${req.file.filename}`);
  if (!req.currentUser.organizationId) throw new BadRequestError("User is not assigned to an organization");
  const organization = await updateOrganizationImage(req.currentUser.organizationId, url);
  successResponse(res, StatusCodes.OK, { message: "Organization banner uploaded", organization });
};

export const updateOrganizationBannerController = async (req: Request, res: Response) => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");
  if (!req.file) throw new BadRequestError("Choose a banner image to upload");
  const url = absoluteAssetUrl(req, `/organizations/${req.file.filename}`);
  if (!req.currentUser.organizationId) throw new BadRequestError("User is not assigned to an organization");
  const organization = await updateOrganizationImage(req.currentUser.organizationId, url);
  successResponse(res, StatusCodes.OK, { message: "Organization banner updated", organization });
};

export const currentOrganizationController = async (req: Request, res: Response) => {
  if (!req.currentUser) throw new BadRequestError("User not authorized");
  if (!req.currentUser.organizationId) throw new BadRequestError("User is not assigned to an organization");
  const organization = await getOrganizationById(req.currentUser.organizationId);
  if (!organization) throw new BadRequestError("Organization account not found");
  successResponse(res, StatusCodes.OK, { organization });
};

export const platformOrganizationSummaryController = async (_req: Request, res: Response) => {
  const summary = await getPlatformOrganizationSummary();
  successResponse(res, StatusCodes.OK, {
    message: "Platform organization summary retrieved successfully",
    data: summary,
  });
};
