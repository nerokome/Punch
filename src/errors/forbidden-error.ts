import { StatusCodes } from "http-status-codes";
import { CustomError } from "./custom-error";

export class ForbiddenError extends CustomError {
  statusCode = StatusCodes.FORBIDDEN;

  constructor(message?: string) {
    super(message || "Forbidden");

    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
