import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../common/auth-user';
import { AppException, ErrorCode } from '../common/errors';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export type DemoResource = 'risk' | 'action' | 'comment' | 'category';

/**
 * Caps how many records the shared demo organization can hold.
 * The demo data is restored every night, so these caps work as daily limits.
 */
@Injectable()
export class DemoLimitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  limits(): Record<DemoResource, number> {
    return {
      risk: this.config.get('DEMO_MAX_RISKS', { infer: true }),
      action: this.config.get('DEMO_MAX_ACTIONS', { infer: true }),
      comment: this.config.get('DEMO_MAX_COMMENTS', { infer: true }),
      category: this.config.get('DEMO_MAX_CATEGORIES', { infer: true }),
    };
  }

  async assertCanCreate(user: AuthUser, resource: DemoResource): Promise<void> {
    if (!user.isDemo) return;
    const limit = this.limits()[resource];
    const count = await this.count(user.organizationId, resource);
    if (count >= limit) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.DEMO_LIMIT_REACHED,
        `The demo account reached its limit of ${limit} ${resource} records. Data is restored daily.`,
        { resource, limit },
      );
    }
  }

  private count(
    organizationId: string,
    resource: DemoResource,
  ): Promise<number> {
    const inOrg = { risk: { organizationId } };
    switch (resource) {
      case 'risk':
        return this.prisma.risk.count({ where: { organizationId } });
      case 'action':
        return this.prisma.riskAction.count({ where: inOrg });
      case 'comment':
        return this.prisma.comment.count({ where: inOrg });
      case 'category':
        return this.prisma.category.count({ where: { organizationId } });
    }
  }
}
