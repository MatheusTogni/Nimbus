export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  DEMO_EMAIL: string;
  DEMO_PASSWORD: string;
  DEMO_RESET_HOUR: number;
  DEMO_TIMEZONE: string;
  DEMO_MAX_RISKS: number;
  DEMO_MAX_ACTIONS: number;
  DEMO_MAX_COMMENTS: number;
  DEMO_MAX_CATEGORIES: number;
}

const DEFAULTS: Partial<Record<keyof AppEnv, string>> = {
  NODE_ENV: 'development',
  PORT: '3005',
  CORS_ORIGIN: '',
  JWT_ACCESS_TTL: '900',
  REFRESH_TOKEN_TTL_DAYS: '7',
  DEMO_EMAIL: 'demo@nimbus.app',
  DEMO_PASSWORD: 'demo1234',
  DEMO_RESET_HOUR: '3',
  DEMO_TIMEZONE: 'America/Sao_Paulo',
  DEMO_MAX_RISKS: '60',
  DEMO_MAX_ACTIONS: '300',
  DEMO_MAX_COMMENTS: '300',
  DEMO_MAX_CATEGORIES: '20',
};

const REQUIRED: (keyof AppEnv)[] = ['DATABASE_URL', 'JWT_ACCESS_SECRET'];

const NUMERIC: (keyof AppEnv)[] = [
  'PORT',
  'JWT_ACCESS_TTL',
  'REFRESH_TOKEN_TTL_DAYS',
  'DEMO_RESET_HOUR',
  'DEMO_MAX_RISKS',
  'DEMO_MAX_ACTIONS',
  'DEMO_MAX_COMMENTS',
  'DEMO_MAX_CATEGORIES',
];

/** Validates and normalizes the environment. Used by ConfigModule and by standalone scripts. */
export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const env: Record<string, unknown> = {};
  const errors: string[] = [];
  const keys = [...(Object.keys(DEFAULTS) as (keyof AppEnv)[]), ...REQUIRED];

  for (const key of keys) {
    const given = raw[key];
    const value = given === undefined || given === '' ? DEFAULTS[key] : given;
    if (value === undefined) {
      errors.push(`${key} is required`);
      continue;
    }
    if (NUMERIC.includes(key)) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) {
        errors.push(`${key} must be a non-negative integer`);
      }
      env[key] = n;
    } else {
      env[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }

  if (!['development', 'production', 'test'].includes(env.NODE_ENV as string)) {
    errors.push('NODE_ENV must be development, production or test');
  }
  const secret = env.JWT_ACCESS_SECRET as string | undefined;
  if (secret && secret.length < 32) {
    errors.push('JWT_ACCESS_SECRET must have at least 32 characters');
  }
  if (errors.length) {
    throw new Error(
      `Invalid environment configuration:\n - ${errors.join('\n - ')}`,
    );
  }
  return { ...raw, ...env } as unknown as AppEnv;
}

/** Loads a .env file into process.env for standalone scripts (Nest uses ConfigModule). */
export function loadEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // No file: rely on the real environment (production / CI).
  }
}
