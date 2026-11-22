"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectLeaveRequestService = exports.approveLeaveRequestService = exports.getAllLeaveRequestsService = exports.getLeaveRequestByIdService = exports.getUserLeaveRequestsService = exports.createLeaveRequestService = void 0;
const client_1 = require("../client");
const client_2 = require("@prisma/client");
const errors_1 = require("../errors");
const createLeaveRequestService = async (userId, data) => {
    if (new Date(data.endDate) < new Date(data.startDate)) {
        throw new errors_1.BadRequestError("End date cannot be before start date");
    }
    const overlappingLeave = await client_1.prisma.leaveRequest.findFirst({
        where: {
            userId,
            status: {
                in: [client_2.LeaveStatus.PENDING, client_2.LeaveStatus.APPROVED],
            },
            OR: [
                {
                    startDate: {
                        lte: data.endDate,
                    },
                    endDate: {
                        gte: data.startDate,
                    },
                },
            ],
        },
    });
    if (overlappingLeave) {
        throw new errors_1.BadRequestError("You already have a leave request within this period");
    }
    return client_1.prisma.leaveRequest.create({
        data: {
            userId,
            startDate: data.startDate,
            endDate: data.endDate,
            leaveType: data.leaveType,
            reason: data.reason,
        },
    });
};
exports.createLeaveRequestService = createLeaveRequestService;
const getUserLeaveRequestsService = async (userId) => {
    return client_1.prisma.leaveRequest.findMany({
        where: {
            userId,
        },
        include: {
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};
exports.getUserLeaveRequestsService = getUserLeaveRequestsService;
const getLeaveRequestByIdService = async (leaveId) => {
    const leave = await client_1.prisma.leaveRequest.findUnique({
        where: {
            id: leaveId,
        },
        include: {
            employee: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    officeId: true,
                },
            },
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    if (!leave) {
        throw new errors_1.NotFoundError("Leave request not found");
    }
    return leave;
};
exports.getLeaveRequestByIdService = getLeaveRequestByIdService;
const getAllLeaveRequestsService = async (filters = {}) => {
    const { page = 1, limit = 10, status, leaveType, search = "", officeId, officeIds, organizationId, } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) {
        where.status = status;
    }
    if (leaveType) {
        where.leaveType = leaveType;
    }
    const employeeWhere = {};
    if (organizationId)
        employeeWhere.organizationId = organizationId;
    if (officeIds !== undefined) {
        employeeWhere.officeId = { in: officeIds };
    }
    else if (officeId) {
        employeeWhere.officeId = officeId;
    }
    where.employee = employeeWhere;
    if (search) {
        const employeeSearch = [
            {
                name: {
                    contains: search,
                    mode: client_2.Prisma.QueryMode.insensitive,
                },
            },
            {
                email: {
                    contains: search,
                    mode: client_2.Prisma.QueryMode.insensitive,
                },
            },
        ];
        where.employee = {
            ...where.employee,
            OR: employeeSearch,
        };
    }
    const [total, data] = await Promise.all([
        client_1.prisma.leaveRequest.count({
            where,
        }),
        client_1.prisma.leaveRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        office: true,
                    },
                },
                approvedBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        }),
    ]);
    return {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data,
    };
};
exports.getAllLeaveRequestsService = getAllLeaveRequestsService;
const approveLeaveRequestService = async (leaveId, approvedById) => {
    const leave = await client_1.prisma.leaveRequest.findUnique({
        where: {
            id: leaveId,
        },
    });
    if (!leave) {
        throw new errors_1.NotFoundError("Leave request not found");
    }
    if (leave.status !== client_2.LeaveStatus.PENDING) {
        throw new errors_1.BadRequestError("Leave request has already been processed");
    }
    return client_1.prisma.leaveRequest.update({
        where: {
            id: leaveId,
        },
        data: {
            status: client_2.LeaveStatus.APPROVED,
            approvedById,
            approvedAt: new Date(),
            rejectionReason: null,
        },
    });
};
exports.approveLeaveRequestService = approveLeaveRequestService;
const rejectLeaveRequestService = async (leaveId, approvedById, rejectionReason) => {
    const leave = await client_1.prisma.leaveRequest.findUnique({
        where: {
            id: leaveId,
        },
    });
    if (!leave) {
        throw new errors_1.NotFoundError("Leave request not found");
    }
    if (leave.status !== client_2.LeaveStatus.PENDING) {
        throw new errors_1.BadRequestError("Leave request has already been processed");
    }
    return client_1.prisma.leaveRequest.update({
        where: {
            id: leaveId,
        },
        data: {
            status: client_2.LeaveStatus.REJECTED,
            approvedById,
            approvedAt: new Date(),
            rejectionReason,
        },
    });
};
exports.rejectLeaveRequestService = rejectLeaveRequestService;
