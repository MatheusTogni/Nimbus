import { AuditAction, RiskStatus } from '@prisma/client';
import { calculateScore } from '../../risks/risk-level';
import { buildDemoDataset } from './build-demo';
import { DEMO_RISKS } from './demo-data';

describe('buildDemoDataset', () => {
  const now = new Date('2026-11-05T15:00:00Z');
  const data = buildDemoDataset({
    now,
    demoEmail: 'Demo@Nimbus.app',
    demoPasswordHash: 'hash-demo',
    placeholderHash: 'hash-placeholder',
  });
  const dates = (rows: Record<string, unknown>[], key: string) =>
    rows.map((r) => r[key]).filter((d): d is Date => d instanceof Date);

  it('creates one demo organization with all the risks', () => {
    expect(data.organization.isDemo).toBe(true);
    expect(data.risks).toHaveLength(DEMO_RISKS.length);
    expect(data.organization.riskSequence).toBe(DEMO_RISKS.length);
    expect(new Set(data.risks.map((r) => r.code)).size).toBe(DEMO_RISKS.length);
  });

  it('gives the demo user the real password hash and lowercased email', () => {
    const demo = data.users.find((u) => u.passwordHash === 'hash-demo');
    expect(demo?.email).toBe('demo@nimbus.app');
    expect(demo?.role).toBe('ADMIN');
    expect(
      data.users.filter((u) => u.passwordHash === 'hash-demo'),
    ).toHaveLength(1);
  });

  it('keeps every past event in the past', () => {
    const past = [
      ...dates(data.risks, 'createdAt'),
      ...dates(data.risks, 'updatedAt'),
      ...dates(data.actions, 'createdAt'),
      ...dates(data.actions, 'completedAt'),
      ...dates(data.comments, 'createdAt'),
      ...dates(data.auditLogs, 'createdAt'),
    ];
    for (const date of past)
      expect(date.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it('stores consistent scores (residual never above inherent)', () => {
    for (const risk of data.risks) {
      expect(risk.score).toBe(calculateScore(risk.probability, risk.impact));
      if (risk.residualScore != null) {
        expect(risk.residualScore).toBeLessThanOrEqual(risk.score);
      }
    }
  });

  it('logs a creation for every risk and a closing transition for closed risks', () => {
    const creates = data.auditLogs.filter(
      (l) => l.entity === 'RISK' && l.action === AuditAction.CREATE,
    );
    expect(creates).toHaveLength(data.risks.length);

    const closedIds = data.risks
      .filter((r) => r.status === RiskStatus.CLOSED)
      .map((r) => r.id);
    expect(closedIds.length).toBeGreaterThan(0);
    for (const id of closedIds) {
      const closing = data.auditLogs.find(
        (l) =>
          l.riskId === id &&
          JSON.stringify((l.changes as Record<string, unknown>).status) ===
            JSON.stringify([RiskStatus.MONITORING, RiskStatus.CLOSED]),
      );
      expect(closing).toBeDefined();
    }
  });

  it('only references users and categories of the dataset', () => {
    const userIds = new Set(data.users.map((u) => u.id));
    const categoryIds = new Set(data.categories.map((c) => c.id));
    for (const r of data.risks) {
      expect(userIds.has(r.ownerId!)).toBe(true);
      expect(categoryIds.has(r.categoryId!)).toBe(true);
    }
    for (const a of data.actions)
      if (a.assigneeId) expect(userIds.has(a.assigneeId)).toBe(true);
    for (const c of data.comments) expect(userIds.has(c.authorId)).toBe(true);
  });
});
