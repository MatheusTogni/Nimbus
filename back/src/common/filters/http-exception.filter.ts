import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ErrorBody, ErrorCode } from '../errors';

const STATUS_CODES: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

/** Normalizes every error into `{ statusCode, code, message, details? }`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof ThrottlerException) {
      return {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: ErrorCode.TOO_MANY_REQUESTS,
        message: 'Too many requests, please slow down',
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response && 'code' in response) {
        return response as ErrorBody;
      }
      const raw =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] }).message;
      const code = STATUS_CODES[statusCode] ?? ErrorCode.INTERNAL_ERROR;
      if (Array.isArray(raw)) {
        return { statusCode, code, message: 'Validation failed', details: raw };
      }
      return { statusCode, code, message: raw ?? exception.message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCode.NOT_FOUND,
          message: 'Resource not found',
        };
      }
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCode.CONFLICT,
          message: 'Resource already exists',
        };
      }
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }
}
