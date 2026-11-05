# Nimbus API

NestJS 11 + Prisma 6 + PostgreSQL. Veja o [README principal](../README.md) para a visão geral e o [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) para as decisões de projeto.

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev       # http://localhost:3005/api  ·  Swagger: /api/docs
```

| Script | Descrição |
| --- | --- |
| `npm run start:dev` | API em modo watch |
| `npm run build` / `npm run start:prod` | Build / execução de produção |
| `npm test` | Testes unitários |
| `npm run test:e2e` | Testes e2e (usa o `.env.test` → banco `nimbus_test`) |
| `npm run lint` | ESLint + Prettier (com correção automática) |
| `npm run db:migrate` | Cria/aplica uma migration (desenvolvimento) |
| `npm run db:deploy` | Aplica as migrations (produção) |
| `npm run db:seed` | Cria a organização demo (+ admin opcional via `ADMIN_*`) |
| `npm run demo:reset` | Restaura os dados do demo (script compilado, usado pelo cron) |
| `npm run demo:reset:dev` | O mesmo, a partir do código TypeScript |
