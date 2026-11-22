import { prisma } from "../client";
import { OfficeLocation, Shift, User } from "@prisma/client";
import { BadRequestError } from "../errors";

export type OfficeLocationInput = {
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number;
  organizationId?: string | null;
};

export type ReturnedOfficeLocation = Omit<OfficeLocation, "createdAt" | "updatedAt">;

export type ShiftInput = Omit<Shift, "id" | "createdAt" | "updatedAt">;

const validateOfficeCoordinates = (
  data: Partial<OfficeLocationInput>,
): void => {
  const { latitude, longitude, radius } = data;

  const hasLat = latitude !== undefined && latitude !== null;
  const hasLng = longitude !== undefined && longitude !== null;

  if (hasLat !== hasLng) {
    throw new BadRequestError(
      "Both latitude and longitude must be provided together.",
    );
  }

  if (hasLat && hasLng) {
    if (latitude! < -90 || latitude! > 90) {
      throw new BadRequestError("Latitude must be between -90 and 90.");
    }
    if (longitude! < -180 || longitude! > 180) {
      throw new BadRequestError("Longitude must be between -180 and 180.");
    }
  }

  if (radius !== undefined && radius !== null && radius <= 0) {
    throw new BadRequestError("Radius must be a positive number of meters.");
  }
};

export const createOfficeLocationService = async (
  data: OfficeLocationInput,
): Promise<ReturnedOfficeLocation> => {
  validateOfficeCoordinates(data);

  try {
    const office = await prisma.officeLocation.create({
      data,
    });
    return office;
  } catch (error) {
    throw new BadRequestError("Failed to create office location");
  }
};

export const updateOfficeLocationService = async (
  officeId: string,
  data: Partial<OfficeLocationInput>,
): Promise<ReturnedOfficeLocation | null> => {
  validateOfficeCoordinates(data);

  try {
    const info = await prisma.officeLocation.update({
      where: { id: officeId },
      data,
    });
    return info;
  } catch (error) {
    throw new BadRequestError("Failed to update office location");
  }
};

export const getOfficeLocationByOfficeId = async (
  officeId: string,
): Promise<ReturnedOfficeLocation | null> => {
  const info = await prisma.officeLocation.findUnique({
    where: { id: officeId },
    //   include: { users: true },
  });
  return info;
};

/**
 * Fetches office locations.
 *
 * - Pass nothing (undefined) -> every office (used by SUPER_ADMIN, whose
 *   resolveOfficeScope returns undefined = unrestricted).
 * - Pass a single officeId string -> just that one office.
 * - Pass an array of officeIds -> every office in that list (used by ADMIN,
 *   whose resolveOfficeScope returns their merged primary + assigned
 *   AdminOfficeAccess offices).
 */
export const getAllOfficeLocationsService = async (
  officeId?: string | string[],
): Promise<ReturnedOfficeLocation[]> => {
  const whereCondition: any = {};

  if (Array.isArray(officeId)) {
    if (officeId.length > 0) {
      whereCondition.id = { in: officeId };
    } else {
      // Caller has an explicit but empty scope (e.g. an admin with no
      // offices assigned yet) — they should see nothing, not everything.
      return [];
    }
  } else if (officeId) {
    whereCondition.id = officeId;
  }

  const allOffices = await prisma.officeLocation.findMany({
    where: whereCondition,
    // include: { users: true },
    orderBy: { createdAt: "desc" },
  });

  return allOffices;
};

// Shift services
export const createShiftService = async (
  data: ShiftInput,
): Promise<Shift> => {
  try {
    return await prisma.shift.create({
      data,
    });
  } catch (error) {
    throw new BadRequestError("Failed to create shift");
  }
};

export const getShiftsByOfficeIdService = async (
  officeId: string,
): Promise<Shift[]> => {
  return await prisma.shift.findMany({
    where: { officeId },
    include: { users: true },
    orderBy: { createdAt: "desc" },
  });
};

export const updateShiftService = async (
  shiftId: string,
  data: Partial<ShiftInput>,
): Promise<Shift | null> => {
  try {
    return await prisma.shift.update({
      where: { id: shiftId },
      data,
    });
  } catch (error) {
    throw new BadRequestError("Failed to update shift");
  }
};

export const deleteShiftService = async (
  shiftId: string,
): Promise<Shift | null> => {
  const usersOnShift = await prisma.user.count({ where: { shiftId } });

  if (usersOnShift > 0) {
    throw new BadRequestError(
      `Cannot delete shift: ${usersOnShift} user(s) are still assigned to it. Reassign them first.`,
    );
  }

  try {
    return await prisma.shift.delete({
      where: { id: shiftId },
    });
  } catch (error) {
    throw new BadRequestError("Failed to delete shift");
  }
};

export const assignUserToShiftService = async (
  userId: string,
  shiftId: string,
): Promise<User | null> => {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { shiftId },
    });
  } catch (error) {
    throw new BadRequestError("Failed to assign user to shift");
  }
};
