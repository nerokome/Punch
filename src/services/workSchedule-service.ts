import { prisma } from "../client";
import {
  AttendanceDayStatus,
  DayOfWeek,
  Prisma,
  Role,
  WorkSchedule,
} from "@prisma/client";
import { BadRequestError, ForbiddenError } from "../errors";

export type WorkScheduleInput = {
  userId: string;
  officeDays: DayOfWeek[];
  workMode: AttendanceDayStatus;
  effectiveFrom?: Date;
};
export type BulkUpdateWorkScheduleInput = {
  userIds: string[];
  officeDays?: DayOfWeek[];
  workMode?: AttendanceDayStatus;
  effectiveFrom?: Date;
};
export type BulkWorkScheduleInput = {
  userIds: string[];
  officeDays: DayOfWeek[];
  workMode: AttendanceDayStatus;
  effectiveFrom?: Date;
};

type CurrentUser = {
  id: string;
  role: Role;
  officeId?: string | null;
  officeIds?: string[];
  organizationId?: string | null;
};

const getAllowedOfficeIds = (currentUser: CurrentUser): string[] => {
  if (currentUser.role === Role.SUPER_ADMIN) {
    return [];
  }

  const officeIds = currentUser.officeIds?.length
    ? currentUser.officeIds
    : currentUser.officeId
      ? [currentUser.officeId]
      : [];

  return officeIds.filter((officeId): officeId is string => Boolean(officeId));
};

type TxClient = Prisma.TransactionClient;

const validateAdmin = async (
  tx: TxClient,
  currentUser: CurrentUser,
  userId: string,
) => {
  if (
    currentUser.role !== Role.ADMIN &&
    currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  const user = await tx.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new BadRequestError("User not found");
  }

  if (currentUser.organizationId && user.organizationId !== currentUser.organizationId) {
    throw new ForbiddenError("This user belongs to another organization");
  }

  if (user.isDeleted) {
    throw new BadRequestError("User has been deleted");
  }

  if (currentUser.role === Role.ADMIN) {
    const allowedOfficeIds = getAllowedOfficeIds(currentUser);

    if (allowedOfficeIds.length === 0 || !allowedOfficeIds.includes(user.officeId ?? "")) {
      throw new ForbiddenError();
    }
  }

  return user;
};


const createWorkScheduleCore = async (
  tx: TxClient,
  currentUser: CurrentUser,
  data: WorkScheduleInput,
): Promise<WorkSchedule> => {
  await validateAdmin(tx, currentUser, data.userId);

  if (!data.officeDays.length) {
    throw new BadRequestError("At least one working day must be selected");
  }

  const otherSchedules = await tx.workSchedule.findMany({
    where: {
      userId: data.userId,
    },
  });

  for (const schedule of otherSchedules) {
    const remainingDays = schedule.officeDays.filter(
      (day) => !data.officeDays.includes(day),
    );

    if (remainingDays.length === 0) {
      await tx.workSchedule.delete({
        where: {
          id: schedule.id,
        },
      });
    } else if (remainingDays.length !== schedule.officeDays.length) {
      await tx.workSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          officeDays: remainingDays,
        },
      });
    }
  }

  return await tx.workSchedule.create({
    data: {
      userId: data.userId,
      officeDays: data.officeDays,
      workMode: data.workMode,
      effectiveFrom: data.effectiveFrom ?? new Date(),
    },
  });
};

