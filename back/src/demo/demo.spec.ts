import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../common/auth-user';
import { AppException } from '../common/errors';
import type { PrismaService } from '../prisma/prisma.service';
import { DemoLimitsService } from './demo-limits.service';
import { nextResetAt } from './demo.service';

describe('nextResetAt', () => {
  const zone = 'America/Sao_Paulo'; // UTC-3, no DST

  it('returns today at 03:00 local when it is still before that', () => {
    // 01:30 in São Paulo
    expect(
      nextResetAt(3, zone, new Date('2026-11-05T04:30:00Z')).toISOString(),
    ).toBe('2026-11-05T06:00:00.000Z');
  });

  it('returns tomorrow at 03:00 local when it already passed', () => {
    // 10:15:20 in São Paulo
    expect(
      nextResetAt(3, zone, new Date('2026-11-05T13:15:20Z')).toISOString(),
    ).toBe('2026-11-06T06:00:00.000Z');
  });

  it('returns tomorrow when it is exactly the reset time', () => {
    expect(
      nextResetAt(3, zone, new Date('2026-11-05T06:00:00Z')).toISOString(),
    ).toBe('2026-11-06T06:00:00.000Z');
  });
});

describe('DemoLimitsService', () => {
  const config = {
    get: (key: string) =>
      ({
        DEMO_MAX_RISKS: 2,
        DEMO_MAX_ACTIONS: 5,
        DEMO_MAX_COMMENTS: 5,
        DEMO_MAX_CATEGORIES: 5,
      })[key],
  } as unknown as ConfigService;
  const prisma = {
    risk: { count: jest.fn() },
    riskAction: { count: jest.fn() },
    comment: { count: jest.fn() },
    category: { count: jest.fn() },
  };
  const service = new DemoLimitsService(
    prisma as unknown as PrismaService,
    config as never,
  );
  const demoUser: AuthUser = {
    id: 'u',
    organizationId: 'o',
    role: 'ADMIN',
    isDemo: true,
  };

  beforeEach(() => jest.clearAllMocks());

  it('never checks regular users', async () => {
    await service.assertCanCreate({ ...demoUser, isDemo: false }, 'risk');
    expect(prisma.risk.count).not.toHaveBeenCalled();
  });

  it('allows demo users below the limit', async () => {
    prisma.risk.count.mockResolvedValue(1);
    await expect(
      service.assertCanCreate(demoUser, 'risk'),
    ).resolves.toBeUndefined();
  });

  it('blocks demo users at the limit with DEMO_LIMIT_REACHED', async () => {
    prisma.risk.count.mockResolvedValue(2);
    const error = await service
      .assertCanCreate(demoUser, 'risk')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe('DEMO_LIMIT_REACHED');
    expect((error as AppException).getStatus()).toBe(403);
  });

  it('counts nested resources inside the organization', async () => {
    prisma.comment.count.mockResolvedValue(0);
    await service.assertCanCreate(demoUser, 'comment');
    expect(prisma.comment.count).toHaveBeenCalledWith({
      where: { risk: { organizationId: 'o' } },
    });
  });
});
