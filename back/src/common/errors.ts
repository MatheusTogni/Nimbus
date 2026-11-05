import { HttpException, HttpStatus } from '@nestjs/common';

/** Stable, machine-readable error codes. The front end translates them. */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DEMO_RESTRICTED: 'DEMO_RESTRICTED',
  DEMO_LIMIT_REACHED: 'DEMO_LIMIT_REACHED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    const body: ErrorBody = { statusCode: status, code, message };
    if (details !== undefined) body.details = details;
    super(body, status);
  }
}

export const notFound = (what = 'Resource') =>
  new AppException(
    HttpStatus.NOT_FOUND,
    ErrorCode.NOT_FOUND,
    `${what} not found`,
  );

export const forbidden = (message = 'You do not have permission to do this') =>
  new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, message);

export const badRequest = (message: string, details?: unknown) =>
  new AppException(
    HttpStatus.BAD_REQUEST,
    ErrorCode.VALIDATION_ERROR,
    message,
    details,
  );

export const conflict = (message: string) =>
  new AppException(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message);
