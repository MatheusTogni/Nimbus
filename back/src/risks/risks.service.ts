import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntity, Prisma, Risk } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { diff, snapshot } from '../audit/diff';
import type { AuthUser } from '../common/auth-user';
import { badRequest, notFound } from '../common/errors';
import { paginate } from '../common/pagination';
import { DemoLimitsService } from '../demo/demo-limits.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskDto, RiskQueryDto, UpdateRiskDto } from './dto/risk.dto';
import {
  calculateScore,
  LEVEL_RANGES,
  levelFromScore,
  riskCode,
} from './risk-level';

/** Fields tracked in the audit history. */
export const AUDITED_RISK_FIELDS: (keyof Risk)[] = [
  'title',
  'description',
  'categoryId',
  'ownerId',
  'probability',
  'impact',
  'score',
  'residualProbability',
  'residualImpact',
  'residualScore',
  'status',
  'reviewDate',
];

const LIST_INCLUDE = {
  category: { select: { id: true, name: true, color: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { actions: true, comments: true } },
} satisfies Prisma.RiskInclude;

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.RiskInclude;

/** Adds the computed `level` / `residualLevel` to a risk. */
export function withLevels<T extends Pick<Risk, 'score' | 'residualScore'>>(
  risk: T,
) {
  return {
    ...risk,
    level: levelFromScore(risk.score),
    residualLevel: risk.residualScore
      ? levelFromScore(risk.residualScore)
      : null,
  };
}

@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly demoLimits: DemoLimitsService,
  ) {}

  async list(user: AuthUser, query: RiskQueryDto) {
    const where = this.buildWhere(user, query);
    const orderBy = riskOrderBy(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.risk.findMany({
        where,
        orderBy,
        include: LIST_INCLUDE,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.risk.count({ where }),
    ]);
    return paginate(rows.map(withLevels), total, query.page, query.pageSize);
  }

  async exportCsv(user: AuthUser, query: RiskQueryDto): Promise<string> {
    const rows = await this.prisma.risk.findMany({
      where: this.buildWhere(user, query),
      orderBy: riskOrderBy(query),
      include: LIST_INCLUDE,
      take: 5000,
    });
    const header = [
      'code',
      'title',
      'category',
      'owner',
      'status',
      'probability',
      'impact',
      'score',
      'level',
      'residual_probability',
      'residual_impact',
      'residual_score',
      'residual_level',
      'review_date',
      'created_at',
    ];
    const lines = rows
      .map(withLevels)
      .map((r) =>
        [
          r.code,
          r.title,
          r.category?.name,
          r.owner?.name,
          r.status,
          r.probability,
          r.impact,
          r.score,
          r.level,
          r.residualProbability,
          r.residualImpact,
          r.residualScore,
          r.residualLevel,
          r.reviewDate?.toISOString().slice(0, 10),
          r.createdAt.toISOString(),
        ]
          .map(csvCell)
          .join(','),
      );
    // BOM so Excel opens accented characters correctly.
    return '﻿' + [header.join(','), ...lines].join('\r\n');
  }

  async findOne(user: AuthUser, id: string) {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId: user.organizationId },
      include: DETAIL_INCLUDE,
    });
    if (!risk) throw notFound('Risk');
    return withLevels(risk);
  }

  async create(user: AuthUser, dto: CreateRiskDto) {
    await this.demoLimits.assertCanCreate(user, 'risk');
    await this.assertReferences(user, dto);
    const scores = this.computeScores(dto);

    const id = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: user.organizationId },
        data: { riskSequence: { increment: 1 } },
        select: { riskSequence: true },
      });
      const risk = await tx.risk.create({
        data: {
          organizationId: user.organizationId,
          code: riskCode(org.riskSequence),
          title: dto.title,
          description: dto.description ?? '',
          categoryId: dto.categoryId ?? null,
          ownerId: dto.ownerId ?? null,
          probability: dto.probability,
          impact: dto.impact,
          status: dto.status,
          reviewDate: dto.reviewDate ?? null,
          createdById: user.id,
          ...scores,
        },
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.RISK,
          entityId: risk.id,
          riskId: risk.id,
          action: AuditAction.CREATE,
          changes: snapshot(risk, AUDITED_RISK_FIELDS, 'create'),
        },
        tx,
      );
      return risk.id;
    });
    return this.findOne(user, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateRiskDto) {
    const current = await this.prisma.risk.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!current) throw notFound('Risk');
    await this.assertReferences(user, dto);

    const merged = {
      probability: dto.probability ?? current.probability,
      impact: dto.impact ?? current.impact,
      residualProbability:
        dto.residualProbability !== undefined
          ? dto.residualProbability
          : current.residualProbability,
      residualImpact:
        dto.residualImpact !== undefined
          ? dto.residualImpact
          : current.residualImpact,
    };
    const scores = this.computeScores(merged);

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.risk.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          categoryId: dto.categoryId,
          ownerId: dto.ownerId,
          status: dto.status,
          reviewDate: dto.reviewDate,
          ...merged,
          ...scores,
        },
      });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.RISK,
          entityId: id,
          riskId: id,
          action: AuditAction.UPDATE,
          changes: diff(current, updated, AUDITED_RISK_FIELDS),
        },
        tx,
      );
    });
    return this.findOne(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const current = await this.prisma.risk.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!current) throw notFound('Risk');
    await this.prisma.$transaction(async (tx) => {
      await tx.risk.delete({ where: { id } });
      await this.audit.record(
        user,
        {
          entity: AuditEntity.RISK,
          entityId: id,
          action: AuditAction.DELETE,
          changes: { code: [current.code, null], title: [current.title, null] },
        },
        tx,
      );
    });
  }

  /** Ensures the risk exists in the user's organization. Used by nested resources. */
  async assertExists(user: AuthUser, id: string) {
    const exists = await this.prisma.risk.count({
      where: { id, organizationId: user.organizationId },
    });
    if (!exists) throw notFound('Risk');
  }

  private computeScores(values: {
    probability: number;
    impact: number;
    residualProbability?: number | null;
    residualImpact?: number | null;
  }) {
    const score = calculateScore(values.probability, values.impact);
    const rp = values.residualProbability ?? null;
    const ri = values.residualImpact ?? null;
    if ((rp === null) !== (ri === null)) {
      throw badRequest(
        'Residual probability and impact must be informed together',
      );
    }
    const residualScore =
      rp !== null && ri !== null ? calculateScore(rp, ri) : null;
    if (residualScore !== null && residualScore > score) {
      throw badRequest(
        'Residual score cannot be higher than the inherent score',
      );
    }
    return { score, residualScore };
  }

  private async assertReferences(
    user: AuthUser,
    dto: { categoryId?: string | null; ownerId?: string | null },
  ) {
    if (dto.categoryId) {
      const ok = await this.prisma.category.count({
        where: { id: dto.categoryId, organizationId: user.organizationId },
      });
      if (!ok) throw badRequest('Category not found');
    }
    if (dto.ownerId) {
      const ok = await this.prisma.user.count({
        where: { id: dto.ownerId, organizationId: user.organizationId },
      });
      if (!ok) throw badRequest('Owner not found');
    }
  }

  private buildWhere(user: AuthUser, q: RiskQueryDto): Prisma.RiskWhereInput {
    const where: Prisma.RiskWhereInput = {
      organizationId: user.organizationId,
    };
    if (q.status) where.status = q.status;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.probability) where.probability = q.probability;
    if (q.impact) where.impact = q.impact;
    if (q.level) {
      const [gte, lte] = LEVEL_RANGES[q.level];
      where.score = { gte, lte };
    }
    const search = q.search?.trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}

const NULLABLE_SORT_FIELDS = new Set(['residualScore', 'reviewDate']);

/** Sort by the chosen field (empty values last) with the code as tie-breaker. */
function riskOrderBy(
  query: RiskQueryDto,
): Prisma.RiskOrderByWithRelationInput[] {
  const primary = NULLABLE_SORT_FIELDS.has(query.sort)
    ? { [query.sort]: { sort: query.order, nulls: 'last' } }
    : { [query.sort]: query.order };
  return [primary, { code: 'asc' }];
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Neutralize spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
