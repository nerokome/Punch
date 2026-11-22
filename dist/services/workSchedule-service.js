"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateWorkScheduleService = exports.bulkCreateWorkScheduleService = exports.deleteWorkScheduleService = exports.getWorkScheduleByIdService = exports.getAllWorkSchedulesService = exports.getUserWorkSchedulesService = exports.updateWorkScheduleService = exports.createWorkScheduleService = void 0;
const client_1 = require("../client");
const client_2 = require("@prisma/client");
const errors_1 = require("../errors");
const getAllowedOfficeIds = (currentUser) => {
    if (currentUser.role === client_2.Role.SUPER_ADMIN) {
        return [];
    }
    const officeIds = currentUser.officeIds?.length
        ? currentUser.officeIds
        : currentUser.officeId
            ? [currentUser.officeId]
            : [];
    return officeIds.filter((officeId) => Boolean(officeId));
};
const validateAdmin = async (tx, currentUser, userId) => {
    if (currentUser.role !== client_2.Role.ADMIN &&
        currentUser.role !== client_2.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    const user = await tx.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new errors_1.BadRequestError("User not found");
    }
    if (currentUser.organizationId && user.organizationId !== currentUser.organizationId) {
        throw new errors_1.ForbiddenError("This user belongs to another organization");
    }
    if (user.isDeleted) {
        throw new errors_1.BadRequestError("User has been deleted");
    }
    if (currentUser.role === client_2.Role.ADMIN) {
        const allowedOfficeIds = getAllowedOfficeIds(currentUser);
        if (allowedOfficeIds.length === 0 || !allowedOfficeIds.includes(user.officeId ?? "")) {
            throw new errors_1.ForbiddenError();
        }
    }
    return user;
};
const createWorkScheduleCore = async (tx, currentUser, data) => {
    await validateAdmin(tx, currentUser, data.userId);
    if (!data.officeDays.length) {
        throw new errors_1.BadRequestError("At least one working day must be selected");
    }
    const otherSchedules = await tx.workSchedule.findMany({
        where: {
            userId: data.userId,
        },
    });
    for (const schedule of otherSchedules) {
        const remainingDays = schedule.officeDays.filter((day) => !data.officeDays.includes(day));
        if (remainingDays.length === 0) {
            await tx.workSchedule.delete({
                where: {
                    id: schedule.id,
                },
            });
        }
        else if (remainingDays.length !== schedule.officeDays.length) {
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
const updateWorkScheduleCore = async (tx, currentUser, scheduleId, data) => {
    const schedule = await tx.workSchedule.findUnique({
        where: {
            id: scheduleId,
        },
        include: {
            user: true,
        },
    });
    if (!schedule) {
        throw new errors_1.BadRequestError("Work schedule not found");
    }
    if (currentUser.organizationId && schedule.user.organizationId !== currentUser.organizationId) {
        throw new errors_1.ForbiddenError("This schedule belongs to another organization");
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
            const remainingDays = other.officeDays.filter((day) => !data.officeDays.includes(day));
            if (remainingDays.length === 0) {
                await tx.workSchedule.delete({
                    where: {
                        id: other.id,
                    },
                });
            }
            else if (remainingDays.length !== other.officeDays.length) {
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
const upsertWorkScheduleCore = async (tx, currentUser, data) => {
    await validateAdmin(tx, currentUser, data.userId);
    if (!data.officeDays.length) {
        throw new errors_1.BadRequestError("At least one working day must be selected");
    }
    const existingSchedules = await tx.workSchedule.findMany({
        where: {
            userId: data.userId,
        },
    });
    const matching = existingSchedules.find((schedule) => schedule.workMode === data.workMode);
    const others = existingSchedules.filter((schedule) => schedule.workMode !== data.workMode);
    for (const schedule of others) {
        const remainingDays = schedule.officeDays.filter((day) => !data.officeDays.includes(day));
        if (remainingDays.length === 0) {
            await tx.workSchedule.delete({
                where: {
                    id: schedule.id,
                },
            });
        }
        else if (remainingDays.length !== schedule.officeDays.length) {
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
    };
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
const createWorkScheduleService = async (currentUser, data) => {
    return await client_1.prisma.$transaction(async (tx) => {
        return await createWorkScheduleCore(tx, currentUser, data);
    });
};
exports.createWorkScheduleService = createWorkScheduleService;
const updateWorkScheduleService = async (currentUser, scheduleId, data) => {
    return await client_1.prisma.$transaction(async (tx) => {
        return await updateWorkScheduleCore(tx, currentUser, scheduleId, data);
    });
};
exports.updateWorkScheduleService = updateWorkScheduleService;
const getUserWorkSchedulesService = async (userId, organizationId) => {
    return await client_1.prisma.workSchedule.findMany({
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
exports.getUserWorkSchedulesService = getUserWorkSchedulesService;
const getAllWorkSchedulesService = async (currentUser) => {
    const allowedOfficeIds = getAllowedOfficeIds(currentUser);
    const where = currentUser.role === client_2.Role.SUPER_ADMIN && currentUser.organizationId
        ? { user: { organizationId: currentUser.organizationId } }
        : currentUser.role === client_2.Role.SUPER_ADMIN || allowedOfficeIds.length === 0
            ? {}
            : {
                user: {
                    officeId: {
                        in: allowedOfficeIds,
                    },
                },
            };
    return await client_1.prisma.workSchedule.findMany({
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
exports.getAllWorkSchedulesService = getAllWorkSchedulesService;
const getWorkScheduleByIdService = async (scheduleId, organizationId) => {
    const schedule = await client_1.prisma.workSchedule.findUnique({
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
        throw new errors_1.ForbiddenError("This schedule belongs to another organization");
    }
    return schedule;
};
exports.getWorkScheduleByIdService = getWorkScheduleByIdService;
const deleteWorkScheduleService = async (currentUser, scheduleId) => {
    const schedule = await client_1.prisma.workSchedule.findUnique({
        where: {
            id: scheduleId,
        },
        include: {
            user: true,
        },
    });
    if (!schedule) {
        throw new errors_1.BadRequestError("Work schedule not found");
    }
    if (schedule.user.isDeleted) {
        throw new errors_1.BadRequestError("User has been deleted");
    }
    if (currentUser.organizationId && schedule.user.organizationId !== currentUser.organizationId) {
        throw new errors_1.ForbiddenError("This schedule belongs to another organization");
    }
    if (currentUser.role !== client_2.Role.ADMIN &&
        currentUser.role !== client_2.Role.SUPER_ADMIN) {
        throw new errors_1.ForbiddenError();
    }
    if (currentUser.role === client_2.Role.ADMIN) {
        const allowedOfficeIds = getAllowedOfficeIds(currentUser);
        if (allowedOfficeIds.length === 0 ||
            !allowedOfficeIds.includes(schedule.user.officeId ?? "")) {
            throw new errors_1.ForbiddenError();
        }
    }
    return await client_1.prisma.workSchedule.delete({
        where: {
            id: scheduleId,
        },
    });
};
exports.deleteWorkScheduleService = deleteWorkScheduleService;
const bulkUpsertWorkSchedule = async (currentUser, data) => {
    if (!data.userIds.length) {
        throw new errors_1.BadRequestError("Please select at least one employee");
    }
    if (!data.officeDays.length) {
        throw new errors_1.BadRequestError("At least one working day must be selected");
    }
    return await client_1.prisma.$transaction(async (tx) => {
        const results = [];
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
const bulkCreateWorkScheduleService = async (currentUser, data) => {
    return await bulkUpsertWorkSchedule(currentUser, data);
};
exports.bulkCreateWorkScheduleService = bulkCreateWorkScheduleService;
const bulkUpdateWorkScheduleService = async (currentUser, data) => {
    return await bulkUpsertWorkSchedule(currentUser, data);
};
exports.bulkUpdateWorkScheduleService = bulkUpdateWorkScheduleService;
