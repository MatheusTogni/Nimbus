/**
 * Initial seed:
 * - creates the demo organization if it does not exist (or always, with --reset-demo);
 * - creates a real admin + organization from ADMIN_* variables, only if that email is free.
 */
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { loadEnvFile, validateEnv } from '../config/env';
import { DEMO_CATEGORIES } from '../demo/seed/demo-data';
import { resetDemo } from '../demo/seed/reset-demo';

async function main() {
  loadEnvFile();
  const env = validateEnv(process.env);
  const prisma = new PrismaClient();
  try {
    const hasDemo = await prisma.organization.count({
      where: { isDemo: true },
    });
    if (!hasDemo || process.argv.includes('--reset-demo')) {
      const result = await resetDemo(prisma, {
        demoEmail: env.DEMO_EMAIL,
        demoPassword: env.DEMO_PASSWORD,
      });
      console.log('Demo organization seeded:', result);
    } else {
      console.log(
        'Demo organization already exists (use --reset-demo to restore it).',
      );
    }

    await seedAdmin(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedAdmin(prisma: PrismaClient) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`Admin ${email} already exists, skipping.`);
    return;
  }
  const orgName = process.env.ADMIN_ORG_NAME?.trim() || 'Nimbus';
  const slug = `${orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${randomBytes(3).toString('hex')}`;

  await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      users: {
        create: {
          name: process.env.ADMIN_NAME?.trim() || 'Administrator',
          email,
          role: Role.ADMIN,
          passwordHash: await argon2.hash(password),
        },
      },
      categories: {
        create: DEMO_CATEGORIES.map(({ name, color }) => ({ name, color })),
      },
    },
  });
  console.log(`Admin ${email} created in organization "${orgName}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
