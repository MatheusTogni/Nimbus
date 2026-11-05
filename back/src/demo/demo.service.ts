import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { DemoLimitsService } from './demo-limits.service';
import { resetDemo } from './seed/reset-demo';

/**
 * Next occurrence of `hour:00` in `timeZone`, as a UTC Date.
 * Works for any IANA zone without a date library by reading the zone's wall clock.
 */
export function nextResetAt(
  hour: number,
  timeZone: string,
  now = new Date(),
): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsedToday = get('hour') * 3600 + get('minute') * 60 + get('second');
  let wait = hour * 3600 - elapsedToday;
  if (wait <= 0) wait += 24 * 3600;
  const next = new Date(now.getTime() + wait * 1000);
  next.setUTCMilliseconds(0);
  return next;
}

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
    private readonly limits: DemoLimitsService,
  ) {}

  async info() {
    const enabled =
      (await this.prisma.organization.count({ where: { isDemo: true } })) > 0;
    const hour = this.config.get('DEMO_RESET_HOUR', { infer: true });
    const timeZone = this.config.get('DEMO_TIMEZONE', { infer: true });
    return {
      enabled,
      email: this.config.get('DEMO_EMAIL', { infer: true }),
      password: this.config.get('DEMO_PASSWORD', { infer: true }),
      resetHour: hour,
      timeZone,
      nextResetAt: nextResetAt(hour, timeZone),
      limits: this.limits.limits(),
    };
  }

  async reset() {
    const result = await resetDemo(this.prisma, {
      demoEmail: this.config.get('DEMO_EMAIL', { infer: true }),
      demoPassword: this.config.get('DEMO_PASSWORD', { infer: true }),
    });
    this.logger.log(`Demo data restored: ${JSON.stringify(result)}`);
    return result;
  }
}
