import { AppError } from "../errors/AppError.js";

export function notFoundHandler(req, _res, next) {
  next(
    new AppError({
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    }),
  );
}

export function errorHandler(error, req, res, _next) {
  const isMalformedJson =
    error instanceof SyntaxError && error.status === 400 && "body" in error;
  const normalizedError = isMalformedJson
    ? new AppError({
        code: "VALIDATION_ERROR",
        message: "Request body must contain valid JSON",
        statusCode: 400,
      })
    : error;
  const isOperational =
    normalizedError instanceof AppError && normalizedError.isOperational;
  const statusCode = isOperational ? normalizedError.statusCode : 500;
  const code = isOperational ? normalizedError.code : "SERVER_ERROR";
  const message = isOperational
    ? normalizedError.message
    : "An unexpected server error occurred";

  if (!isOperational) {
    console.error(error);
  } else if (normalizedError.cause) {
    console.error(`[${code}]`, normalizedError.cause);
  }

  const response = {
    error: {
      code,
      message,
    },
    requestId: req.requestId,
  };

  if (isOperational && normalizedError.details !== undefined) {
    response.error.details = normalizedError.details;
  }

  res.status(statusCode).json(response);
}
