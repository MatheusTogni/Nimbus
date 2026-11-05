import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PROFILE_SELECT } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { diff } from '../audit/diff';
import type { AuthUser } from '../common/auth-user';
import {
  AppException,
  badRequest,
  conflict,
  ErrorCode,
  notFound,
} from '../common/errors';
import { demoRestricted } from '../common/guards';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  isDemo: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: USER_SELECT,
    });
  }

  /** Lightweight list for owner/assignee pickers (any role). */
  options(user: AuthUser) {
    return this.prisma.user.findMany({
      where: { organizationId: user.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(user: AuthUser, dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw conflict('A user with this email already exists');

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name,
          email: dto.email,
          role: dto.role,
          passwordHash: await argon2.hash(dto.password),
        },
        select: USER_SELECT,
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.USER,
          entityId: record.id,
          action: AuditAction.CREATE,
          changes: {
            name: [null, record.name],
            email: [null, record.email],
            role: [null, record.role],
          },
        },
        tx,
      );
      return record;
    });
    return created;
  }

  async update(user: AuthUser, id: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!target) throw notFound('User');

    const demoting = dto.role !== undefined && dto.role !== Role.ADMIN;
    const deactivating = dto.active === false;
    if (id === user.id && (demoting || deactivating)) {
      throw badRequest('You cannot remove your own admin access');
    }
    if (target.role === Role.ADMIN && (demoting || deactivating)) {
      const admins = await this.prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: Role.ADMIN,
          active: true,
        },
      });
      if (admins <= 1)
        throw badRequest('The organization needs at least one active admin');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          role: dto.role,
          active: dto.active,
          ...(dto.password
            ? { passwordHash: await argon2.hash(dto.password) }
            : {}),
        },
      });
      if (deactivating || dto.password) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      const changes = diff(target, updated, ['name', 'role', 'active']);
      if (dto.password) changes.password = ['***', '***'];
      await this.audit.record(
        user,
        {
          entity: AuditEntity.USER,
          entityId: id,
          action: AuditAction.UPDATE,
          changes,
        },
        tx,
      );
      return tx.user.findUniqueOrThrow({ where: { id }, select: USER_SELECT });
    });
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto) {
    if (user.isDemo && dto.name !== undefined) throw demoRestricted();
    return this.prisma.user.update({
      where: { id: user.id },
      data: { name: dto.name, locale: dto.locale, theme: dto.theme },
      select: PROFILE_SELECT,
    });
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    const record = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const valid = await argon2.verify(record.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.INVALID_CREDENTIALS,
        'Current password is incorrect',
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });
  }
}
