"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
// import "express-async-errors";
// global.__basedir = __dirname;
// initialize the express app
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// security middleware
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const xssClean = require("xss-clean");
// application middleware
const routes_1 = require("./routes");
const middleware_1 = require("./middleware");
const http_status_codes_1 = require("http-status-codes");
const logger_1 = __importDefault(require("./logger"));
const path_1 = __importDefault(require("path"));
// use security middleware
// app.set("trust proxy", 1);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
// app.use(
//   cors({
//     origin: [
//       process.env.FRONTEND_BASE_URL!,
//       process.env.DASHBOARD_BASE_URL!,
//       "http://localhost:3001",
//       "http://localhost:3002",
//       "http://localhost:3003",
//       "http://localhost:3004",
//       "http://localhost:3005",
//     ],
//     credentials: true,
//   })
// );
app.use((0, cors_1.default)());
// app.use(xssClean());
app.use((0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 60,
    handler: (_, res) => {
        return res
            .status(http_status_codes_1.StatusCodes.TOO_MANY_REQUESTS)
            .json({ errors: [{ message: "Too many requests!" }] });
    },
}));
// endpoint url logs
app.use(function (req, _, next) {
    const requestMethod = req.method;
    const fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
    logger_1.default.info(`[ ${requestMethod} ] ${fullUrl}`);
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.get("/signup", (_, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/signup.html"));
});
app.use(express_1.default.static(path_1.default.join(__dirname, '/../src/resources/static/assets/uploads/')));
// home route
app.get("/api/v1", (_, res, next) => {
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ message: "ATTENDANCE BACKEND 1.0 🔥🔥🔥" });
});
app.get("/api/v1/auth/error", (_, res, next) => {
    res.send("Authentication failed");
});
app.use("/api/v1", routes_1.applicationRoutes);
// Keep the original unversioned API paths working for existing clients.
app.use(routes_1.applicationRoutes);
// Use error Middleware
// error handler middleware
app.use(middleware_1.errorHandlerMiddleware);
// not found middleware
app.use(middleware_1.notFound);
exports.default = app;
