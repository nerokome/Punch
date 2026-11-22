import app from "./app";
import Logger from "./logger";
import { createServer } from "http";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
import { prisma } from "./client";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import cron from "node-cron";
import { autoCheckoutOpenAttendances, pauseAttendanceForLostLocation, processAttendanceLocation } from "./services/attendance-service";
// start the express app
const start = async () => {
  try {
    Logger.info("connected to the database");

    // Render and other hosted platforms terminate HTTPS at their load balancer,
    // so the app should serve plain HTTP there. Enable in-process HTTPS only
    // when certificate paths are explicitly configured.
    const certPath = process.env.SSL_CERT_PATH;
    const keyPath = process.env.SSL_KEY_PATH;
    if (Boolean(certPath) !== Boolean(keyPath)) {
      throw new Error("Set both SSL_CERT_PATH and SSL_KEY_PATH to enable HTTPS");
    }

    const httpServer = certPath && keyPath
      ? https.createServer({
          cert: fs.readFileSync(path.resolve(certPath), "utf8"),
          key: fs.readFileSync(path.resolve(keyPath), "utf8"),
          passphrase: process.env.PASS_PHRASE,
        }, app)
      : http.createServer(app);
    const port = Number(process.env.PORT) || 5000;

    // Set up Socket.IO
    const io = new SocketIOServer(httpServer, {
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
        const payload = jwt.verify(token, process.env.JWT_SECRET) as { id?: string };
        if (!payload.id) return next(new Error("Unauthorized"));
        const user = await prisma.user.findUnique({
          where: { id: payload.id },
          select: { id: true, role: true, isActive: true, officeId: true, organizationId: true },
        });
        if (!user || user.isActive !== "active") return next(new Error("Unauthorized"));

        let officeIds: string[] = [];
        if (user.role === "SUPER_ADMIN" && !user.organizationId) {
          officeIds = (await prisma.officeLocation.findMany({ select: { id: true } })).map((office) => office.id);
        } else if (user.role === "ADMIN" && user.organizationId) {
          officeIds = (await prisma.officeLocation.findMany({
            where: { organizationId: user.organizationId }, select: { id: true },
          })).map((office) => office.id);
        } else if (user.role === "ADMIN") {
          const accesses = await prisma.adminOfficeAccess.findMany({
            where: { adminId: user.id }, select: { officeId: true },
          });
          officeIds = [...new Set([user.officeId, ...accesses.map((row) => row.officeId)].filter((id): id is string => Boolean(id)))];
        } else if (user.officeId) {
          officeIds = [user.officeId];
        }
        socket.data.user = { id: user.id, role: user.role, officeIds };
        next();
      } catch {
        next(new Error("Unauthorized"));
      }
    });

    // Socket.IO connection
    io.on("connection", (socket) => {
      Logger.info(`New client connected: ${socket.id}`);

      const currentUser = socket.data.user as { id: string; role: string; officeIds: string[] };
      currentUser.officeIds.forEach((officeId) => {
        socket.join(`office:${officeId}`);
        socket.join(officeId); // Keep existing attendance event subscribers compatible.
      });
      let locationTimeout: NodeJS.Timeout | undefined;
      const armLocationTimeout = () => {
        if (locationTimeout) clearTimeout(locationTimeout);
        locationTimeout = setTimeout(() => {
          if (currentUser.role === "AGENT") {
            void pauseAttendanceForLostLocation(currentUser.id).catch((error) => {
              Logger.error("Could not pause attendance after stale location", error);
            });
          }
        }, 30000);
      };
      if (currentUser.role === "AGENT") armLocationTimeout();

      socket.on("join-office", (officeId: string) => {
        if (typeof officeId === "string" && currentUser.officeIds.includes(officeId)) {
          socket.join(`office:${officeId}`);
          socket.join(officeId);
        }
      });

      // Agent clients should send a GPS sample every 10–15 seconds while an
      // attendance session is open (and immediately on geolocation changes).
      let lastLocationAt = 0;
      socket.on("attendance:location", async (location: { latitude?: unknown; longitude?: unknown }) => {
        if (currentUser.role !== "AGENT") return;
        const now = Date.now();
        if (now - lastLocationAt < 5000) return;
        lastLocationAt = now;
        armLocationTimeout();
        try {
          const result = await processAttendanceLocation(
            currentUser.id,
            Number(location?.latitude),
            Number(location?.longitude),
          );
          socket.emit("attendance:location-result", result);
        } catch (error) {
          socket.emit("attendance:tracking-error", { message: "Could not update attendance location" });
        }
      });

      socket.on("disconnect", () => {
        Logger.info(`Client disconnected: ${socket.id}`);
        if (locationTimeout) clearTimeout(locationTimeout);
        if (currentUser.role === "AGENT") {
          void pauseAttendanceForLostLocation(currentUser.id).catch((error) => {
            Logger.error("Could not pause attendance after location disconnect", error);
          });
        }
      });
    });

    // Export io to use in controllers
    (global as any).io = io;

    const startAutoCheckoutJob = () => {
      cron.schedule("* * * * *", async () => {
        try {
          const autoCheckedOutCount = await autoCheckoutOpenAttendances();
          if (autoCheckedOutCount > 0) {
            Logger.info(`Auto-checked out ${autoCheckedOutCount} open attendance records`);
          }
        } catch (error) {
          Logger.error("Auto checkout job failed", error);
        }
      });
    };

    startAutoCheckoutJob();

    httpServer.listen(port, () => {
      Logger.info(`Server started on port ${port} 🔥🔥🔥`);
    });
  } catch (err) {
    Logger.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
