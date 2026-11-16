export class AppError extends Error {
  readonly status: number;
  readonly errors: unknown;
  readonly code?: string;

  constructor(
    message: string,
    status = 400,
    errors: unknown = null,
    code?: string,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Anda harus login terlebih dahulu") {
    super(message, 401, null, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Anda tidak memiliki akses ke resource ini") {
    super(message, 403, null, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource tidak ditemukan") {
    super(message, 404, null, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Data bertentangan dengan data yang sudah ada") {
    super(message, 409, null, "CONFLICT");
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
