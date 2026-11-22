"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProfilePicture = exports.uploadOrganizationImage = exports.uploadCsvExcel = exports.csvExcelFilter = exports.uploadType = exports.imageAndVideoFilter = exports.videoFilter = exports.pdfImageFilter = exports.pdfFilter = exports.imageFilter = void 0;
const multer_1 = __importDefault(require("multer"));
const imageFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = "Only image files are allowed!";
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
exports.imageFilter = imageFilter;
const pdfFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(pdf|docx)$/)) {
        req.fileValidationError = "Only PDF files are allowed!";
        return cb(new Error("Only PDF files are allowed!"), false);
    }
    cb(null, true);
};
exports.pdfFilter = pdfFilter;
const pdfImageFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|pdf|docx)$/)) {
        req.fileValidationError = "Only PDF files are allowed!";
        return cb(new Error("Only PDF files are allowed!"), false);
    }
    cb(null, true);
};
exports.pdfImageFilter = pdfImageFilter;
const videoFilter = (req, file, cb) => {
    if (file.mimetype === "video/mp4") {
        cb(null, true);
    }
    else {
        cb({
            message: "Unsupported File Format",
        }, false);
    }
};
exports.videoFilter = videoFilter;
const imageAndVideoFilter = (req, file, cb) => {
    const acceptedTypes = file.mimetype.split("/");
    if (acceptedTypes[0] === "image" || acceptedTypes[0] === "video") {
        cb(null, true);
    }
    else {
        cb(new Error("Only images and videos formats allowed!"), false);
    }
};
exports.imageAndVideoFilter = imageAndVideoFilter;
var uploadType;
(function (uploadType) {
    uploadType["image"] = "image";
    uploadType["video"] = "video";
    uploadType["file"] = "file";
})(uploadType || (exports.uploadType = uploadType = {}));
const csvExcelFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(csv|xlsx|xls)$/)) {
        return cb(new Error("Only CSV and Excel files are allowed!"));
    }
    cb(null, true);
};
exports.csvExcelFilter = csvExcelFilter;
exports.uploadCsvExcel = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: exports.csvExcelFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});
const createImageUploader = () => (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            return cb(new Error("Upload a JPG, PNG, or WebP image"));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});
exports.uploadOrganizationImage = createImageUploader();
exports.uploadProfilePicture = createImageUploader();
