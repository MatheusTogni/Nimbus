import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { forbidden, notFound } from '../common/errors';
import { DemoLimitsService } from '../demo/demo-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { RisksService } from '../risks/risks.service';

const SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly risks: RisksService,
    private readonly demoLimits: DemoLimitsService,
  ) {}

  async list(user: AuthUser, riskId: string) {
    await this.risks.assertExists(user, riskId);
    return this.prisma.comment.findMany({
      where: { riskId },
      orderBy: { createdAt: 'asc' },
      select: SELECT,
    });
  }

  async create(user: AuthUser, riskId: string, body: string) {
    await this.risks.assertExists(user, riskId);
    await this.demoLimits.assertCanCreate(user, 'comment');
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { riskId, authorId: user.id, body },
        select: SELECT,
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.COMMENT,
          entityId: comment.id,
          riskId,
          action: AuditAction.CREATE,
          changes: { body: [null, body] },
        },
        tx,
      );
      return comment;
    });
  }

  async remove(user: AuthUser, riskId: string, id: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id, riskId, risk: { organizationId: user.organizationId } },
    });
    if (!comment) throw notFound('Comment');
    if (comment.authorId !== user.id && user.role !== Role.ADMIN) {
      throw forbidden('Only the author or an admin can delete this comment');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id } });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.COMMENT,
          entityId: id,
          riskId,
          action: AuditAction.DELETE,
          changes: { body: [comment.body, null] },
        },
        tx,
      );
    });
  }
}
