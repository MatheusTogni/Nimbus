import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { AccessTokenPayload } from '../common/auth-user';
import { AppException, ErrorCode } from '../common/errors';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface SessionTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/** Public shape of the logged-in user. */
export const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isDemo: true,
  locale: true,
  theme: true,
  organization: { select: { id: true, name: true, isDemo: true } },
} as const;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  /** Hash of a random secret, used to equalize timing when the email does not exist. */
  private readonly dummyHash = argon2.hash(randomBytes(16).toString('hex'));

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });
    // Always run a hash verification so response time does not reveal whether the email exists.
    const valid = await argon2
      .verify(user?.passwordHash ?? (await this.dummyHash), password)
      .catch(() => false);
    if (!user || !valid || !user.active) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }
    return this.startSession(user, user.organization.isDemo);
  }

  /** Logs in as the shared demo user (the button on the login page). */
  async loginDemo() {
    const email = this.config.get('DEMO_EMAIL', { infer: true });
    const user = await this.prisma.user.findFirst({
      where: { email, active: true, organization: { isDemo: true } },
    });
    if (!user) {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.NOT_FOUND,
        'Demo account is not available right now',
      );
    }
    return this.startSession(user, true);
  }

  /** Rotates the refresh token. Reusing a revoked token revokes every session of that user. */
  async refresh(token: string | undefined) {
    if (!token) throw invalidRefresh();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { organization: true } } },
    });
    if (!stored) throw invalidRefresh();

    if (stored.revokedAt) {
      // A rotated token was presented again: possible theft, so end every session of the user.
      // Skipped for the demo user, whose sessions are shared by many visitors.
      if (!stored.user.organization.isDemo) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw invalidRefresh();
    }
    if (stored.expiresAt < new Date() || !stored.user.active) {
      throw invalidRefresh();
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.startSession(
      stored.user,
      stored.user.organization.isDemo,
      false,
    );
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
  }

  private async startSession(user: User, isDemo: boolean, isLogin = true) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      org: user.organizationId,
      role: user.role,
      demo: isDemo,
    };
    const expiresIn = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });

    const refreshToken = randomBytes(48).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const refreshExpiresAt = new Date(Date.now() + days * 86_400_000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
    if (isLogin) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      // Housekeeping: drop this user's expired tokens and ones revoked over a day ago.
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { lt: new Date(Date.now() - 86_400_000) } },
          ],
        },
      });
    }

    const tokens: SessionTokens = {
      accessToken,
      expiresIn,
      refreshToken,
      refreshExpiresAt,
    };
    return { tokens, user: await this.profile(user.id) };
  }
}

function invalidRefresh() {
  return new AppException(
    HttpStatus.UNAUTHORIZED,
    ErrorCode.INVALID_REFRESH_TOKEN,
    'Session expired, please sign in again',
  );
}
