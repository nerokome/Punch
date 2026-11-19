import app from "./app";
import Logger from "./logger";
import { createServer } from "http";
import http from "http";
import https from "https";
import path from "path";
import fs from "fs";
import { prisma } from "./client";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";
import { autoCheckoutOpenAttendances } from "./services/attendance-service";
const PORT = process.env.PORT || 3000;

// start the express app
const start = async () => {
  try {
    Logger.info("connected to the database");

    const PORT = process.env.PORT || 5000;

    let httpServer: any;
    let newPORT: any;

    if (process.env.NODE_ENV === "production") {

    const options = {
      cert: fs.readFileSync(
        path.resolve(__dirname, "outcess-ssl", "2025-ssl.pem"),
        "utf8",
      ),
      key: fs.readFileSync(
        path.resolve(__dirname, "outcess-ssl", "2025-ssl.key"),
        "utf8",
      ),
      passphrase: process.env.PASS_PHRASE,
    };

    httpServer = https.createServer(options, app);
      newPORT = 7000;
    } else {
      httpServer = http.createServer(app);
      newPORT = PORT;
    }

    // Set up Socket.IO
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
      },
    });

    // Socket.IO connection
    io.on("connection", (socket) => {
      Logger.info(`New client connected: ${socket.id}`);

      socket.on("join-office", (officeId: string) => {
        socket.join(officeId);
        Logger.info(`Client ${socket.id} joined office ${officeId}`);
      });

      socket.on("disconnect", () => {
        Logger.info(`Client disconnected: ${socket.id}`);
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

    httpServer.listen(newPORT, () => {
      Logger.info(`Server started on port ${newPORT} 🔥🔥🔥`);
    });
  } catch (err) {
    Logger.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
