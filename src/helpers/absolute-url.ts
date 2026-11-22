import { Request } from "express";

export const absoluteAssetUrl = (req: Request, path: string): string => {
  const baseUrl = process.env.BACKEND_BASE_URL?.replace(/\/+$/, "")
    || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};
