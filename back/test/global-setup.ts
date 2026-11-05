import { execSync } from 'node:child_process';

/** Applies the migrations to the test database once before the e2e suite. */
export default function globalSetup() {
  process.loadEnvFile('.env.test');
  const url = process.env.DATABASE_URL ?? '';
  if (!/_test\b/.test(url)) {
    throw new Error(
      `Refusing to run e2e tests against a non-test database: ${url}`,
    );
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
