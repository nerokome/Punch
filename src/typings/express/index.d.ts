import { KYCStatus, Role, User } from "@prisma/client";

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  phone: string;
  officeId?: string | null;
  organizationId?: string | null;
  officeIds?: string[];
  role: Role;
  isActive: KYCStatus;
  isVerified: boolean;
}

declare global {
  namespace Express {
    interface Users extends User {}
  }
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}
