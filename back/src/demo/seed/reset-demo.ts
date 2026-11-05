import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { buildDemoDataset } from './build-demo';

export interface ResetDemoOptions {
  demoEmail: string;
  demoPassword: string;
  now?: Date;
}

export interface ResetDemoResult {
  organizationId: string;
  risks: number;
  actions: number;
  comments: number;
  auditLogs: number;
  durationMs: number;
}

/**
 * Deletes the demo organization (cascading to all its data) and recreates it from the seed,
 * in a single transaction. Organizations that are not flagged `isDemo` are never touched.
 */
export async function resetDemo(
  prisma: PrismaClient,
  opts: ResetDemoOptions,
): Promise<ResetDemoResult> {
  const started = Date.now();
  // Hash outside the transaction: argon2 is intentionally slow.
  const [demoPasswordHash, placeholderHash] = await Promise.all([
    argon2.hash(opts.demoPassword),
    argon2.hash(randomBytes(32).toString('hex')),
  ]);
  const data = buildDemoDataset({
    now: opts.now ?? new Date(),
    demoEmail: opts.demoEmail,
    demoPasswordHash,
    placeholderHash,
  });
  const emails = data.users.map((u) => u.email);

  await prisma.$transaction(
    async (tx) => {
      await tx.organization.deleteMany({ where: { isDemo: true } });
      const clash = await tx.user.findFirst({
        where: { email: { in: emails } },
      });
      if (clash) {
        throw new Error(
          `Cannot seed the demo: email ${clash.email} already belongs to a non-demo organization`,
        );
      }
      await tx.organization.create({ data: data.organization });
      await tx.user.createMany({ data: data.users });
      await tx.category.createMany({ data: data.categories });
      await tx.risk.createMany({ data: data.risks });
      await tx.riskAction.createMany({ data: data.actions });
      await tx.comment.createMany({ data: data.comments });
      await tx.auditLog.createMany({ data: data.auditLogs });
    },
    { timeout: 60_000 },
  );

  return {
    organizationId: data.organization.id!,
    risks: data.risks.length,
    actions: data.actions.length,
    comments: data.comments.length,
    auditLogs: data.auditLogs.length,
    durationMs: Date.now() - started,
  };
}
