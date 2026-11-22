"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const helpers_1 = require("./helpers");
const logger_1 = __importDefault(require("./logger"));
const prismaClient = new client_1.PrismaClient({
    log: [
        { level: "error", emit: "event" },
        { level: "query", emit: "event" },
    ],
    errorFormat: "pretty",
});
// intercept and hash passwords before save
prismaClient.$use(async (params, next) => {
    if ((params.model == "User") &&
        (params.action == "create" || params.action == "update")) {
        // Never log credentials or other user data during password writes.
        if (params.args.data.password) {
            const hashedPassword = await helpers_1.Password.toHash(params.args.data.password);
            params.args["data"] = {
                ...params.args.data,
                password: hashedPassword,
            };
        }
        else {
            params.args["data"] = {
                ...params.args.data,
            };
        }
    }
    return next(params);
});
prismaClient.$on("query", (e) => logger_1.default.info(e));
prismaClient.$on("error", (e) => logger_1.default.error(e));
exports.prisma = prismaClient;