const updateWorkScheduleCore = async (
  tx: TxClient,
  currentUser: CurrentUser,
  scheduleId: string,
  data: Partial<WorkScheduleInput>,
): Promise<WorkSchedule> => {
  const schedule = await tx.workSchedule.findUnique({
    where: {
      id: scheduleId,
    },
    include: {
      user: true,
    },
  });

  if (!schedule) {
    throw new BadRequestError("Work schedule not found");
  }

  if (currentUser.organizationId && schedule.user.organizationId !== currentUser.organizationId) {
    throw new ForbiddenError("This schedule belongs to another organization");
  }

  await validateAdmin(tx, currentUser, schedule.userId);

  if (data.officeDays && data.officeDays.length > 0) {
    const otherSchedules = await tx.workSchedule.findMany({
      where: {
        userId: schedule.userId,
        NOT: {
          id: scheduleId,
        },
      },
    });

    for (const other of otherSchedules) {
      const remainingDays = other.officeDays.filter(
        (day) => !data.officeDays!.includes(day),
      );

      if (remainingDays.length === 0) {
        await tx.workSchedule.delete({
          where: {
            id: other.id,
          },
        });
      } else if (remainingDays.length !== other.officeDays.length) {
        await tx.workSchedule.update({
          where: {
            id: other.id,
          },
          data: {
            officeDays: remainingDays,
          },
        });
      }
    }
  }

  return await tx.workSchedule.update({
    where: {
      id: scheduleId,
    },
    data: {
      ...(data.officeDays && {
        officeDays: data.officeDays,
      }),

      ...(data.workMode && {
        workMode: data.workMode,
      }),

      ...(data.effectiveFrom && {
        effectiveFrom: data.effectiveFrom,
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          officeId: true,
          role: true,
          organizationId: true,
        },
      },
    },
  });
};


const upsertWorkScheduleCore = async (
  tx: TxClient,
  currentUser: CurrentUser,
  data: WorkScheduleInput,
): Promise<WorkSchedule> => {
  await validateAdmin(tx, currentUser, data.userId);

  if (!data.officeDays.length) {
    throw new BadRequestError("At least one working day must be selected");
  }

  const existingSchedules = await tx.workSchedule.findMany({
    where: {
      userId: data.userId,
    },
  });

  const matching = existingSchedules.find(
    (schedule) => schedule.workMode === data.workMode,
  );
  const others = existingSchedules.filter(
    (schedule) => schedule.workMode !== data.workMode,
  );

  
  for (const schedule of others) {
    const remainingDays = schedule.officeDays.filter(
      (day) => !data.officeDays.includes(day),
    );

    if (remainingDays.length === 0) {
      await tx.workSchedule.delete({
        where: {
          id: schedule.id,
        },
      });
    } else if (remainingDays.length !== schedule.officeDays.length) {
      await tx.workSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          officeDays: remainingDays,
        },
      });
    }
  }

  const userSelect = {
    id: true,
    name: true,
    email: true,
    officeId: true,
    role: true,
  } as const;

  if (matching) {
    return await tx.workSchedule.update({
      where: {
        id: matching.id,
      },
      data: {
        officeDays: data.officeDays,
        ...(data.effectiveFrom && { effectiveFrom: data.effectiveFrom }),
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });
  }

  return await tx.workSchedule.create({
    data: {
      userId: data.userId,
      officeDays: data.officeDays,
      workMode: data.workMode,
      effectiveFrom: data.effectiveFrom ?? new Date(),
    },
    include: {
      user: {
        select: userSelect,
      },
    },
  });
};


export const createWorkScheduleService = async (
  currentUser: CurrentUser,
  data: WorkScheduleInput,
): Promise<WorkSchedule> => {
  return await prisma.$transaction(async (tx) => {
    return await createWorkScheduleCore(tx, currentUser, data);
  });
};

export const updateWorkScheduleService = async (
  currentUser: CurrentUser,
  scheduleId: string,
  data: Partial<WorkScheduleInput>,
): Promise<WorkSchedule> => {
  return await prisma.$transaction(async (tx) => {
    return await updateWorkScheduleCore(tx, currentUser, scheduleId, data);
  });
};

