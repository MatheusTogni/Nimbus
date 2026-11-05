import { AuditAction, AuditEntity, Prisma, RiskStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { calculateScore, riskCode } from '../../risks/risk-level';
import {
  CategoryKey,
  DEMO_CATEGORIES,
  DEMO_ORGANIZATION,
  DEMO_PEOPLE,
  DEMO_RISKS,
  DemoRisk,
  PersonKey,
} from './demo-data';

export interface BuildDemoOptions {
  now: Date;
  demoEmail: string;
  /** argon2 hash of DEMO_PASSWORD. */
  demoPasswordHash: string;
  /** argon2 hash of a random secret for the fictional people (they never sign in). */
  placeholderHash: string;
}

export interface DemoDataset {
  organization: Prisma.OrganizationCreateManyInput;
  users: Prisma.UserCreateManyInput[];
  categories: Prisma.CategoryCreateManyInput[];
  risks: Prisma.RiskCreateManyInput[];
  actions: Prisma.RiskActionCreateManyInput[];
  comments: Prisma.CommentCreateManyInput[];
  auditLogs: Prisma.AuditLogCreateManyInput[];
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const STATUS_FLOW: RiskStatus[] = [
  RiskStatus.IDENTIFIED,
  RiskStatus.ANALYZING,
  RiskStatus.MITIGATING,
  RiskStatus.MONITORING,
  RiskStatus.CLOSED,
];

/**
 * Turns the static demo dataset into database rows, with dates relative to `now`
 * and a coherent audit trail (creation, status changes, actions and comments).
 * Pure function: no I/O, so it is unit-tested.
 */
export function buildDemoDataset(opts: BuildDemoOptions): DemoDataset {
  const { now } = opts;
  const at = (daysAgo: number, hour = 10) =>
    new Date(startOfDay(now).getTime() - daysAgo * DAY + hour * HOUR);
  const clamp = (date: Date, min: Date) =>
    new Date(
      Math.min(now.getTime() - 60_000, Math.max(date.getTime(), min.getTime())),
    );

  const organizationId = randomUUID();
  const organization: Prisma.OrganizationCreateManyInput = {
    id: organizationId,
    name: DEMO_ORGANIZATION.name,
    slug: DEMO_ORGANIZATION.slug,
    isDemo: true,
    riskSequence: DEMO_RISKS.length,
    createdAt: at(365),
  };

  const userIds = {} as Record<PersonKey, string>;
  const users = DEMO_PEOPLE.map((person) => {
    const id = randomUUID();
    userIds[person.key] = id;
    const isDemoUser = person.key === 'demo';
    return {
      id,
      organizationId,
      name: person.name,
      email: isDemoUser ? opts.demoEmail.toLowerCase() : person.email,
      passwordHash: isDemoUser ? opts.demoPasswordHash : opts.placeholderHash,
      role: person.role,
      isDemo: true,
      active: true,
      createdAt: at(365),
    } satisfies Prisma.UserCreateManyInput;
  });

  const categoryIds = {} as Record<CategoryKey, string>;
  const categories = DEMO_CATEGORIES.map((c) => {
    const id = randomUUID();
    categoryIds[c.key] = id;
    return {
      id,
      organizationId,
      name: c.name,
      color: c.color,
      createdAt: at(365),
    };
  });

  const risks: Prisma.RiskCreateManyInput[] = [];
  const actions: Prisma.RiskActionCreateManyInput[] = [];
  const comments: Prisma.CommentCreateManyInput[] = [];
  const auditLogs: Prisma.AuditLogCreateManyInput[] = [];

  const log = (
    entry: Omit<Prisma.AuditLogCreateManyInput, 'id' | 'organizationId'>,
  ) => auditLogs.push({ id: randomUUID(), organizationId, ...entry });

  DEMO_RISKS.forEach((demo, index) => {
    const riskId = randomUUID();
    const ownerId = userIds[demo.owner];
    const createdAt = at(demo.created, 9 + (index % 8));
    const endAt =
      demo.closed !== undefined
        ? at(demo.closed, 16)
        : clamp(at(1, 15), createdAt);
    const score = calculateScore(demo.p, demo.i);
    const residualScore =
      demo.rp && demo.ri ? calculateScore(demo.rp, demo.ri) : null;
    let updatedAt = createdAt;

    // Creation
    log({
      riskId,
      userId: ownerId,
      entity: AuditEntity.RISK,
      entityId: riskId,
      action: AuditAction.CREATE,
      changes: {
        title: [null, demo.title],
        probability: [null, demo.p],
        impact: [null, demo.i],
        score: [null, score],
        status: [null, RiskStatus.IDENTIFIED],
      },
      createdAt,
    });

    // Status transitions, spread between creation and the end date.
    const path = STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(demo.status) + 1);
    const steps = path.length - 1;
    let residualLogged = false;
    for (let s = 1; s <= steps; s++) {
      const when =
        s === steps && demo.closed !== undefined
          ? endAt
          : new Date(
              createdAt.getTime() +
                ((endAt.getTime() - createdAt.getTime()) * s) / (steps + 1),
            );
      const changes: Prisma.InputJsonObject = {
        status: [path[s - 1], path[s]],
      };
      if (path[s] === RiskStatus.MITIGATING && residualScore !== null) {
        Object.assign(changes, residualChanges(demo, residualScore));
        residualLogged = true;
      }
      log({
        riskId,
        userId: ownerId,
        entity: AuditEntity.RISK,
        entityId: riskId,
        action: AuditAction.UPDATE,
        changes,
        createdAt: when,
      });
      updatedAt = when;
    }
    if (residualScore !== null && !residualLogged) {
      const when = new Date((createdAt.getTime() + endAt.getTime()) / 2);
      log({
        riskId,
        userId: ownerId,
        entity: AuditEntity.RISK,
        entityId: riskId,
        action: AuditAction.UPDATE,
        changes: residualChanges(demo, residualScore),
        createdAt: when,
      });
      if (when > updatedAt) updatedAt = when;
    }

    // Actions
    (demo.actions ?? []).forEach((a, ai) => {
      const id = randomUUID();
      const actionCreated = clamp(at(demo.created - 1 - ai, 11), createdAt);
      const completedAt =
        a.done !== undefined ? clamp(at(a.done, 14), actionCreated) : null;
      const assigneeId = a.to ? userIds[a.to] : null;
      actions.push({
        id,
        riskId,
        description: a.text,
        assigneeId,
        dueDate: a.due !== undefined ? at(-a.due, 12) : null,
        completedAt,
        createdAt: actionCreated,
        updatedAt: completedAt ?? actionCreated,
      });
      log({
        riskId,
        userId: ownerId,
        entity: AuditEntity.ACTION,
        entityId: id,
        action: AuditAction.CREATE,
        changes: { description: [null, a.text] },
        createdAt: actionCreated,
      });
      if (completedAt) {
        log({
          riskId,
          userId: assigneeId ?? ownerId,
          entity: AuditEntity.ACTION,
          entityId: id,
          action: AuditAction.UPDATE,
          changes: { completedAt: [null, completedAt.toISOString()] },
          createdAt: completedAt,
        });
      }
    });

    // Comments
    (demo.comments ?? []).forEach((c, ci) => {
      const id = randomUUID();
      const when = clamp(at(c.ago, 13 + ci), createdAt);
      comments.push({
        id,
        riskId,
        authorId: userIds[c.by],
        body: c.text,
        createdAt: when,
      });
      log({
        riskId,
        userId: userIds[c.by],
        entity: AuditEntity.COMMENT,
        entityId: id,
        action: AuditAction.CREATE,
        changes: { body: [null, c.text] },
        createdAt: when,
      });
    });

    risks.push({
      id: riskId,
      organizationId,
      code: riskCode(index + 1),
      title: demo.title,
      description: demo.description,
      categoryId: categoryIds[demo.category],
      ownerId,
      probability: demo.p,
      impact: demo.i,
      score,
      residualProbability: demo.rp ?? null,
      residualImpact: demo.ri ?? null,
      residualScore,
      status: demo.status,
      reviewDate: demo.review !== undefined ? at(-demo.review, 12) : null,
      createdById: ownerId,
      createdAt,
      updatedAt,
    });
  });

  return {
    organization,
    users,
    categories,
    risks,
    actions,
    comments,
    auditLogs,
  };
}

function residualChanges(
  demo: DemoRisk,
  residualScore: number,
): Prisma.InputJsonObject {
  return {
    residualProbability: [null, demo.rp ?? null],
    residualImpact: [null, demo.ri ?? null],
    residualScore: [null, residualScore],
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
