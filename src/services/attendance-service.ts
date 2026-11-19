import { prisma } from "../client";
import {
  AttendanceMethod,
  AttendanceRecord,
  AttendanceType,
  Prisma,
  Role,
  KYCStatus,
  AttendanceStatus,
  AttendanceDayStatus,
  DayOfWeek,
  LeaveStatus,
} from "@prisma/client";

import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import { BadRequestError } from "../errors";

export type QRAttendanceInput = Omit<
  AttendanceRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type ReturnedAttendance = AttendanceRecord;

type AttendanceFilters = {
  page?: number;
  limit?: number;
  filterByDate?: "today" | "range";
  startDate?: string;
  endDate?: string;
  officeId?: string;
  officeIds?: string[];
  search?: string;
  status?: AttendanceStatus;
};

// How early (in minutes) before a shift starts that clock-in is permitted.
const CLOCK_IN_WINDOW_MINUTES = 120; // 2 hours

// How long after the shift end time an open attendance should be auto-closed.
const AUTO_CHECKOUT_DELAY_MINUTES = 60; // 1 hour

// Default shift start time (8:00 AM) used when a user has no shift assigned.
const DEFAULT_SHIFT_START_MINUTES = 480;

// Default geofence radius (meters) used only if an office somehow has
// no radius set (shouldn't happen once the migration/default lands).
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

const parseShiftTimeMinutes = (shiftTime?: string | null): number | null => {
  if (!shiftTime) return null;

  const [hours, minutes] = shiftTime.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

export const getAutoCheckoutTime = (
  clockIn: Date,
  shiftEndTime?: string | null,
  now: Date = new Date(),
): Date | null => {
  const shiftEndMinutes = parseShiftTimeMinutes(shiftEndTime);

  if (shiftEndMinutes === null) {
    return null;
  }

  const shiftEndDate = new Date(clockIn);
  shiftEndDate.setHours(
    Math.floor(shiftEndMinutes / 60),
    shiftEndMinutes % 60,
    0,
    0,
  );
  shiftEndDate.setTime(
    shiftEndDate.getTime() + AUTO_CHECKOUT_DELAY_MINUTES * 60_000,
  );

  if (now.getTime() < shiftEndDate.getTime()) {
    return null;
  }

  return shiftEndDate;
};

const DAYS_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.SUN,
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
];

