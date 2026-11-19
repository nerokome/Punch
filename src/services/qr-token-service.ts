import { prisma } from "../client";
import { AttendanceType, OfficeLocation, QRToken } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';
import { BadRequestError } from "../errors";

export type QRTokenInput = Omit<QRToken, "id" | "createdAt" | "updatedAt">;
export type ReturnedQRToken = Omit<QRToken, "createdAt" | "updatedAt">;

const QR_TOKEN_EXPIRY_MINUTES = 720;

export const createQRTokenService = async (
    officeId: string,
    type: AttendanceType,
  ): Promise<ReturnedQRToken> => {
    const office = await prisma.officeLocation.findUnique({
        where: { id: officeId },
    });
    if (!office) throw new BadRequestError("Office not found");

    const token = uuidv4();

    try {
        const qRToken = await prisma.qRToken.create({
            data: {
                officeId,
                type,
                token,
                expiresAt: new Date(
                    Date.now() + 1000 * 60 * QR_TOKEN_EXPIRY_MINUTES,
                ),
            },
        });
        return qRToken;
    } catch (error) {
        throw new BadRequestError("Failed to create QR token");
    }
};