import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AccessTokenPayload, AuthUser } from '../auth-user';
import { DEMO_FORBIDDEN_KEY, IS_PUBLIC_KEY, ROLES_KEY } from '../decorators';
import { AppException, ErrorCode, forbidden } from '../errors';

type AuthRequest = Request & { user?: AuthUser };

function metadata<T>(
  reflector: Reflector,
  key: string,
  context: ExecutionContext,
): T | undefined {
  return reflector.getAllAndOverride<T>(key, [
    context.getHandler(),
    context.getClass(),
  ]);
}

/** Validates the Bearer access token on every non-@Public() route. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (metadata<boolean>(this.reflector, IS_PUBLIC_KEY, context)) return true;

    const req = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      req.user = {
        id: payload.sub,
        organizationId: payload.org,
        role: payload.role,
        isDemo: payload.demo,
      };
      return true;
    } catch {
      throw unauthorized();
    }
  }
}

/** Enforces @Roles(). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = metadata<Role[]>(this.reflector, ROLES_KEY, context);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (!user || !roles.includes(user.role)) throw forbidden();
    return true;
  }
}

/** Enforces @DemoForbidden(). */
@Injectable()
export class DemoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!metadata<boolean>(this.reflector, DEMO_FORBIDDEN_KEY, context)) {
      return true;
    }
    const user = context.switchToHttp().getRequest<AuthRequest>().user;
    if (user?.isDemo) throw demoRestricted();
    return true;
  }
}

function unauthorized() {
  return new AppException(
    HttpStatus.UNAUTHORIZED,
    ErrorCode.UNAUTHORIZED,
    'Missing or invalid access token',
  );
}

export function demoRestricted() {
  return new AppException(
    HttpStatus.FORBIDDEN,
    ErrorCode.DEMO_RESTRICTED,
    'This action is disabled in the demo account',
  );
}
