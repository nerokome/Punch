"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = __importDefault(require("./logger"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("./client");
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_cron_1 = __importDefault(require("node-cron"));
const attendance_service_1 = require("./services/attendance-service");
const PORT = process.env.PORT || 3000;
// start the express app
const start = async () => {
    try {
        logger_1.default.info("connected to the database");
        const PORT = process.env.PORT || 5000;
        let httpServer;
        let newPORT;
        if (process.env.NODE_ENV === "production") {
            const options = {
                cert: fs_1.default.readFileSync(path_1.default.resolve(__dirname, "outcess-ssl", "2025-ssl.pem"), "utf8"),
                key: fs_1.default.readFileSync(path_1.default.resolve(__dirname, "outcess-ssl", "2025-ssl.key"), "utf8"),
                passphrase: process.env.PASS_PHRASE,
            };
            httpServer = https_1.default.createServer(options, app_1.default);
            newPORT = 7000;
        }
        else {
            httpServer = http_1.default.createServer(app_1.default);
            newPORT = PORT;
        }
        // Set up Socket.IO
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*",
            },
        });
        // Authenticate sockets and derive office rooms from database assignments;
        // clients cannot subscribe themselves to another office's notifications.
        io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth?.token;
                if (typeof token !== "string" || !process.env.JWT_SECRET) {
                    return next(new Error("Unauthorized"));
                }
                const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                if (!payload.id)
                    return next(new Error("Unauthorized"));
                const user = await client_1.prisma.user.findUnique({
                    where: { id: payload.id },
                    select: { id: true, role: true, isActive: true, officeId: true, organizationId: true },
                });
                if (!user || user.isActive !== "active")
                    return next(new Error("Unauthorized"));
                let officeIds = [];
                if (user.role === "SUPER_ADMIN" && !user.organizationId) {
                    officeIds = (await client_1.prisma.officeLocation.findMany({ select: { id: true } })).map((office) => office.id);
                }
                else if (user.role === "ADMIN" && user.organizationId) {
                    officeIds = (await client_1.prisma.officeLocation.findMany({
                        where: { organizationId: user.organizationId }, select: { id: true },
                    })).map((office) => office.id);
                }
                else if (user.role === "ADMIN") {
                    const accesses = await client_1.prisma.adminOfficeAccess.findMany({
                        where: { adminId: user.id }, select: { officeId: true },
                    });
                    officeIds = [...new Set([user.officeId, ...accesses.map((row) => row.officeId)].filter((id) => Boolean(id)))];
                }
                else if (user.officeId) {
                    officeIds = [user.officeId];
                }
                socket.data.user = { id: user.id, role: user.role, officeIds };
                next();
            }
            catch {
                next(new Error("Unauthorized"));
            }
        });
        // Socket.IO connection
        io.on("connection", (socket) => {
            logger_1.default.info(`New client connected: ${socket.id}`);
            const currentUser = socket.data.user;
            currentUser.officeIds.forEach((officeId) => {
                socket.join(`office:${officeId}`);
                socket.join(officeId); // Keep existing attendance event subscribers compatible.
            });
            let locationTimeout;
            const armLocationTimeout = () => {
                if (locationTimeout)
                    clearTimeout(locationTimeout);
                locationTimeout = setTimeout(() => {
                    if (currentUser.role === "AGENT") {
                        void (0, attendance_service_1.pauseAttendanceForLostLocation)(currentUser.id).catch((error) => {
                            logger_1.default.error("Could not pause attendance after stale location", error);
                        });
                    }
                }, 30000);
            };
            if (currentUser.role === "AGENT")
                armLocationTimeout();
            socket.on("join-office", (officeId) => {
                if (typeof officeId === "string" && currentUser.officeIds.includes(officeId)) {
                    socket.join(`office:${officeId}`);
                    socket.join(officeId);
                }
            });
            // Agent clients should send a GPS sample every 10–15 seconds while an
            // attendance session is open (and immediately on geolocation changes).
            let lastLocationAt = 0;
            socket.on("attendance:location", async (location) => {
                if (currentUser.role !== "AGENT")
                    return;
                const now = Date.now();
                if (now - lastLocationAt < 5000)
                    return;
                lastLocationAt = now;
                armLocationTimeout();
                try {
                    const result = await (0, attendance_service_1.processAttendanceLocation)(currentUser.id, Number(location?.latitude), Number(location?.longitude));
                    socket.emit("attendance:location-result", result);
                }
                catch (error) {
                    socket.emit("attendance:tracking-error", { message: "Could not update attendance location" });
                }
            });
            socket.on("disconnect", () => {
                logger_1.default.info(`Client disconnected: ${socket.id}`);
                if (locationTimeout)
                    clearTimeout(locationTimeout);
                if (currentUser.role === "AGENT") {
                    void (0, attendance_service_1.pauseAttendanceForLostLocation)(currentUser.id).catch((error) => {
                        logger_1.default.error("Could not pause attendance after location disconnect", error);
                    });
                }
            });
        });
        // Export io to use in controllers
        global.io = io;
        const startAutoCheckoutJob = () => {
            node_cron_1.default.schedule("* * * * *", async () => {
                try {
                    const autoCheckedOutCount = await (0, attendance_service_1.autoCheckoutOpenAttendances)();
                    if (autoCheckedOutCount > 0) {
                        logger_1.default.info(`Auto-checked out ${autoCheckedOutCount} open attendance records`);
                    }
                }
                catch (error) {
                    logger_1.default.error("Auto checkout job failed", error);
                }
            });
        };
        startAutoCheckoutJob();
        httpServer.listen(newPORT, () => {
            logger_1.default.info(`Server started on port ${newPORT} 🔥🔥🔥`);
        });
    }
    catch (err) {
        logger_1.default.error(err);
        await client_1.prisma.$disconnect();
        process.exit(1);
    }
};
start();
