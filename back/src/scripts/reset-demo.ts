/**
 * Restores the demo organization to its original seed.
 * Scheduled by the system crontab every day at 03:00 (America/Sao_Paulo):
 *   node dist/scripts/reset-demo.js
 */
import { PrismaClient } from '@prisma/client';
import { loadEnvFile, validateEnv } from '../config/env';
import { resetDemo } from '../demo/seed/reset-demo';

async function main() {
  loadEnvFile();
  const env = validateEnv(process.env);
  const prisma = new PrismaClient();
  try {
    const result = await resetDemo(prisma, {
      demoEmail: env.DEMO_EMAIL,
      demoPassword: env.DEMO_PASSWORD,
    });
    console.log(`[${new Date().toISOString()}] Demo reset OK`, result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] Demo reset FAILED`, error);
  process.exit(1);
});
