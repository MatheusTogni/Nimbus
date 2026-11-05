import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import type { Changes } from './diff';

export interface AuditEntry {
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  riskId?: string | null;
  changes?: Changes;
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records an audit entry. Pass the transaction client to keep it atomic with the change. */
  async record(user: AuthUser, entry: AuditEntry, db: Db = this.prisma) {
    if (
      entry.action === AuditAction.UPDATE &&
      !Object.keys(entry.changes ?? {}).length
    ) {
      return;
    }
    await db.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        riskId: entry.riskId ?? null,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        changes: (entry.changes ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async riskHistory(user: AuthUser, riskId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId: user.organizationId, riskId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        entity: true,
        entityId: true,
        action: true,
        changes: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }
}
