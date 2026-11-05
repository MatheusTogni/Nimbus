import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { diff } from '../audit/diff';
import type { AuthUser } from '../common/auth-user';
import { conflict, notFound } from '../common/errors';
import { DemoLimitsService } from '../demo/demo-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly demoLimits: DemoLimitsService,
  ) {}

  list(user: AuthUser) {
    return this.prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        _count: { select: { risks: true } },
      },
    });
  }

  async create(user: AuthUser, dto: CreateCategoryDto) {
    await this.demoLimits.assertCanCreate(user, 'category');
    await this.assertNameFree(user, dto.name);
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name,
          color: dto.color,
        },
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.CATEGORY,
          entityId: category.id,
          action: AuditAction.CREATE,
          changes: { name: [null, category.name] },
        },
        tx,
      );
      return category;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCategoryDto) {
    const current = await this.find(user, id);
    if (dto.name && dto.name !== current.name)
      await this.assertNameFree(user, dto.name);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: dto });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.CATEGORY,
          entityId: id,
          action: AuditAction.UPDATE,
          changes: diff(current, updated, ['name', 'color']),
        },
        tx,
      );
      return updated;
    });
  }

  async remove(user: AuthUser, id: string) {
    const current = await this.find(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.CATEGORY,
          entityId: id,
          action: AuditAction.DELETE,
          changes: { name: [current.name, null] },
        },
        tx,
      );
    });
  }

  private async find(user: AuthUser, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!category) throw notFound('Category');
    return category;
  }

  private async assertNameFree(user: AuthUser, name: string) {
    const taken = await this.prisma.category.findFirst({
      where: {
        organizationId: user.organizationId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (taken) throw conflict('A category with this name already exists');
  }
}