const parseShiftStartMinutes = (shiftStartTime?: string): number => {
  if (!shiftStartTime) return DEFAULT_SHIFT_START_MINUTES;
  const [hours, minutes] = shiftStartTime.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatMinutesAsTime = (totalMinutes: number): string => {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440; // wrap safely into 0-1439
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const autoCheckoutOpenAttendances = async (
  now: Date = new Date(),
): Promise<number> => {
  const openRecords = await prisma.attendanceRecord.findMany({
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
    const autoCheckoutTime = getAutoCheckoutTime(
      record.clockIn,
      record.user.shift?.endTime,
      now,
    );

    if (!autoCheckoutTime) {
      continue;
    }

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: autoCheckoutTime,
      },
    });

    autoCheckedOutCount += 1;

    const io = (global as any).io;
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

export const validateClockInWindow = (
  now: Date,
  shiftStartTime?: string,
): void => {
  const shiftStartMinutes = parseShiftStartMinutes(shiftStartTime);
  const earliestAllowedMinutes = shiftStartMinutes - CLOCK_IN_WINDOW_MINUTES;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes < earliestAllowedMinutes) {
    const earliestAllowedTime = formatMinutesAsTime(earliestAllowedMinutes);
    throw new BadRequestError(
      `Clock-in is not open yet. You can clock in from ${earliestAllowedTime} (2 hours before your shift starts).`,
    );
  }
};

export const validateUserAttendanceForToday = async (
  userId: string,
  type: "CHECK_IN" | "CHECK_OUT",
  now: Date = new Date(),
): Promise<void> => {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (type === "CHECK_IN") {
    const existingCheckIn = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        clockIn: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingCheckIn) {
      throw new BadRequestError("User has already clocked in today");
    }
  }

  if (type === "CHECK_OUT") {
    const existingCheckOut = await prisma.attendanceRecord.findFirst({
      where: {
        userId,
        clockOut: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existingCheckOut) {
      throw new BadRequestError("User has already clocked out today");
    }
  }
};
const getApprovedLeaveForDate = async (
  userId: string,
  date: Date = new Date(),
) => {
  const startOfDay = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  const endOfDay = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const leave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: LeaveStatus.APPROVED,
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
const validateUserWorkSchedule = async (
  userId: string,
  date: Date = new Date(),
) => {
  const approvedLeave = await getApprovedLeaveForDate(
    userId,
    date,
  );

  if (approvedLeave) {
    throw new BadRequestError(
      "Attendance is not allowed because you are currently on approved leave.",
    );
  }
  const today = DAYS_OF_WEEK[date.getDay()];

  const schedule = await prisma.workSchedule.findFirst({
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
    throw new BadRequestError("You are not scheduled to work today.");
  }

  if (schedule.workMode !== AttendanceDayStatus.PRESENT) {
    throw new BadRequestError(
      `Attendance is not allowed today. Current work mode is ${schedule.workMode}.`,
    );
  }
  return schedule;
};

export const isWithinGeofence = (
  officeLat: number,
  officeLng: number,
  userLat: number,
  userLng: number,
  radiusMeters = DEFAULT_GEOFENCE_RADIUS_METERS,
): boolean => {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const earthRadius = 6371000; // meters

  const dLat = toRadians(userLat - officeLat);
  const dLng = toRadians(userLng - officeLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(officeLat)) *
      Math.cos(toRadians(userLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;

  return distance <= radiusMeters;
};

// Validates raw lat/lng values coming from the client before they're
// ever used in a distance calculation. Rejects missing, non-numeric,
// out-of-range, or (0,0) "null island" coordinates (a common symptom
// of a GPS read that silently failed on the client).
const validateCoordinates = (lat: unknown, lng: unknown): void => {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new BadRequestError("Valid device location is required to clock in.");
  }

  if (lat === 0 && lng === 0) {
    throw new BadRequestError("Could not read your device location. Please try again.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestError("Invalid device location received.");
  }
};

const validateAndBindDevice = async (
  userId: string,
  deviceId: string | undefined | null,
  officeId: string,
): Promise<void> => {
  if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
    throw new BadRequestError(
      "Device identification is required to clock in/out.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deviceId: true },
  });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  // Already bound to this exact device — nothing further to do.
  if (user.deviceId === deviceId) {
    return;
  }


  if (user.deviceId) {
    const io = (global as any).io;
    if (io) {
      io.emit("device-mismatch-attempt", {
        userId,
        officeId,
        attemptedDeviceId: deviceId,
        boundDeviceId: user.deviceId,
        at: new Date(),
      });
    }

    throw new BadRequestError(
      "This account is locked to a different device. Ask an admin to reset your device to use a new one.",
    );
  }


  let claim: Prisma.BatchPayload;
  try {
    claim = await prisma.user.updateMany({
      where: { id: userId, deviceId: null },
      data: { deviceId, deviceRegisteredAt: new Date() },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      throw new BadRequestError(
        "This device is already registered to another account. Contact an admin.",
      );
    }
    throw err;
  }

  if (claim.count === 0) {
    
    const refetched = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceId: true },
    });

    if (refetched?.deviceId !== deviceId) {
      throw new BadRequestError(
        "This account is locked to a different device. Ask an admin to reset your device to use a new one.",
      );
    }
  }
};

export const resetUserDeviceService = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  if (!user.deviceId) {
    throw new BadRequestError("This user has no device bound to reset.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { deviceId: null, deviceRegisteredAt: null },
  });

  const io = (global as any).io;
  if (io) {
    io.emit("device-reset", {
      userId,
      at: new Date(),
    });
  }

  return updated;
};

const calculateAttendanceStatus = (
  clockInTime: Date,
  shiftStartTime?: string,
): AttendanceStatus => {
  const timeInMinutes = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  const shiftStartMinutes = parseShiftStartMinutes(shiftStartTime);

  return timeInMinutes <= shiftStartMinutes
    ? AttendanceStatus.EARLY
    : AttendanceStatus.LATE;
};



const normalizeDate = (date: Date | string) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDatesInRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];

  const current = normalizeDate(start);
  const last = normalizeDate(end);

  while (current.getTime() <= last.getTime()) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const isSameDay = (a: Date | string, b: Date | string) => {
  const d1 = normalizeDate(a);
  const d2 = normalizeDate(b);

  return d1.getTime() === d2.getTime();
};

type ScheduleLite = {
  officeDays: DayOfWeek[];
  workMode: AttendanceDayStatus;
  effectiveFrom: Date;
};

const resolveWorkModeForDate = (
  schedules: ScheduleLite[],
  date: Date,
): AttendanceDayStatus | null => {
  const targetDate = normalizeDate(date);
  const day = DAYS_OF_WEEK[targetDate.getDay()];

  const matches = schedules
    .map((schedule) => ({
      ...schedule,
      effectiveFrom: normalizeDate(schedule.effectiveFrom),
    }))
    .filter(
      (schedule) =>
        schedule.officeDays.includes(day) &&
        schedule.effectiveFrom.getTime() <= targetDate.getTime(),
    );

  if (!matches.length) {
    return null;
  }

  matches.sort(
    (a, b) =>
      b.effectiveFrom.getTime() - a.effectiveFrom.getTime(),
  );

  return matches[0].workMode;
};

type RecordLite = {
  id: string;
  method: string;
  clockIn: Date;
  clockOut: Date | null;
  status: AttendanceStatus;

};

type LeaveLite = {
  startDate: Date;
  endDate: Date;
};

const isUserOnLeave = (
  leaves: LeaveLite[],
  date: Date,
): boolean => {
  return leaves.some((leave) => {
    const start = new Date(leave.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(leave.endDate);
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
  });
};

const resolveDayStatus = (
  workMode: AttendanceDayStatus | null,
  record: RecordLite | undefined,
): AttendanceStatus => {
  if (record) {
    return record.status;
  }

  switch (workMode) {
    case AttendanceDayStatus.WFH:
      return AttendanceStatus.WFH;

    case AttendanceDayStatus.ON_LEAVE:
      return AttendanceStatus.ON_LEAVE;

    case AttendanceDayStatus.PRESENT:
    case AttendanceDayStatus.ABSENT:
      return AttendanceStatus.ABSENT;

    default:
      return AttendanceStatus.NOT_AVAILABLE;
  }
};

const buildDaysBreakdown = (
  dateRange: Date[],
  schedules: ScheduleLite[],
  attendanceRecords: RecordLite[],
  approvedLeaves: LeaveLite[],
) => {
  return dateRange.map((date) => {

    const onLeave = isUserOnLeave(
  approvedLeaves,
  date,
);
    const record = attendanceRecords.find((attendance) =>
      isSameDay(attendance.clockIn, date),
    );

    const workMode = resolveWorkModeForDate(
      schedules,
      date,
    );

    return {
      date,
      workMode,
      status: record
  ? record.status
  : onLeave
    ? AttendanceStatus.ON_LEAVE
    : resolveDayStatus(workMode, record),
      clockIn: record?.clockIn ?? null,
      clockOut: record?.clockOut ?? null,
      method: record?.method ?? null,
    };
  });
};

export const handleAttendanceService = async (
  token: string,
  userId: string,
  userLat: number,
  userLng: number,
  deviceId: string,
): Promise<ReturnedAttendance> => {
  // Validate the device coordinates up front, before we touch the token
  // at all. No point burning a token attempt on a bad GPS read.
  validateCoordinates(userLat, userLng);

  const qrToken = await prisma.qRToken.findUnique({ where: { token } });
  if (!qrToken || qrToken.isUsed || qrToken.expiresAt < new Date())
    throw new BadRequestError("Invalid or expired token");

  // check if office exists
  const office = await prisma.officeLocation.findUnique({
    where: { id: qrToken.officeId },
  });
  if (!office) throw new BadRequestError("Office not found");

  if (office.latitude == null || office.longitude == null) {
    throw new BadRequestError(
      "This office has no location configured. Contact an admin.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shift: true },
  });
  if (!user) throw new BadRequestError("User not found");

  // check if user is in the office
  if (user.officeId !== office.id)
    throw new BadRequestError("User not in the office");

  
  await validateAndBindDevice(userId, deviceId, office.id);

 
  if (
    !isWithinGeofence(
      office.latitude,
      office.longitude,
      userLat,
      userLng,
      office.radius ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    )
  ) {
    throw new BadRequestError("You are outside the allowed office zone.");
  }

  const now = new Date();
  await validateUserWorkSchedule(userId, now);

  if (qrToken.type === "CHECK_IN") {
    validateClockInWindow(now, user.shift?.startTime);
  }

  await validateUserAttendanceForToday(userId, qrToken.type, now);

  if (qrToken.type === "CHECK_IN") {
    const status = calculateAttendanceStatus(now, user.shift?.startTime);

    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        method: AttendanceMethod.ONSITE,
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
    const io = (global as any).io;
    if (io) {
      io.to(qrToken.officeId).emit("employee-checked-in", {
        userId,
        userName: user.name,
        officeId: qrToken.officeId,
        clockIn: now,
      });
    }

    return record;
  } else {
    // Update
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const recordToUpdate = await prisma.attendanceRecord.findFirst({
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
      throw new BadRequestError("User has not checked in today.");
    }

    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordToUpdate.id },
      data: {
        clockOut: now,
        qrTokenId: qrToken.id, // link QR token if needed
        clockOutLat: userLat,
        clockOutLng: userLng,
      },
    });

    return updatedRecord;
  }
};


