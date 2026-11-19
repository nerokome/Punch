import { AttendanceStatus, AttendanceType } from "@prisma/client";

export type AttendanceCalculation = {
  status: AttendanceStatus;
  lateMinutes: number;
  earlyMinutes: number;
};

export const calculateAttendanceStatus = (
  currentTime: Date,
  workStartTime: string,
  workEndTime: string,
  graceMinutes: number,
  type: AttendanceType
): AttendanceCalculation => {
  const [startHour, startMinute] = workStartTime.split(":").map(Number);
  const [endHour, endMinute] = workEndTime.split(":").map(Number);

  const workStart = new Date(currentTime);
  workStart.setHours(startHour, startMinute, 0, 0);

  const workEnd = new Date(currentTime);
  workEnd.setHours(endHour, endMinute, 0, 0);

  
  if (type === AttendanceType.CHECK_IN) {
    const graceEnd = new Date(
      workStart.getTime() + graceMinutes * 60 * 1000
    );

    // Employee arrived before start time
    if (currentTime < workStart) {
      const earlyMinutes = Math.floor(
        (workStart.getTime() - currentTime.getTime()) / (1000 * 60)
      );

      return {
        status: AttendanceStatus.EARLY,
        earlyMinutes,
        lateMinutes: 0,
      };
    }

    // Employee arrived on time (within grace period)
    if (currentTime <= graceEnd) {
      return {
        status: AttendanceStatus.ON_TIME,
        earlyMinutes: 0,
        lateMinutes: 0,
      };
    }

    // Employee is late
    const lateMinutes = Math.floor(
      (currentTime.getTime() - graceEnd.getTime()) / (1000 * 60)
    );

    return {
      status: AttendanceStatus.LATE,
      earlyMinutes: 0,
      lateMinutes,
    };
  }

  if (currentTime < workEnd) {
    const earlyMinutes = Math.floor(
      (workEnd.getTime() - currentTime.getTime()) / (1000 * 60)
    );

    return {
      status: AttendanceStatus.EARLY,
      earlyMinutes,
      lateMinutes: 0,
    };
  }

  // Employee left on time or later
  return {
    status: AttendanceStatus.ON_TIME,
    earlyMinutes: 0,
    lateMinutes: 0,
  };
};