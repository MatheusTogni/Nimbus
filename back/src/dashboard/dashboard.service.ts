import { Injectable } from '@nestjs/common';
import { Prisma, RiskStatus } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  levelFromScore,
  RISK_LEVELS,
  type RiskLevel,
} from '../risks/risk-level';
import { withLevels } from '../risks/risks.service';

type Matrix = number[][];
interface MonthCount {
  month: string;
  count: number;
}

/** 5x5 grid indexed as matrix[impact - 1][probability - 1]. */
const emptyMatrix = (): Matrix =>
  Array.from({ length: 5 }, () => Array<number>(5).fill(0));

/** The last 12 months as `YYYY-MM` (UTC), oldest first. */
export function lastMonths(now = new Date(), count = 12): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthUser) {
    const organizationId = user.organizationId;
    const open: Prisma.RiskWhereInput = {
      organizationId,
      status: { not: RiskStatus.CLOSED },
    };
    const now = new Date();
    const months = lastMonths(now);
    const since = new Date(`${months[0]}-01T00:00:00.000Z`);
    const in30Days = new Date(now.getTime() + 30 * 86_400_000);
    const actionInOrg = { risk: { organizationId } };

    const [
      byStatus,
      inherent,
      residual,
      byCategoryRaw,
      categories,
      averages,
      topRisks,
      upcomingReviews,
      openActions,
      completedActions,
      overdueActions,
      overdueList,
      createdPerMonth,
      closedPerMonth,
    ] = await Promise.all([
      this.prisma.risk.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.risk.groupBy({
        by: ['probability', 'impact'],
        where: open,
        _count: true,
      }),
      this.prisma.risk.groupBy({
        by: ['residualProbability', 'residualImpact'],
        where: { ...open, residualScore: { not: null } },
        _count: true,
      }),
      this.prisma.risk.groupBy({
        by: ['categoryId'],
        where: open,
        _count: true,
        _avg: { score: true },
      }),
      this.prisma.category.findMany({
        where: { organizationId },
        select: { id: true, name: true, color: true },
      }),
      this.prisma.risk.aggregate({
        where: open,
        _avg: { score: true, residualScore: true },
        _count: { _all: true, residualScore: true },
      }),
      this.prisma.risk.findMany({
        where: open,
        orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          score: true,
          residualScore: true,
          category: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      this.prisma.risk.findMany({
        where: { ...open, reviewDate: { gte: now, lte: in30Days } },
        orderBy: { reviewDate: 'asc' },
        take: 5,
        select: {
          id: true,
          code: true,
          title: true,
          reviewDate: true,
          score: true,
          residualScore: true,
        },
      }),
      this.prisma.riskAction.count({
        where: { ...actionInOrg, completedAt: null },
      }),
      this.prisma.riskAction.count({
        where: { ...actionInOrg, completedAt: { not: null } },
      }),
      this.prisma.riskAction.count({
        where: { ...actionInOrg, completedAt: null, dueDate: { lt: now } },
      }),
      this.prisma.riskAction.findMany({
        where: { ...actionInOrg, completedAt: null, dueDate: { lt: now } },
        orderBy: { dueDate: 'asc' },
        take: 6,
        select: {
          id: true,
          description: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
          risk: { select: { id: true, code: true, title: true } },
        },
      }),
      this.prisma.$queryRaw<MonthCount[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM risks
        WHERE "organizationId" = ${organizationId}::uuid AND "createdAt" >= ${since}
        GROUP BY 1`,
      this.prisma.$queryRaw<MonthCount[]>`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM audit_logs
        WHERE "organizationId" = ${organizationId}::uuid
          AND entity = 'RISK' AND action = 'UPDATE'
          AND changes -> 'status' ->> 1 = 'CLOSED'
          AND "createdAt" >= ${since}
        GROUP BY 1`,
    ]);

    const inherentMatrix = emptyMatrix();
    const byLevel = Object.fromEntries(
      RISK_LEVELS.map((l) => [l, 0]),
    ) as Record<RiskLevel, number>;
    for (const row of inherent) {
      inherentMatrix[row.impact - 1][row.probability - 1] = row._count;
      byLevel[levelFromScore(row.probability * row.impact)] += row._count;
    }

    const residualMatrix = emptyMatrix();
    const byResidualLevel = Object.fromEntries(
      RISK_LEVELS.map((l) => [l, 0]),
    ) as Record<RiskLevel, number>;
    for (const row of residual) {
      if (!row.residualProbability || !row.residualImpact) continue;
      residualMatrix[row.residualImpact - 1][row.residualProbability - 1] =
        row._count;
      byResidualLevel[
        levelFromScore(row.residualProbability * row.residualImpact)
      ] += row._count;
    }

    const statusCounts = Object.fromEntries(
      Object.values(RiskStatus).map((s) => [s, 0]),
    ) as Record<RiskStatus, number>;
    for (const row of byStatus) statusCounts[row.status] = row._count;

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const byCategory = byCategoryRaw
      .map((row) => {
        const category = row.categoryId
          ? categoryById.get(row.categoryId)
          : undefined;
        return {
          id: category?.id ?? null,
          name: category?.name ?? null,
          color: category?.color ?? '#94a3b8',
          count: row._count,
          avgScore: round(row._avg.score ?? 0),
        };
      })
      .sort((a, b) => b.count - a.count);

    const totalRisks = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const openRisks = averages._count._all;
    const toSeries = (rows: MonthCount[]) => {
      const map = new Map(rows.map((r) => [r.month, r.count]));
      return months.map((m) => map.get(m) ?? 0);
    };

    return {
      totals: {
        risks: totalRisks,
        open: openRisks,
        closed: statusCounts.CLOSED,
        critical: byLevel.CRITICAL,
        high: byLevel.HIGH,
        mitigating: statusCounts.MITIGATING,
        avgScore: round(averages._avg.score ?? 0),
        avgResidualScore: round(averages._avg.residualScore ?? 0),
        /** Share of open risks that already have a residual assessment (treatment planned). */
        treatedRate: openRisks
          ? round(averages._count.residualScore / openRisks)
          : 0,
        openActions,
        completedActions,
        overdueActions,
      },
      byLevel,
      byResidualLevel,
      byStatus: statusCounts,
      byCategory,
      matrix: { inherent: inherentMatrix, residual: residualMatrix },
      trend: {
        months,
        created: toSeries(createdPerMonth),
        closed: toSeries(closedPerMonth),
      },
      topRisks: topRisks.map(withLevels),
      upcomingReviews: upcomingReviews.map(withLevels),
      overdueActions: overdueList,
    };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