export const manualAttendanceService = async (
  userId: string,
  type: AttendanceType,
  officeId: string,
) => {
  // check if office exists
  const office = await prisma.officeLocation.findUnique({
    where: { id: officeId },
  });
  if (!office) throw new BadRequestError("Office not found");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { shift: true },
  });
  if (!user) throw new BadRequestError("User not found");

  // check if user is in the office
  if (user.officeId !== office.id)
    throw new BadRequestError("User not in the office");

  const now = new Date();

  await validateUserWorkSchedule(userId, now);

  if (type === "CHECK_IN") {
    validateClockInWindow(now, user.shift?.startTime);
  }

  await validateUserAttendanceForToday(userId, type, now);

  if (type === "CHECK_IN") {
    const status = calculateAttendanceStatus(now, user.shift?.startTime);

    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        method: AttendanceMethod.MANUAL,
        officeId: officeId,
        clockIn: now,
        clockOut: undefined,
        status,
      },
    });

    // Emit socket event
    const io = (global as any).io;
    if (io) {
      io.to(officeId).emit("employee-checked-in", {
        userId,
        userName: user.name,
        officeId,
        clockIn: now,
      });
    }

    return record;
  } else {
    // Update
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const recordToUpdate = await prisma.attendanceRecord.findFirst({
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
      throw new BadRequestError("User has not checked in today.");
    }

    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: recordToUpdate.id },
      data: {
        clockOut: now,
      },
    });

    return updatedRecord;
  }
};

