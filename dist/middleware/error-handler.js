"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.errorHandlerMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const logger_1 = __importDefault(require("../logger"));
const errorHandlerMiddleware = (err, req, res, next) => {
    // Server related errors
    // if (err instanceof CustomError) {
    //   Logger.error(err.serializeErrors());
    //   return res.status(err.statusCode).json({ errors: err.serializeErrors() });
    // }
    if (process.env.NODE_ENV === "production")
        logger_1.default.error({ err });
    logger_1.default.error({ err });
    // Prisma related errors
    // if (err instanceof Prisma.PrismaClientKnownRequestError) {
    //   if (err.code === "P2002")
    //     return res
    //       .status(StatusCodes.BAD_REQUEST)
    //       .json({ errors: [{ message: "Unique constraint" }] });
    //   if (err.code === "P2025")
    //     return res
    //       .status(StatusCodes.BAD_REQUEST)
    //       .json({ errors: [{ message: err.meta?.cause }] });
    //   return res
    //     .status(StatusCodes.BAD_REQUEST)
    //     .json({ errors: [{ message: "Something went wrong" }] });
    // }
    // if (err instanceof Prisma.PrismaClientValidationError) {
    //   return res
    //     .status(StatusCodes.BAD_REQUEST)
    //     .json({ errors: [{ message: "please fill out all fields" }] });
    // }
    // Other uncaught errors
    res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
        errors: [{ message: err.message }],
    });
    // next();
};
exports.errorHandlerMiddleware = errorHandlerMiddleware;
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    if (process.env.NODE_ENV === "production")
        logger_1.default.error({ err });
    logger_1.default.error({ err });
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};
exports.errorHandler = errorHandler;
