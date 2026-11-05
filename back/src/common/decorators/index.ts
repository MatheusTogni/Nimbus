import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthUser } from '../auth-user';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skips the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Roles allowed to change risk data. */
export const EDITOR_ROLES: Role[] = [Role.ADMIN, Role.MANAGER];

export const DEMO_FORBIDDEN_KEY = 'demoForbidden';
/** Blocks the route for users of the demo organization (403 DEMO_RESTRICTED). */
export const DemoForbidden = () => SetMetadata(DEMO_FORBIDDEN_KEY, true);

/** Injects the authenticated user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