export const updateAttendanceStatusService = async (
  attendanceId: string,
  status: AttendanceStatus,
  allowedOfficeIds?: string[],
) => {
  const attendanceRecord = await prisma.attendanceRecord.findUnique({
    where: { id: attendanceId },
  });

  if (!attendanceRecord) {
    throw new BadRequestError("Attendance record not found");
  }

  if (
    allowedOfficeIds !== undefined &&
    !allowedOfficeIds.includes(attendanceRecord.officeId)
  ) {
    throw new BadRequestError("You do not have access to this attendance record");
  }

  const updatedRecord = await prisma.attendanceRecord.update({
    where: { id: attendanceId },
    data: { status },
  });

  return updatedRecord;
};

export const getAllAttendanceRecordsService = async (
  filters: AttendanceFilters = {},
) => {
  const {
    page = 1,
    limit = 10,
    filterByDate,
    startDate,
    endDate,
    officeId,
    officeIds,
    search = "",
  } = filters;

  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceRecordWhereInput = {};

  if (filterByDate === "today") {
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();
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
  } else if (officeId) {
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
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
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
  } catch (error) {
    throw new BadRequestError("Failed to get records");
  }
};

export const getUserAllAttendanceRecordsService = async (
  userId: string,
  filters: AttendanceFilters = {},
) => {
  const {
    page = 1,
    limit = 10,
    filterByDate,
    startDate,
    endDate,
    officeId,
    officeIds,
    search = "",
  } = filters;

  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceRecordWhereInput = { userId };

  if (filterByDate === "today") {
    const todayStart = dayjs().startOf("day").toDate();
    const todayEnd = dayjs().endOf("day").toDate();
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
  } else if (officeId) {
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
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
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
  } catch (error) {
    throw new BadRequestError("Failed to get user records");
  }
};


