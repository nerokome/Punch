"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStatsService = exports.getOfficeUsersWithAttendance = exports.getUsersWithAttendance = exports.getUserAllAttendanceRecordsService = exports.getAllAttendanceRecordsService = exports.updateAttendanceStatusService = exports.manualAttendanceService = exports.handleAttendanceService = exports.resetUserDeviceService = exports.pauseAttendanceForLostLocation = exports.processAttendanceLocation = exports.isWithinGeofence = exports.validateUserAttendanceForToday = exports.validateClockInWindow = exports.autoCheckoutOpenAttendances = exports.getAutoCheckoutTime = void 0;
const client_1 = require("../client");
const client_2 = require("@prisma/client");
const dayjs_1 = __importDefault(require("dayjs"));
const errors_1 = require("../errors");
// How early (in minutes) before a shift starts that clock-in is permitted.
const CLOCK_IN_WINDOW_MINUTES = 120; // 2 hours
// How long after the shift end time an open attendance should be auto-closed.
const AUTO_CHECKOUT_DELAY_MINUTES = 60; // 1 hour
// Default shift start time (8:00 AM) used when a user has no shift assigned.
const DEFAULT_SHIFT_START_MINUTES = 480;
// Default geofence radius (meters) used only if an office somehow has
// no radius set (shouldn't happen once the migration/default lands).
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
const parseShiftTimeMinutes = (shiftTime) => {
    if (!shiftTime)
        return null;
    const [hours, minutes] = shiftTime.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }
    return hours * 60 + minutes;
};
const getAutoCheckoutTime = (clockIn, shiftEndTime, now = new Date()) => {
    const shiftEndMinutes = parseShiftTimeMinutes(shiftEndTime);
    if (shiftEndMinutes === null) {
        return null;
    }
    const shiftEndDate = new Date(clockIn);
    shiftEndDate.setHours(Math.floor(shiftEndMinutes / 60), shiftEndMinutes % 60, 0, 0);
    shiftEndDate.setTime(shiftEndDate.getTime() + AUTO_CHECKOUT_DELAY_MINUTES * 60000);
    if (now.getTime() < shiftEndDate.getTime()) {
        return null;
    }
    return shiftEndDate;
};
exports.getAutoCheckoutTime = getAutoCheckoutTime;
const DAYS_OF_WEEK = [
    client_2.DayOfWeek.SUN,
    client_2.DayOfWeek.MON,
    client_2.DayOfWeek.TUE,
    client_2.DayOfWeek.WED,
    client_2.DayOfWeek.THU,
    client_2.DayOfWeek.FRI,
    client_2.DayOfWeek.SAT,
];
const parseShiftStartMinutes = (shiftStartTime) => {
    if (!shiftStartTime)
        return DEFAULT_SHIFT_START_MINUTES;
    const [hours, minutes] = shiftStartTime.split(":").map(Number);
    return hours * 60 + minutes;
};
const formatMinutesAsTime = (totalMinutes) => {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440; // wrap safely into 0-1439
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};
const autoCheckoutOpenAttendances = async (now = new Date()) => {
    const openRecords = await client_1.prisma.attendanceRecord.findMany({
        where: {
            clockOut: null,
            clockIn: {
                lte: now,
            },
        },
        include: {
            user: {
                include: {
                    shift: true,
                },
            },
        },
    });
    let autoCheckedOutCount = 0;
    for (const record of openRecords) {
        const autoCheckoutTime = (0, exports.getAutoCheckoutTime)(record.clockIn, record.user.shift?.endTime, now);
        if (!autoCheckoutTime) {
            continue;
        }
        await client_1.prisma.attendanceRecord.update({
            where: { id: record.id },
            data: {
                clockOut: autoCheckoutTime,
                ...finishOutsideInterval(record, autoCheckoutTime),
            },
        });
        autoCheckedOutCount += 1;
        const io = global.io;
        if (io) {
            io.to(record.officeId).emit("employee-checked-out", {
                userId: record.userId,
                officeId: record.officeId,
                clockOut: autoCheckoutTime,
                auto: true,
            });
        }
    }
    return autoCheckedOutCount;
};
exports.autoCheckoutOpenAttendances = autoCheckoutOpenAttendances;
const validateClockInWindow = (now, shiftStartTime) => {
    const shiftStartMinutes = parseShiftStartMinutes(shiftStartTime);
    const earliestAllowedMinutes = shiftStartMinutes - CLOCK_IN_WINDOW_MINUTES;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes < earliestAllowedMinutes) {
        const earliestAllowedTime = formatMinutesAsTime(earliestAllowedMinutes);
        throw new errors_1.BadRequestError(`Clock-in is not open yet. You can clock in from ${earliestAllowedTime} (2 hours before your shift starts).`);
    }
};
exports.validateClockInWindow = validateClockInWindow;
const validateUserAttendanceForToday = async (userId, type, now = new Date()) => {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    if (type === "CHECK_IN") {
        const existingCheckIn = await client_1.prisma.attendanceRecord.findFirst({
            where: {
                userId,
                clockIn: { gte: startOfDay, lte: endOfDay },
            },
        });
        if (existingCheckIn) {
            throw new errors_1.BadRequestError("User has already clocked in today");
        }
    }
    if (type === "CHECK_OUT") {
        const existingCheckOut = await client_1.prisma.attendanceRecord.findFirst({
            where: {
                userId,
                clockOut: { gte: startOfDay, lte: endOfDay },
            },
        });
        if (existingCheckOut) {
            throw new errors_1.BadRequestError("User has already clocked out today");
        }
    }
};
exports.validateUserAttendanceForToday = validateUserAttendanceForToday;
const getApprovedLeaveForDate = async (userId, date = new Date()) => {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    const leave = await client_1.prisma.leaveRequest.findFirst({
        where: {
            userId,
            status: client_2.LeaveStatus.APPROVED,
            startDate: {
                lte: endOfDay,
            },
            endDate: {
                gte: startOfDay,
            },
        },
    });
    return leave;
};
const validateUserWorkSchedule = async (userId, date = new Date()) => {
    const approvedLeave = await getApprovedLeaveForDate(userId, date);
    if (approvedLeave) {
        throw new errors_1.BadRequestError("Attendance is not allowed because you are currently on approved leave.");
    }
    const today = DAYS_OF_WEEK[date.getDay()];
    const schedule = await client_1.prisma.workSchedule.findFirst({
        where: {
            userId,
            officeDays: {
                has: today,
            },
            effectiveFrom: {
                lte: date,
            },
        },
        orderBy: {
            effectiveFrom: "desc",
        },
    });
    if (!schedule) {
        throw new errors_1.BadRequestError("You are not scheduled to work today.");
    }
    if (schedule.workMode !== client_2.AttendanceDayStatus.PRESENT) {
        throw new errors_1.BadRequestError(`Attendance is not allowed today. Current work mode is ${schedule.workMode}.`);
    }
    return schedule;
};
const isWithinGeofence = (officeLat, officeLng, userLat, userLng, radiusMeters = DEFAULT_GEOFENCE_RADIUS_METERS) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const earthRadius = 6371000; // meters
    const dLat = toRadians(userLat - officeLat);
    const dLng = toRadians(userLng - officeLng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(officeLat)) *
            Math.cos(toRadians(userLat)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance <= radiusMeters;
};
exports.isWithinGeofence = isWithinGeofence;
/** Process an authenticated agent GPS sample for an open attendance session. */
const processAttendanceLocation = async (userId, userLat, userLng) => {
    validateCoordinates(userLat, userLng);
    const record = await client_1.prisma.attendanceRecord.findFirst({
        where: { userId, clockOut: null },
        orderBy: { clockIn: "desc" },
        include: { office: true, user: { select: { name: true } } },
    });
    if (!record)
        return { tracking: false, reason: "No open attendance session" };
    const { office } = record;
    if (office.latitude == null || office.longitude == null) {
        return { tracking: false, reason: "Office location is not configured" };
    }
    const now = new Date();
    const inside = (0, exports.isWithinGeofence)(office.latitude, office.longitude, userLat, userLng, office.radius ?? DEFAULT_GEOFENCE_RADIUS_METERS);
    const io = global.io;
    const workedDurationMs = (outsideSince, outsideDurationMs) => Math.max(0, now.getTime() - record.clockIn.getTime() - outsideDurationMs -
        (outsideSince ? now.getTime() - outsideSince.getTime() : 0));
    if (!inside && !record.outsideSince) {
        const changed = await client_1.prisma.attendanceRecord.updateMany({
            where: { id: record.id, outsideSince: null, clockOut: null },
            data: { outsideSince: now },
        });
        if (changed.count) {
            io?.to(`office:${record.officeId}`).emit("agent-left-office-radius", {
                attendanceId: record.id,
                userId,
                userName: record.user.name,
                officeId: record.officeId,
                at: now,
                message: `${record.user.name} left the office radius. Attendance time is paused.`,
            });
        }
        return {
            tracking: true,
            inside,
            outsideSince: now,
            outsideDurationMs: record.outsideDurationMs,
            workedDurationMs: workedDurationMs(now, record.outsideDurationMs),
        };
    }
    if (inside && record.outsideSince) {
        const intervalMs = Math.max(0, now.getTime() - record.outsideSince.getTime());
        const changed = await client_1.prisma.attendanceRecord.updateMany({
            where: { id: record.id, outsideSince: record.outsideSince, clockOut: null },
            data: {
                outsideSince: null,
                outsideDurationMs: { increment: intervalMs },
            },
        });
        if (changed.count) {
            io?.to(`office:${record.officeId}`).emit("agent-returned-to-office-radius", {
                attendanceId: record.id,
                userId,
                userName: record.user.name,
                officeId: record.officeId,
                at: now,
                outsideDurationMs: record.outsideDurationMs + intervalMs,
                message: `${record.user.name} returned inside the office radius.`,
            });
        }
        return {
            tracking: true,
            inside,
            outsideDurationMs: record.outsideDurationMs + intervalMs,
            workedDurationMs: workedDurationMs(null, record.outsideDurationMs + intervalMs),
        };
    }
    return {
        tracking: true,
        inside,
        outsideSince: record.outsideSince,
        outsideDurationMs: record.outsideDurationMs,
        workedDurationMs: workedDurationMs(record.outsideSince, record.outsideDurationMs),
    };
};
exports.processAttendanceLocation = processAttendanceLocation;
/** Pause a session when the agent socket drops; missing GPS must not accrue time. */
const pauseAttendanceForLostLocation = async (userId) => {
    const record = await client_1.prisma.attendanceRecord.findFirst({
        where: { userId, clockOut: null, outsideSince: null },
        orderBy: { clockIn: "desc" },
        include: { user: { select: { name: true } } },
    });
    if (!record)
        return;
    const now = new Date();
    const changed = await client_1.prisma.attendanceRecord.updateMany({
        where: { id: record.id, outsideSince: null, clockOut: null },
        data: { outsideSince: now },
    });
    if (changed.count) {
        global.io?.to(`office:${record.officeId}`).emit("agent-location-lost", {
            attendanceId: record.id,
            userId,
            userName: record.user.name,
            officeId: record.officeId,
            at: now,
            message: `${record.user.name}'s live location was lost. Attendance time is paused until location resumes.`,
        });
    }
};
exports.pauseAttendanceForLostLocation = pauseAttendanceForLostLocation;
const finishOutsideInterval = (record, at) => ({
    outsideSince: null,
    outsideDurationMs: record.outsideDurationMs +
        (record.outsideSince ? Math.max(0, at.getTime() - record.outsideSince.getTime()) : 0),
});
// Validates raw lat/lng values coming from the client before they're
// ever used in a distance calculation. Rejects missing, non-numeric,
// out-of-range, or (0,0) "null island" coordinates (a common symptom
// of a GPS read that silently failed on the client).
const validateCoordinates = (lat, lng) => {
    if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
        throw new errors_1.BadRequestError("Valid device location is required to clock in.");
    }
    if (lat === 0 && lng === 0) {
        throw new errors_1.BadRequestError("Could not read your device location. Please try again.");
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new errors_1.BadRequestError("Invalid device location received.");
    }
};
const validateAndBindDevice = async (userId, deviceId, officeId) => {
    if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
        throw new errors_1.BadRequestError("Device identification is required to clock in/out.");
    }
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
        select: { deviceId: true },
    });
    if (!user) {
        throw new errors_1.BadRequestError("User not found");
    }
    // Already bound to this exact device — nothing further to do.
    if (user.deviceId === deviceId) {
        return;
    }
    if (user.deviceId) {
        const io = global.io;
        if (io) {
            io.emit("device-mismatch-attempt", {
                userId,
                officeId,
                attemptedDeviceId: deviceId,
                boundDeviceId: user.deviceId,
                at: new Date(),
            });
        }
        throw new errors_1.BadRequestError("This account is locked to a different device. Ask an admin to reset your device to use a new one.");
    }
    let claim;
    try {
        claim = await client_1.prisma.user.updateMany({
            where: { id: userId, deviceId: null },
            data: { deviceId, deviceRegisteredAt: new Date() },
        });
    }
    catch (err) {
        if (err?.code === "P2002") {
            throw new errors_1.BadRequestError("This device is already registered to another account. Contact an admin.");
        }
        throw err;
    }
    if (claim.count === 0) {
        const refetched = await client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { deviceId: true },
        });
        if (refetched?.deviceId !== deviceId) {
            throw new errors_1.BadRequestError("This account is locked to a different device. Ask an admin to reset your device to use a new one.");
        }
    }
};
const resetUserDeviceService = async (userId) => {
    const user = await client_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new errors_1.BadRequestError("User not found");
    }
    if (!user.deviceId) {
        throw new errors_1.BadRequestError("This user has no device bound to reset.");
    }
    const updated = await client_1.prisma.user.update({
        where: { id: userId },
        data: { deviceId: null, deviceRegisteredAt: null },
    });
    const io = global.io;
    if (io) {
        io.emit("device-reset", {
            userId,
            at: new Date(),
        });
    }
    return updated;
};
exports.resetUserDeviceService = resetUserDeviceService;
const calculateAttendanceStatus = (clockInTime, shiftStartTime) => {
    const timeInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
    const shiftStartMinutes = parseShiftStartMinutes(shiftStartTime);
    return timeInMinutes <= shiftStartMinutes
        ? client_2.AttendanceStatus.EARLY
        : client_2.AttendanceStatus.LATE;
};
const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};
const getDatesInRange = (start, end) => {
    const dates = [];
    const current = normalizeDate(start);
    const last = normalizeDate(end);
    while (current.getTime() <= last.getTime()) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
};
const isSameDay = (a, b) => {
    const d1 = normalizeDate(a);
    const d2 = normalizeDate(b);
    return d1.getTime() === d2.getTime();
};
const resolveWorkModeForDate = (schedules, date) => {
    const targetDate = normalizeDate(date);
    const day = DAYS_OF_WEEK[targetDate.getDay()];
    const matches = schedules
        .map((schedule) => ({
        ...schedule,
        effectiveFrom: normalizeDate(schedule.effectiveFrom),
    }))
        .filter((schedule) => schedule.officeDays.includes(day) &&
        schedule.effectiveFrom.getTime() <= targetDate.getTime());
    if (!matches.length) {
        return null;
    }
    matches.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
    return matches[0].workMode;
};
const isUserOnLeave = (leaves, date) => {
    return leaves.some((leave) => {
        const start = new Date(leave.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(leave.endDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
    });
};
const resolveDayStatus = (workMode, record) => {
    if (record) {
        return record.status;
    }
    switch (workMode) {
        case client_2.AttendanceDayStatus.WFH:
            return client_2.AttendanceStatus.WFH;
        case client_2.AttendanceDayStatus.ON_LEAVE:
            return client_2.AttendanceStatus.ON_LEAVE;
        case client_2.AttendanceDayStatus.PRESENT:
        case client_2.AttendanceDayStatus.ABSENT:
            return client_2.AttendanceStatus.ABSENT;
        default:
            return client_2.AttendanceStatus.NOT_AVAILABLE;
    }
};
const buildDaysBreakdown = (dateRange, schedules, attendanceRecords, approvedLeaves) => {
    return dateRange.map((date) => {
        const onLeave = isUserOnLeave(approvedLeaves, date);
        const record = attendanceRecords.find((attendance) => isSameDay(attendance.clockIn, date));
        const workMode = resolveWorkModeForDate(schedules, date);
        return {
            date,
            workMode,
            status: record
                ? record.status
                : onLeave
                    ? client_2.AttendanceStatus.ON_LEAVE
                    : resolveDayStatus(workMode, record),
            clockIn: record?.clockIn ?? null,
            clockOut: record?.clockOut ?? null,
            method: record?.method ?? null,
        };
    });
};
const handleAttendanceService = async (token, userId, userLat, userLng, deviceId) => {
    // Validate the device coordinates up front, before we touch the token
    // at all. No point burning a token attempt on a bad GPS read.
    validateCoordinates(userLat, userLng);
    const qrToken = await client_1.prisma.qRToken.findUnique({ where: { token } });
    if (!qrToken || qrToken.isUsed || qrToken.expiresAt < new Date())
        throw new errors_1.BadRequestError("Invalid or expired token");
    // check if office exists
    const office = await client_1.prisma.officeLocation.findUnique({
        where: { id: qrToken.officeId },
    });
    if (!office)
        throw new errors_1.BadRequestError("Office not found");
    if (office.latitude == null || office.longitude == null) {
        throw new errors_1.BadRequestError("This office has no location configured. Contact an admin.");
    }
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
        include: { shift: true },
    });
    if (!user)
        throw new errors_1.BadRequestError("User not found");
    // check if user is in the office
    if (user.officeId !== office.id)
        throw new errors_1.BadRequestError("User not in the office");
    await validateAndBindDevice(userId, deviceId, office.id);
    if (!(0, exports.isWithinGeofence)(office.latitude, office.longitude, userLat, userLng, office.radius ?? DEFAULT_GEOFENCE_RADIUS_METERS)) {
        throw new errors_1.BadRequestError("You are outside the allowed office zone.");
    }
    const now = new Date();
    await validateUserWorkSchedule(userId, now);
    if (qrToken.type === "CHECK_IN") {
        (0, exports.validateClockInWindow)(now, user.shift?.startTime);
    }
    await (0, exports.validateUserAttendanceForToday)(userId, qrToken.type, now);
    if (qrToken.type === "CHECK_IN") {
        const status = calculateAttendanceStatus(now, user.shift?.startTime);
        const record = await client_1.prisma.attendanceRecord.create({
            data: {
                userId,
                method: client_2.AttendanceMethod.ONSITE,
                officeId: qrToken.officeId,
                qrTokenId: qrToken.id,
                clockIn: now,
                clockOut: undefined,
                status,
                clockInLat: userLat,
                clockInLng: userLng,
            },
        });
        // Emit socket event
        const io = global.io;
        if (io) {
            io.to(qrToken.officeId).emit("employee-checked-in", {
                userId,
                userName: user.name,
                officeId: qrToken.officeId,
                clockIn: now,
            });
        }
        return record;
    }
    else {
        // Update
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const recordToUpdate = await client_1.prisma.attendanceRecord.findFirst({
            where: {
                userId,
                clockIn: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                clockOut: null,
            },
        });
        if (!recordToUpdate) {
            throw new errors_1.BadRequestError("User has not checked in today.");
        }
        const updatedRecord = await client_1.prisma.attendanceRecord.update({
            where: { id: recordToUpdate.id },
            data: {
                clockOut: now,
                qrTokenId: qrToken.id, // link QR token if needed
                clockOutLat: userLat,
                clockOutLng: userLng,
                ...finishOutsideInterval(recordToUpdate, now),
            },
        });
        return updatedRecord;
    }
};
exports.handleAttendanceService = handleAttendanceService;
const manualAttendanceService = async (userId, type, officeId) => {
    // check if office exists
    const office = await client_1.prisma.officeLocation.findUnique({
        where: { id: officeId },
    });
    if (!office)
        throw new errors_1.BadRequestError("Office not found");
    const user = await client_1.prisma.user.findUnique({
        where: { id: userId },
        include: { shift: true },
    });
    if (!user)
        throw new errors_1.BadRequestError("User not found");
    // check if user is in the office
    if (user.officeId !== office.id)
        throw new errors_1.BadRequestError("User not in the office");
    const now = new Date();
    await validateUserWorkSchedule(userId, now);
    if (type === "CHECK_IN") {
        (0, exports.validateClockInWindow)(now, user.shift?.startTime);
    }
    await (0, exports.validateUserAttendanceForToday)(userId, type, now);
    if (type === "CHECK_IN") {
        const status = calculateAttendanceStatus(now, user.shift?.startTime);
        const record = await client_1.prisma.attendanceRecord.create({
            data: {
                userId,
                method: client_2.AttendanceMethod.MANUAL,
                officeId: officeId,
                clockIn: now,
                clockOut: undefined,
                status,
            },
        });
        // Emit socket event
        const io = global.io;
        if (io) {
            io.to(officeId).emit("employee-checked-in", {
                userId,
                userName: user.name,
                officeId,
                clockIn: now,
            });
        }
        return record;
    }
    else {
        // Update
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const recordToUpdate = await client_1.prisma.attendanceRecord.findFirst({
            where: {
                userId,
                clockIn: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                clockOut: null,
            },
        });
        if (!recordToUpdate) {
            throw new errors_1.BadRequestError("User has not checked in today.");
        }
        const updatedRecord = await client_1.prisma.attendanceRecord.update({
            where: { id: recordToUpdate.id },
            data: {
                clockOut: now,
                ...finishOutsideInterval(recordToUpdate, now),
            },
        });
        return updatedRecord;
    }
};
exports.manualAttendanceService = manualAttendanceService;
const updateAttendanceStatusService = async (attendanceId, status, allowedOfficeIds) => {
    const attendanceRecord = await client_1.prisma.attendanceRecord.findUnique({
        where: { id: attendanceId },
    });
    if (!attendanceRecord) {
        throw new errors_1.BadRequestError("Attendance record not found");
    }
    if (allowedOfficeIds !== undefined &&
        !allowedOfficeIds.includes(attendanceRecord.officeId)) {
        throw new errors_1.BadRequestError("You do not have access to this attendance record");
    }
    const updatedRecord = await client_1.prisma.attendanceRecord.update({
        where: { id: attendanceId },
        data: { status },
    });
    return updatedRecord;
};
exports.updateAttendanceStatusService = updateAttendanceStatusService;
const getAllAttendanceRecordsService = async (filters = {}) => {
    const { page = 1, limit = 10, filterByDate, startDate, endDate, officeId, officeIds, search = "", } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (filterByDate === "today") {
        const todayStart = (0, dayjs_1.default)().startOf("day").toDate();
        const todayEnd = (0, dayjs_1.default)().endOf("day").toDate();
        where.createdAt = { gte: todayStart, lte: todayEnd };
    }
    if (filterByDate === "range" && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt = {
            gte: start,
            lte: end,
        };
    }
    if (officeIds !== undefined) {
        where.officeId = { in: officeIds };
    }
    else if (officeId) {
        where.officeId = officeId;
    }
    if (search) {
        where.user = {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ],
        };
    }
    try {
        const [total, data] = await Promise.all([
            client_1.prisma.attendanceRecord.count({ where }),
            client_1.prisma.attendanceRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            shiftId: true,
                            shift: {
                                select: {
                                    id: true,
                                    name: true,
                                    startTime: true,
                                    endTime: true,
                                },
                            },
                        },
                    },
                    office: true,
                },
            }),
        ]);
        const pages = Math.ceil(total / limit);
        return {
            total,
            pages,
            currentPage: page,
            data,
        };
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to get records");
    }
};
exports.getAllAttendanceRecordsService = getAllAttendanceRecordsService;
const getUserAllAttendanceRecordsService = async (userId, filters = {}) => {
    const { page = 1, limit = 10, filterByDate, startDate, endDate, officeId, officeIds, search = "", } = filters;
    const skip = (page - 1) * limit;
    const where = { userId };
    if (filterByDate === "today") {
        const todayStart = (0, dayjs_1.default)().startOf("day").toDate();
        const todayEnd = (0, dayjs_1.default)().endOf("day").toDate();
        where.createdAt = { gte: todayStart, lte: todayEnd };
    }
    if (filterByDate === "range" && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        where.createdAt = {
            gte: start,
            lte: end,
        };
    }
    if (officeIds !== undefined) {
        where.officeId = { in: officeIds };
    }
    else if (officeId) {
        where.officeId = officeId;
    }
    if (search) {
        where.user = {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ],
        };
    }
    try {
        const [total, data] = await Promise.all([
            client_1.prisma.attendanceRecord.count({ where }),
            client_1.prisma.attendanceRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            shiftId: true,
                            shift: {
                                select: {
                                    id: true,
                                    name: true,
                                    startTime: true,
                                    endTime: true,
                                },
                            },
                        },
                    },
                    office: true,
                },
            }),
        ]);
        const pages = Math.ceil(total / limit);
        return {
            total,
            pages,
            currentPage: page,
            data,
        };
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to get user records");
    }
};
exports.getUserAllAttendanceRecordsService = getUserAllAttendanceRecordsService;
const getUsersWithAttendance = async (filters = {}) => {
    const { page = 1, limit = 10, startDate, endDate, officeId, officeIds, search = "", status, } = filters;
    try {
        const filterStart = startDate
            ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
            : new Date(new Date().setHours(0, 0, 0, 0));
        const filterEnd = endDate
            ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
            : new Date(new Date().setHours(23, 59, 59, 999));
        const dateRange = getDatesInRange(filterStart, filterEnd);
        const whereUser = {
            isActive: client_2.KYCStatus.active,
            isDeleted: false,
        };
        if (officeIds !== undefined) {
            whereUser.officeId = { in: officeIds };
        }
        else if (officeId) {
            whereUser.officeId = officeId;
        }
        if (search) {
            whereUser.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        const [, users] = await Promise.all([
            client_1.prisma.user.count({
                where: {
                    isActive: client_2.KYCStatus.active,
                    isDeleted: false,
                },
            }),
            client_1.prisma.user.findMany({
                where: whereUser,
                orderBy: {
                    name: "asc",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    office: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                    shiftId: true,
                    shift: {
                        select: {
                            id: true,
                            name: true,
                            startTime: true,
                            endTime: true,
                        },
                    },
                    workSchedules: {
                        where: {
                            effectiveFrom: {
                                lte: filterEnd,
                            },
                        },
                        select: {
                            officeDays: true,
                            workMode: true,
                            effectiveFrom: true,
                        },
                    },
                    attendance: {
                        where: {
                            clockIn: {
                                gte: filterStart,
                                lte: filterEnd,
                            },
                        },
                        orderBy: {
                            clockIn: "asc",
                        },
                        select: {
                            id: true,
                            method: true,
                            clockIn: true,
                            clockOut: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    // ✅ This belongs at the User level, NOT inside attendance
                    leaveRequests: {
                        where: {
                            status: client_2.LeaveStatus.APPROVED,
                        },
                        select: {
                            startDate: true,
                            endDate: true,
                        },
                    },
                },
            }),
        ]);
        const computed = users.map(({ workSchedules, attendance, leaveRequests, ...user }) => {
            const days = buildDaysBreakdown(dateRange, workSchedules, attendance, leaveRequests);
            return {
                ...user,
                attendance,
                leaveRequests,
                status: days.length === 1 ? days[0].status : undefined,
                days,
            };
        });
        const filtered = status
            ? computed.filter((u) => u.status === status)
            : computed;
        const total = filtered.length;
        const skip = (page - 1) * limit;
        return {
            data: filtered.slice(skip, skip + limit),
            currentPage: page,
            total,
            pages: Math.ceil(total / limit),
        };
    }
    catch (err) {
        throw new errors_1.BadRequestError("Failed to fetch user attendance records");
    }
};
exports.getUsersWithAttendance = getUsersWithAttendance;
const getOfficeUsersWithAttendance = async (officeIds, { startDate, endDate, page = 1, limit = 20, search = "", status }) => {
    try {
        const filterStart = startDate
            ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
            : new Date(new Date().setHours(0, 0, 0, 0));
        const filterEnd = endDate
            ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
            : new Date(new Date().setHours(23, 59, 59, 999));
        const dateRange = getDatesInRange(filterStart, filterEnd);
        const whereUser = {
            isActive: client_2.KYCStatus.active,
            isDeleted: false,
        };
        if (officeIds.length > 0) {
            whereUser.officeId = { in: officeIds };
        }
        if (search) {
            whereUser.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        const users = await client_1.prisma.user.findMany({
            where: whereUser,
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                office: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                shiftId: true,
                shift: {
                    select: {
                        id: true,
                        name: true,
                        startTime: true,
                        endTime: true,
                    },
                },
                workSchedules: {
                    select: {
                        officeDays: true,
                        workMode: true,
                        effectiveFrom: true,
                    },
                    where: {
                        effectiveFrom: { lte: filterEnd },
                    },
                },
                leaveRequests: {
                    where: {
                        status: client_2.LeaveStatus.APPROVED,
                    },
                    select: {
                        startDate: true,
                        endDate: true,
                    },
                },
                attendance: {
                    where: {
                        clockIn: {
                            gte: filterStart,
                            lte: filterEnd,
                        },
                    },
                    orderBy: { clockIn: "asc" },
                    select: {
                        id: true,
                        method: true,
                        clockIn: true,
                        clockOut: true,
                        status: true,
                    },
                },
            },
        });
        const computed = users.map(({ workSchedules, attendance, leaveRequests, ...user }) => {
            const days = buildDaysBreakdown(dateRange, workSchedules, attendance, leaveRequests);
            return {
                ...user,
                attendance,
                status: days.length === 1 ? days[0].status : undefined,
                days,
            };
        });
        const filtered = status
            ? computed.filter((u) => u.status === status)
            : computed;
        const total = filtered.length;
        const skip = (page - 1) * limit;
        const data = filtered.slice(skip, skip + limit);
        return {
            data,
            currentPage: page,
            total,
            pages: Math.ceil(total / limit),
        };
    }
    catch (err) {
        throw new errors_1.BadRequestError("Failed to fetch user attendance records");
    }
};
exports.getOfficeUsersWithAttendance = getOfficeUsersWithAttendance;
const getDashboardStatsService = async (officeIds, startDateStr, endDateStr) => {
    try {
        const startDate = startDateStr ? new Date(startDateStr) : new Date();
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        // Dashboard employee totals include employees only. Admin and
        // super-admin accounts must not be counted as staff in the attendance
        // figures.
        const userWhere = {
            role: client_2.Role.AGENT,
            isDeleted: false,
            isActive: client_2.KYCStatus.active,
        };
        if (officeIds !== undefined) {
            userWhere.officeId = { in: officeIds };
        }
        // Count the active employee roster independently from today's schedule.
        // Otherwise employees without a schedule matching this date disappear
        // from the dashboard's total employee count.
        const totalEmployees = await client_1.prisma.user.count({ where: userWhere });
        const daysOfWeekInRange = new Set();
        const cursor = new Date(startDateTime);
        while (cursor <= endDateTime) {
            daysOfWeekInRange.add(DAYS_OF_WEEK[cursor.getDay()]);
            cursor.setDate(cursor.getDate() + 1);
        }
        const presentUserIds = new Set();
        const wfhUserIds = new Set();
        for (const day of daysOfWeekInRange) {
            const schedules = await client_1.prisma.workSchedule.findMany({
                where: {
                    officeDays: {
                        has: day,
                    },
                    effectiveFrom: {
                        lte: endDateTime,
                    },
                    user: userWhere,
                },
                select: {
                    userId: true,
                    workMode: true,
                    effectiveFrom: true,
                },
                orderBy: {
                    effectiveFrom: "desc",
                },
            });
            const latestByUser = new Map();
            for (const schedule of schedules) {
                if (!latestByUser.has(schedule.userId)) {
                    latestByUser.set(schedule.userId, schedule);
                }
            }
            for (const schedule of latestByUser.values()) {
                if (schedule.workMode === client_2.AttendanceDayStatus.PRESENT) {
                    presentUserIds.add(schedule.userId);
                }
                else if (schedule.workMode === client_2.AttendanceDayStatus.WFH) {
                    wfhUserIds.add(schedule.userId);
                }
            }
        }
        const approvedLeaves = await client_1.prisma.leaveRequest.findMany({
            where: {
                status: client_2.LeaveStatus.APPROVED,
                startDate: {
                    lte: endDateTime,
                },
                endDate: {
                    gte: startDateTime,
                },
                employee: userWhere,
            },
            select: {
                userId: true,
            },
        });
        const onLeaveUserIds = new Set(approvedLeaves.map((leave) => leave.userId));
        // Remove employees on leave from expected attendance
        for (const userId of onLeaveUserIds) {
            presentUserIds.delete(userId);
        }
        const expectedOnsiteToday = presentUserIds.size;
        const wfhToday = wfhUserIds.size;
        const onLeaveToday = onLeaveUserIds.size;
        const rangeRecords = await client_1.prisma.attendanceRecord.findMany({
            where: {
                clockIn: {
                    gte: startDateTime,
                    lte: endDateTime,
                },
                userId: {
                    in: Array.from(presentUserIds),
                },
                user: userWhere,
            },
            include: {
                user: {
                    include: {
                        shift: true,
                    },
                },
            },
        });
        const earliestCheckInsMap = {};
        for (const record of rangeRecords) {
            if (!earliestCheckInsMap[record.userId] ||
                record.clockIn < earliestCheckInsMap[record.userId].clockIn) {
                earliestCheckInsMap[record.userId] = record;
            }
        }
        const earliestCheckIns = Object.values(earliestCheckInsMap);
        const presentToday = earliestCheckIns.length;
        let earlyArrivals = 0;
        let lateArrivals = 0;
        for (const record of earliestCheckIns) {
            const clockInTime = new Date(record.clockIn);
            const timeInMinutes = clockInTime.getHours() * 60 +
                clockInTime.getMinutes();
            let shiftStartMinutes = 480;
            if (record.user.shift?.startTime) {
                const [hours, minutes] = record.user.shift.startTime
                    .split(":")
                    .map(Number);
                shiftStartMinutes = hours * 60 + minutes;
            }
            if (timeInMinutes <= shiftStartMinutes) {
                earlyArrivals++;
            }
            else {
                lateArrivals++;
            }
        }
        const absentToday = Math.max(0, expectedOnsiteToday - presentToday);
        return {
            totalEmployees,
            presentToday,
            absentToday,
            earlyArrivals,
            lateArrivals,
            wfhToday,
            onLeaveToday,
        };
    }
    catch (error) {
        throw new errors_1.BadRequestError("Failed to fetch dashboard statistics");
    }
};
exports.getDashboardStatsService = getDashboardStatsService;
