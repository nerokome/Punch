import { prisma } from "../client";
import {
  LeaveStatus,
  LeaveType,
  Prisma,
} from "@prisma/client";
import { BadRequestError, NotFoundError } from "../errors";

type LeaveFilters = {
  page?: number;
  limit?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  search?: string;
  officeId?: string;
  officeIds?: string[];
};

export const createLeaveRequestService = async (
  userId: string,
  data: {
    startDate: Date;
    endDate: Date;
    leaveType: LeaveType;
    reason?: string;
  },
) => {
  if (new Date(data.endDate) < new Date(data.startDate)) {
    throw new BadRequestError(
      "End date cannot be before start date",
    );
  }

  const overlappingLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: {
        in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
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
    throw new BadRequestError(
      "You already have a leave request within this period",
    );
  }

  return prisma.leaveRequest.create({
    data: {
      userId,
      startDate: data.startDate,
      endDate: data.endDate,
      leaveType: data.leaveType,
      reason: data.reason,
    },
  });
};

export const getUserLeaveRequestsService = async (
  userId: string,
) => {
  return prisma.leaveRequest.findMany({
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

export const getLeaveRequestByIdService = async (
  leaveId: string,
) => {
  const leave = await prisma.leaveRequest.findUnique({
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
    throw new NotFoundError("Leave request not found");
  }

  return leave;
};

export const getAllLeaveRequestsService = async (
  filters: LeaveFilters = {},
) => {
  const {
    page = 1,
    limit = 10,
    status,
    leaveType,
    search = "",
    officeId,
    officeIds,
  } = filters;

  const skip = (page - 1) * limit;

  const where: Prisma.LeaveRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (leaveType) {
    where.leaveType = leaveType;
  }

  where.employee = {};

  if (officeIds && officeIds.length > 0) {
    where.employee = {
      officeId: {
        in: officeIds,
      },
    };
  } else if (officeId) {
    where.employee = {
      officeId,
    };
  }

  if (search) {
    const employeeSearch: Prisma.UserWhereInput[] = [
      {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      {
        email: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ];

    where.employee = {
      ...(where.employee as Prisma.UserWhereInput),
      OR: employeeSearch,
    };
  }

  const [total, data] = await Promise.all([
    prisma.leaveRequest.count({
      where,
    }),

    prisma.leaveRequest.findMany({
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

export const approveLeaveRequestService = async (
  leaveId: string,
  approvedById: string,
) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: {
      id: leaveId,
    },
  });

  if (!leave) {
    throw new NotFoundError("Leave request not found");
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new BadRequestError(
      "Leave request has already been processed",
    );
  }

  return prisma.leaveRequest.update({
    where: {
      id: leaveId,
    },
    data: {
      status: LeaveStatus.APPROVED,
      approvedById,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });
};

export const rejectLeaveRequestService = async (
  leaveId: string,
  approvedById: string,
  rejectionReason: string,
) => {
  const leave = await prisma.leaveRequest.findUnique({
    where: {
      id: leaveId,
    },
  });

  if (!leave) {
    throw new NotFoundError("Leave request not found");
  }

  if (leave.status !== LeaveStatus.PENDING) {
    throw new BadRequestError(
      "Leave request has already been processed",
    );
  }

  return prisma.leaveRequest.update({
    where: {
      id: leaveId,
    },
    data: {
      status: LeaveStatus.REJECTED,
      approvedById,
      approvedAt: new Date(),
      rejectionReason,
    },
  });
};
