import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity, RiskAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { diff, snapshot } from '../audit/diff';
import type { AuthUser } from '../common/auth-user';
import { badRequest, notFound } from '../common/errors';
import { DemoLimitsService } from '../demo/demo-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { RisksService } from '../risks/risks.service';
import { CreateActionDto, UpdateActionDto } from './action.dto';

const FIELDS: (keyof RiskAction)[] = [
  'description',
  'assigneeId',
  'dueDate',
  'completedAt',
];
const INCLUDE = { assignee: { select: { id: true, name: true } } } as const;

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly risks: RisksService,
    private readonly demoLimits: DemoLimitsService,
  ) {}

  async list(user: AuthUser, riskId: string) {
    await this.risks.assertExists(user, riskId);
    return this.prisma.riskAction.findMany({
      where: { riskId },
      orderBy: [
        { completedAt: { sort: 'desc', nulls: 'first' } },
        { dueDate: { sort: 'asc', nulls: 'last' } },
      ],
      include: INCLUDE,
    });
  }

  async create(user: AuthUser, riskId: string, dto: CreateActionDto) {
    await this.risks.assertExists(user, riskId);
    await this.demoLimits.assertCanCreate(user, 'action');
    await this.assertAssignee(user, dto.assigneeId);
    return this.prisma.$transaction(async (tx) => {
      const action = await tx.riskAction.create({
        data: {
          riskId,
          description: dto.description,
          assigneeId: dto.assigneeId ?? null,
          dueDate: dto.dueDate ?? null,
        },
        include: INCLUDE,
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.ACTION,
          entityId: action.id,
          riskId,
          action: AuditAction.CREATE,
          changes: snapshot(action, FIELDS, 'create'),
        },
        tx,
      );
      return action;
    });
  }

  async update(
    user: AuthUser,
    riskId: string,
    id: string,
    dto: UpdateActionDto,
  ) {
    const current = await this.find(user, riskId, id);
    await this.assertAssignee(user, dto.assigneeId);
    const completedAt =
      dto.completed === undefined
        ? undefined
        : dto.completed
          ? (current.completedAt ?? new Date())
          : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.riskAction.update({
        where: { id },
        data: {
          description: dto.description,
          assigneeId: dto.assigneeId,
          dueDate: dto.dueDate,
          completedAt,
        },
        include: INCLUDE,
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.ACTION,
          entityId: id,
          riskId,
          action: AuditAction.UPDATE,
          changes: diff(current, updated, FIELDS),
        },
        tx,
      );
      return updated;
    });
  }

  async remove(user: AuthUser, riskId: string, id: string) {
    const current = await this.find(user, riskId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.riskAction.delete({ where: { id } });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.ACTION,
          entityId: id,
          riskId,
          action: AuditAction.DELETE,
          changes: { description: [current.description, null] },
        },
        tx,
      );
    });
  }

  private async find(user: AuthUser, riskId: string, id: string) {
    const action = await this.prisma.riskAction.findFirst({
      where: { id, riskId, risk: { organizationId: user.organizationId } },
    });
    if (!action) throw notFound('Action');
    return action;
  }

  private async assertAssignee(user: AuthUser, assigneeId?: string | null) {
    if (!assigneeId) return;
    const ok = await this.prisma.user.count({
      where: { id: assigneeId, organizationId: user.organizationId },
    });
    if (!ok) throw badRequest('Assignee not found');
  }
}
