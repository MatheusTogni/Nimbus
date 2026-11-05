import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { resetDemo } from '../src/demo/seed/reset-demo';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const DEMO = { email: 'demo@nimbus.app', password: 'demo1234' };
const ACME_ADMIN = { email: 'admin@acme.test', password: 'Acme12345' };
const ACME_VIEWER = { email: 'viewer@acme.test', password: 'Viewer123' };

describe('Nimbus API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;

  const login = async (creds: { email: string; password: string }) => {
    const res = await http().post('/api/auth/login').send(creds).expect(200);
    return res.body.accessToken as string;
  };
  const demoToken = async () =>
    (await http().post('/api/auth/demo').expect(200)).body
      .accessToken as string;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = () => request(app.getHttpServer());
    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe('TRUNCATE TABLE organizations CASCADE');
    await resetDemo(prisma, {
      demoEmail: DEMO.email,
      demoPassword: DEMO.password,
    });
    await prisma.organization.create({
      data: {
        name: 'Acme',
        slug: 'acme',
        users: {
          create: [
            {
              name: 'Acme Admin',
              email: ACME_ADMIN.email,
              role: Role.ADMIN,
              passwordHash: await argon2.hash(ACME_ADMIN.password),
            },
            {
              name: 'Acme Viewer',
              email: ACME_VIEWER.email,
              role: Role.VIEWER,
              passwordHash: await argon2.hash(ACME_VIEWER.password),
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public endpoints', () => {
    it('GET /api/health', () => http().get('/api/health').expect(200));

    it('GET /api/demo/info exposes the demo credentials', async () => {
      const res = await http().get('/api/demo/info').expect(200);
      expect(res.body).toMatchObject({
        enabled: true,
        email: DEMO.email,
        resetHour: 3,
      });
    });

    it('rejects protected routes without a token', async () => {
      const res = await http().get('/api/risks').expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('authentication', () => {
    it('rejects a wrong password', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ ...ACME_ADMIN, password: 'wrong-password' })
        .expect(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('logs in, rotates the refresh token and rejects its reuse', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send(ACME_ADMIN)
        .expect(200);
      expect(res.body.user).toMatchObject({
        email: ACME_ADMIN.email,
        role: 'ADMIN',
      });
      const cookie = ([] as string[]).concat(
        res.headers['set-cookie'] ?? [],
      )[0];
      expect(cookie).toMatch(/^nimbus_rt=.+HttpOnly/);
      const pair = cookie.split(';')[0];

      const refreshed = await http()
        .post('/api/auth/refresh')
        .set('Cookie', pair)
        .expect(200);
      expect(refreshed.body.accessToken).toEqual(expect.any(String));

      const reused = await http()
        .post('/api/auth/refresh')
        .set('Cookie', pair)
        .expect(401);
      expect(reused.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('GET /api/auth/me returns the profile', async () => {
      const token = await login(ACME_VIEWER);
      const res = await http().get('/api/auth/me').set(auth(token)).expect(200);
      expect(res.body).toMatchObject({
        email: ACME_VIEWER.email,
        role: 'VIEWER',
      });
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('demo account', () => {
    it('signs in without typing a password', async () => {
      const res = await http().post('/api/auth/demo').expect(200);
      expect(res.body.user).toMatchObject({
        email: DEMO.email,
        role: 'ADMIN',
        isDemo: true,
      });
    });

    it('can see the user list but cannot create users or change passwords', async () => {
      const token = await demoToken();
      await http().get('/api/users').set(auth(token)).expect(200);

      const create = await http()
        .post('/api/users')
        .set(auth(token))
        .send({
          name: 'Intruder',
          email: 'x@x.com',
          role: 'ADMIN',
          password: 'abc12345',
        })
        .expect(403);
      expect(create.body.code).toBe('DEMO_RESTRICTED');

      const password = await http()
        .post('/api/users/me/password')
        .set(auth(token))
        .send({ currentPassword: DEMO.password, newPassword: 'abc12345' })
        .expect(403);
      expect(password.body.code).toBe('DEMO_RESTRICTED');
    });

    it('enforces the record limit (DEMO_MAX_RISKS=36 with 35 seeded)', async () => {
      const token = await demoToken();
      const body = { title: 'Limite do demo', probability: 2, impact: 2 };
      await http().post('/api/risks').set(auth(token)).send(body).expect(201);
      const blocked = await http()
        .post('/api/risks')
        .set(auth(token))
        .send(body)
        .expect(403);
      expect(blocked.body.code).toBe('DEMO_LIMIT_REACHED');
    });

    it('nightly reset restores the seed and leaves other organizations untouched', async () => {
      const acmeToken = await login(ACME_ADMIN);
      await http()
        .post('/api/risks')
        .set(auth(acmeToken))
        .send({ title: 'Risco da Acme', probability: 3, impact: 3 })
        .expect(201);

      await resetDemo(prisma, {
        demoEmail: DEMO.email,
        demoPassword: DEMO.password,
      });

      const demoAuth = auth(await demoToken());
      const demo = await http().get('/api/risks').set(demoAuth).expect(200);
      expect(demo.body.meta.total).toBe(35);
      const acme = await http()
        .get('/api/risks')
        .set(auth(acmeToken))
        .expect(200);
      expect(acme.body.data.map((r: { title: string }) => r.title)).toContain(
        'Risco da Acme',
      );
    });
  });

  describe('organization isolation and roles', () => {
    it('never shows another organization data', async () => {
      const demoAuth = auth(await demoToken());
      const demo = await http().get('/api/risks?pageSize=1').set(demoAuth);
      const demoRiskId = demo.body.data[0].id as string;

      const acmeToken = await login(ACME_ADMIN);
      await http()
        .get(`/api/risks/${demoRiskId}`)
        .set(auth(acmeToken))
        .expect(404);
      await http()
        .get(`/api/risks/${demoRiskId}/comments`)
        .set(auth(acmeToken))
        .expect(404);
      await http()
        .patch(`/api/risks/${demoRiskId}`)
        .set(auth(acmeToken))
        .send({ title: 'hijack' })
        .expect(404);
      const list = await http()
        .get('/api/risks')
        .set(auth(acmeToken))
        .expect(200);
      expect(
        list.body.data.every((r: { id: string }) => r.id !== demoRiskId),
      ).toBe(true);
    });

    it('viewers cannot change risks but can comment', async () => {
      const viewer = await login(ACME_VIEWER);
      const denied = await http()
        .post('/api/risks')
        .set(auth(viewer))
        .send({ title: 'Viewer risk', probability: 1, impact: 1 })
        .expect(403);
      expect(denied.body.code).toBe('FORBIDDEN');

      const risks = await http()
        .get('/api/risks')
        .set(auth(viewer))
        .expect(200);
      await http()
        .post(`/api/risks/${risks.body.data[0].id}/comments`)
        .set(auth(viewer))
        .send({ body: 'Viewer comment' })
        .expect(201);
    });
  });

  describe('risk lifecycle', () => {
    it('creates, scores, updates with audit trail and deletes a risk', async () => {
      const token = await login(ACME_ADMIN);
      const created = await http()
        .post('/api/risks')
        .set(auth(token))
        .send({ title: 'Prédio ficar sem luz', probability: 4, impact: 5 })
        .expect(201);
      expect(created.body).toMatchObject({
        code: expect.stringMatching(/^RSK-\d{3}$/),
        score: 20,
        level: 'CRITICAL',
      });
      const id = created.body.id as string;

      const updated = await http()
        .patch(`/api/risks/${id}`)
        .set(auth(token))
        .send({
          status: 'MITIGATING',
          residualProbability: 1,
          residualImpact: 3,
        })
        .expect(200);
      expect(updated.body).toMatchObject({
        residualScore: 3,
        residualLevel: 'LOW',
      });

      await http()
        .patch(`/api/risks/${id}`)
        .set(auth(token))
        .send({ residualProbability: 5, residualImpact: 5 })
        .expect(400);

      await http()
        .post(`/api/risks/${id}/actions`)
        .set(auth(token))
        .send({ description: 'Instalar gerador' })
        .expect(201);

      const history = await http()
        .get(`/api/risks/${id}/history`)
        .set(auth(token))
        .expect(200);
      const statusChange = history.body.find(
        (h: { entity: string; action: string }) =>
          h.entity === 'RISK' && h.action === 'UPDATE',
      );
      expect(statusChange.changes.status).toEqual(['IDENTIFIED', 'MITIGATING']);
      expect(
        history.body.some((h: { entity: string }) => h.entity === 'ACTION'),
      ).toBe(true);

      await http().delete(`/api/risks/${id}`).set(auth(token)).expect(204);
      await http().get(`/api/risks/${id}`).set(auth(token)).expect(404);
    });

    it('filters by level and exports CSV', async () => {
      const token = await demoToken();
      const critical = await http()
        .get('/api/risks?level=CRITICAL')
        .set(auth(token))
        .expect(200);
      expect(critical.body.data.length).toBeGreaterThan(0);
      expect(
        critical.body.data.every((r: { score: number }) => r.score >= 20),
      ).toBe(true);

      const csv = await http()
        .get('/api/risks/export')
        .set(auth(token))
        .expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.text.split('\r\n')).toHaveLength(36);
    });

    it('returns the dashboard summary', async () => {
      const demoAuth = auth(await demoToken());
      const res = await http().get('/api/dashboard').set(demoAuth).expect(200);
      expect(res.body.totals.risks).toBe(35);
      expect(res.body.matrix.inherent).toHaveLength(5);
      expect(res.body.trend.months).toHaveLength(12);
    });
  });
});