export const getUserWorkSchedulesService = async (
  userId: string,
  organizationId?: string | null,
): Promise<WorkSchedule[]> => {
  return await prisma.workSchedule.findMany({
    where: {
      userId,
      ...(organizationId ? { user: { organizationId } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          officeId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getAllWorkSchedulesService = async (currentUser: {
  role: Role;
  officeId?: string | null;
  officeIds?: string[];
  organizationId?: string | null;
}): Promise<WorkSchedule[]> => {
  const allowedOfficeIds = getAllowedOfficeIds(currentUser as CurrentUser);

  const where =
    currentUser.role === Role.SUPER_ADMIN && currentUser.organizationId
      ? { user: { organizationId: currentUser.organizationId } }
      : currentUser.role === Role.SUPER_ADMIN || allowedOfficeIds.length === 0
      ? {}
      : {
          user: {
            officeId: {
              in: allowedOfficeIds,
            },
          },
        };

  return await prisma.workSchedule.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          officeId: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getWorkScheduleByIdService = async (
  scheduleId: string,
  organizationId?: string | null,
): Promise<WorkSchedule | null> => {
  const schedule = await prisma.workSchedule.findUnique({
    where: {
      id: scheduleId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          officeId: true,
          role: true,
          organizationId: true,
        },
      },
    },
  });
  if (organizationId && schedule?.user && schedule.user.organizationId !== organizationId) {
    throw new ForbiddenError("This schedule belongs to another organization");
  }
  return schedule;
};

export const deleteWorkScheduleService = async (
  currentUser: {
    role: Role;
    officeId?: string | null;
    officeIds?: string[];
    organizationId?: string | null;
  },
  scheduleId: string,
): Promise<WorkSchedule> => {
  const schedule = await prisma.workSchedule.findUnique({
    where: {
      id: scheduleId,
    },
    include: {
      user: true,
    },
  });

  if (!schedule) {
    throw new BadRequestError("Work schedule not found");
  }

  if (schedule.user.isDeleted) {
    throw new BadRequestError("User has been deleted");
  }

  if (currentUser.organizationId && schedule.user.organizationId !== currentUser.organizationId) {
    throw new ForbiddenError("This schedule belongs to another organization");
  }

  if (
    currentUser.role !== Role.ADMIN &&
    currentUser.role !== Role.SUPER_ADMIN
  ) {
    throw new ForbiddenError();
  }

  if (currentUser.role === Role.ADMIN) {
    const allowedOfficeIds = getAllowedOfficeIds(currentUser as CurrentUser);

    if (
      allowedOfficeIds.length === 0 ||
      !allowedOfficeIds.includes(schedule.user.officeId ?? "")
    ) {
      throw new ForbiddenError();
    }
  }

  return await prisma.workSchedule.delete({
    where: {
      id: scheduleId,
    },
  });
};

const bulkUpsertWorkSchedule = async (
  currentUser: CurrentUser,
  data: BulkWorkScheduleInput,
): Promise<WorkSchedule[]> => {
  if (!data.userIds.length) {
    throw new BadRequestError("Please select at least one employee");
  }

  if (!data.officeDays.length) {
    throw new BadRequestError("At least one working day must be selected");
  }

  return await prisma.$transaction(async (tx) => {
    const results: WorkSchedule[] = [];

    for (const userId of data.userIds) {
      const result = await upsertWorkScheduleCore(tx, currentUser, {
        userId,
        officeDays: data.officeDays,
        workMode: data.workMode,
        effectiveFrom: data.effectiveFrom,
      });
      results.push(result);
    }

    return results;
  });
};


export const bulkCreateWorkScheduleService = async (
  currentUser: CurrentUser,
  data: BulkWorkScheduleInput,
): Promise<WorkSchedule[]> => {
  return await bulkUpsertWorkSchedule(currentUser, data);
};

export const bulkUpdateWorkScheduleService = async (
  currentUser: CurrentUser,
  data: BulkWorkScheduleInput,
): Promise<WorkSchedule[]> => {
  return await bulkUpsertWorkSchedule(currentUser, data);
};
