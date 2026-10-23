export class AppError extends Error {
  constructor({ code, message, statusCode = 500, details, cause }) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}
