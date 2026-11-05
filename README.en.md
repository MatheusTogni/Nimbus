# Nimbus ☁️ Risk analysis & management

[![CI](https://github.com/MatheusTogni/Nimbus/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusTogni/Nimbus/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs)
![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

🇧🇷 [Leia em português](README.md)

**Nimbus** is a web app to identify, assess and treat organizational risks.
Each risk is rated by **probability × impact (1-5 each)**, gets corrective actions with owners and due dates, an optional residual assessment, comments and a full audit trail.
A live dashboard shows where the exposure is.

> Example: *"The building loses power"*. Probability 4 × impact 5 = **20, Critical**.
> Corrective actions: *install a generator*, *buy a UPS*. Residual: 2 × 3 = **6, Medium** (−70%).

## 🔎 Live demo

**➡️ https://nimbus.matheustogni.com.br**: click **"Try the demo"**, no sign-up needed.

| Email | Password |
| --- | --- |
| `demo@nimbus.app` | `demo1234` |

The demo account can create, edit and delete risks freely, with daily limits.
**Everything is restored to the original data every day at 03:00 (Brasília time).**
User management is read-only in demo mode.

## 📸 Screenshots

| Dashboard | Risk detail |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Risk detail](docs/screenshots/risk-detail.png) |
| **Risk list** | **Dark mode** |
| ![Risk list](docs/screenshots/risk-list.png) | ![Dark mode](docs/screenshots/dark-mode.png) |

## ✨ Features

- **Risk register**: code (`RSK-001`), category, owner, status workflow (Identified → Analyzing → Mitigating → Monitoring → Closed) and review date.
- **Assessment**:
  - interactive 5×5 matrix to pick probability and impact;
  - live score and level (Low/Medium/High/Critical);
  - **residual risk** with the reduction percentage.
- **Corrective action plans**: assignees, due dates, overdue highlighting and progress.
- **Comments** and a **change history**: who changed what, field by field, recorded in the same transaction as the change.
- **Dashboard**:
  - KPIs;
  - inherent/residual **heat maps**, where clicking a cell opens the filtered list;
  - risks by level and by category;
  - 12-month trend of registered vs. closed risks;
  - treatment pipeline;
  - top risks, overdue actions and upcoming reviews.
- **Search, filters, sorting and pagination** synced with the URL, plus **CSV export** with formula-injection protection.
- **Organizations and roles**: Admin, Manager, Viewer. Data is isolated per organization.
- **PT-BR / EN** interface, **dark mode** and a responsive layout.
- **Swagger** docs at `/api/docs`.

## 🧱 Tech stack

| Layer | Technology |
| --- | --- |
| API | NestJS 11, Prisma 6, PostgreSQL 16, class-validator, argon2, JWT, helmet, throttler, Swagger |
| Web | Vue 3.5 (`<script setup>` + TypeScript), Pinia, Vue Router, vue-i18n, Tailwind CSS 4, Chart.js. **No UI component library**: every component is hand-built. |
| Quality | Jest (unit + e2e with a real Postgres), Vitest + Vue Test Utils, ESLint, Prettier, GitHub Actions |
| Ops | Ubuntu VPS, Nginx, PM2, Let's Encrypt, cron |

Design decisions (auth with rotating refresh tokens, multi-tenancy, audit trail, demo reset...) are documented in **[docs/ARCHITECTURE.en.md](docs/ARCHITECTURE.en.md)**.

## 🚀 Running locally

**Requirements:** Node.js 22+ and PostgreSQL 16+.

```bash
# 1. Database: a user plus the app and e2e-test databases (run in psql as the postgres superuser)
#    CREATE USER nimbus WITH PASSWORD 'nimbus';
#    CREATE DATABASE nimbus OWNER nimbus;
#    CREATE DATABASE nimbus_test OWNER nimbus;

# 2. API → http://localhost:3005/api  (docs: /api/docs)
cd back
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev

# 3. Web → http://localhost:5173
cd ../front
npm install
npm run dev
```

Open http://localhost:5173 and click **"Try the demo"**.

### Useful scripts

| Where | Command | What it does |
| --- | --- | --- |
| `back` | `npm test` | Unit tests |
| `back` | `npm run test:e2e` | End-to-end tests against the `nimbus_test` database |
| `back` | `npm run demo:reset:dev` | Restore the demo data now |
| `back` | `npm run db:studio` | Browse the database (Prisma Studio) |
| `front` | `npm test` | Component and unit tests (Vitest) |
| `front` | `npm run build` | Type-check + production build |

### Environment variables (API)

See [`back/.env.example`](back/.env.example). The main ones:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens, at least 32 characters |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Demo credentials shown on the login page |
| `DEMO_MAX_RISKS`, `DEMO_MAX_ACTIONS`, ... | Daily caps for the demo organization |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Optional real admin created by the seed |

## ☁️ Deployment

Step-by-step guide for an Ubuntu VPS: Nginx, PM2, PostgreSQL, HTTPS and the daily demo reset cron. See **[docs/DEPLOY.en.md](docs/DEPLOY.en.md)**.

## 📁 Project structure

```
nimbus/
├─ back/                 NestJS API
│  ├─ prisma/            schema + migrations
│  ├─ src/
│  │  ├─ auth/ users/ categories/ risks/ actions/ comments/ audit/ dashboard/
│  │  ├─ demo/           limits, reset and seed dataset
│  │  ├─ common/         guards, decorators, error filter
│  │  └─ scripts/        seed.ts, reset-demo.ts (cron)
│  └─ test/              e2e tests
├─ front/                Vue 3 SPA
│  └─ src/
│     ├─ api/            fetch client (token refresh) + endpoints
│     ├─ components/     ui/ (base components), risk/ (matrix, score picker...), charts/
│     ├─ views/ layouts/ stores/ router/ i18n/
│     └─ __tests__/
├─ deploy/               nginx, PM2, crontab, deploy script
└─ docs/                 architecture, deployment, screenshots
```

## 📄 License

[MIT](LICENSE)