export const getUsersWithAttendance = async (
  filters: AttendanceFilters = {},
) => {
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    officeId,
    officeIds,
    search = "",
    status,
  } = filters;

  try {
    const filterStart = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));

    const filterEnd = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date(new Date().setHours(23, 59, 59, 999));

    const dateRange = getDatesInRange(filterStart, filterEnd);

    const whereUser: Prisma.UserWhereInput = {
      isActive: KYCStatus.active,
      isDeleted: false,
    };

    if (officeIds !== undefined) {
      whereUser.officeId = { in: officeIds };
    } else if (officeId) {
      whereUser.officeId = officeId;
    }

    if (search) {
      whereUser.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [, users] = await Promise.all([
      prisma.user.count({
        where: {
          isActive: KYCStatus.active,
          isDeleted: false,
        },
      }),

      prisma.user.findMany({
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
              status: LeaveStatus.APPROVED,
            },
            select: {
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
    ]);

    const computed = users.map(
      ({
        workSchedules,
        attendance,
        leaveRequests,
        ...user
      }) => {
        const days = buildDaysBreakdown(
          dateRange,
          workSchedules,
          attendance as RecordLite[],
          leaveRequests as LeaveLite[],
        );

        return {
          ...user,
          attendance,
          leaveRequests,
          status: days.length === 1 ? days[0].status : undefined,
          days,
        };
      },
    );

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
  } catch (err) {
    throw new BadRequestError("Failed to fetch user attendance records");
  }
};

export const getOfficeUsersWithAttendance = async (
  officeIds: string[],
  { startDate, endDate, page = 1, limit = 20, search = "", status }: AttendanceFilters,
) => {
  try {
    const filterStart = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));

    const filterEnd = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date(new Date().setHours(23, 59, 59, 999));

    const dateRange = getDatesInRange(filterStart, filterEnd);

    const whereUser: Prisma.UserWhereInput = {
      isActive: KYCStatus.active,
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

    const users = await prisma.user.findMany({
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
            status: LeaveStatus.APPROVED,
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
      const days = buildDaysBreakdown(
        dateRange,
        workSchedules,
        attendance as unknown as RecordLite[],
        leaveRequests,
      );

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
  } catch (err) {
    throw new BadRequestError("Failed to fetch user attendance records");
  }
};


export const getDashboardStatsService = async (
  officeIds?: string[],
  startDateStr?: string,
  endDateStr?: string,
) => {
  try {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

   const userWhere: Prisma.UserWhereInput = {
  role: { in: [Role.AGENT, Role.ADMIN,] },
  isDeleted: false,
  isActive: KYCStatus.active,
};

    if (officeIds !== undefined) {
      userWhere.officeId = { in: officeIds };
    }

    const daysOfWeekInRange = new Set<DayOfWeek>();

    const cursor = new Date(startDateTime);
    while (cursor <= endDateTime) {
      daysOfWeekInRange.add(DAYS_OF_WEEK[cursor.getDay()]);
      cursor.setDate(cursor.getDate() + 1);
    }

    const presentUserIds = new Set<string>();
    const wfhUserIds = new Set<string>();

    for (const day of daysOfWeekInRange) {
      const schedules = await prisma.workSchedule.findMany({
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

      const latestByUser = new Map<string, (typeof schedules)[0]>();

      for (const schedule of schedules) {
        if (!latestByUser.has(schedule.userId)) {
          latestByUser.set(schedule.userId, schedule);
        }
      }

      for (const schedule of latestByUser.values()) {
        if (schedule.workMode === AttendanceDayStatus.PRESENT) {
          presentUserIds.add(schedule.userId);
        } else if (schedule.workMode === AttendanceDayStatus.WFH) {
          wfhUserIds.add(schedule.userId);
        }
      }
    }

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: LeaveStatus.APPROVED,
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

    const onLeaveUserIds = new Set(
      approvedLeaves.map((leave) => leave.userId),
    );

    // Remove employees on leave from expected attendance
    for (const userId of onLeaveUserIds) {
      presentUserIds.delete(userId);
    }

    const totalEmployees = presentUserIds.size;
    const wfhToday = wfhUserIds.size;
    const onLeaveToday = onLeaveUserIds.size;

    const rangeRecords = await prisma.attendanceRecord.findMany({
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

    const earliestCheckInsMap: Record<
      string,
      (typeof rangeRecords)[0]
    > = {};

    for (const record of rangeRecords) {
      if (
        !earliestCheckInsMap[record.userId] ||
        record.clockIn < earliestCheckInsMap[record.userId].clockIn
      ) {
        earliestCheckInsMap[record.userId] = record;
      }
    }

    const earliestCheckIns = Object.values(earliestCheckInsMap);

    const presentToday = earliestCheckIns.length;

    let earlyArrivals = 0;
    let lateArrivals = 0;

    for (const record of earliestCheckIns) {
      const clockInTime = new Date(record.clockIn);

      const timeInMinutes =
        clockInTime.getHours() * 60 +
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
      } else {
        lateArrivals++;
      }
    }

    const absentToday = Math.max(
      0,
      totalEmployees - presentToday,
    );

    return {
      totalEmployees,
      presentToday,
      absentToday,
      earlyArrivals,
      lateArrivals,
      wfhToday,
      onLeaveToday,
    };
  } catch (error) {
    throw new BadRequestError(
      "Failed to fetch dashboard statistics",
    );
  }
};
