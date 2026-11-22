import { Request } from "express";
import multer, { FileFilterCallback } from "multer";

export const imageFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

export const pdfFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  if (!file.originalname.match(/\.(pdf|docx)$/)) {
    req.fileValidationError = "Only PDF files are allowed!";
    return cb(new Error("Only PDF files are allowed!"), false);
  }
  cb(null, true);
};

export const pdfImageFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|pdf|docx)$/)) {
    req.fileValidationError = "Only PDF files are allowed!";
    return cb(new Error("Only PDF files are allowed!"), false);
  }
  cb(null, true);
};

export const videoFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === "video/mp4") {
    cb(null, true);
  } else {
    cb(
      {
        message: "Unsupported File Format",
      },
      false
    );
  }
};

export const imageAndVideoFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: any
) => {
  const acceptedTypes = file.mimetype.split("/");

  if (acceptedTypes[0] === "image" || acceptedTypes[0] === "video") {
    cb(null, true);
  } else {
    cb(new Error("Only images and videos formats allowed!"), false);
  }
};

export enum uploadType {
  image = "image",
  video = "video",
  file = "file",
}

export const csvExcelFilter = (req: any, file: any, cb: FileFilterCallback) => {
  if (!file.originalname.match(/\.(csv|xlsx|xls)$/)) {
    return cb(new Error("Only CSV and Excel files are allowed!"));
  }
  cb(null, true);
};

export const uploadCsvExcel = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvExcelFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const createImageUploader = () => multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return cb(new Error("Upload a JPG, PNG, or WebP image"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadOrganizationImage = createImageUploader();
export const uploadProfilePicture = createImageUploader();
