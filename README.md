# Nimbus ☁️ Análise e gestão de riscos

[![CI](https://github.com/MatheusTogni/Nimbus/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusTogni/Nimbus/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs)
![Vue](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

🇺🇸 [Read in English](README.en.md)

O **Nimbus** é um sistema web para identificar, avaliar e tratar os riscos de uma organização.
Cada risco recebe uma nota de **probabilidade × impacto (de 1 a 5 cada)**, ações de correção com responsável e prazo, avaliação residual opcional, comentários e histórico completo de alterações.
Um dashboard em tempo real mostra onde está a exposição.

> Exemplo: *"Prédio ficar sem energia"*. Probabilidade 4 × impacto 5 = **20, Crítico**.
> Ações de correção: *instalar gerador*, *contratar nobreak*. Residual: 2 × 3 = **6, Médio** (−70%).

## 🔎 Demonstração online

**➡️ https://nimbus.matheustogni.com.br**: clique em **"Entrar como demonstração"**, sem cadastro.

| E-mail | Senha |
| --- | --- |
| `demo@nimbus.app` | `demo1234` |

A conta de demonstração pode criar, editar e excluir riscos à vontade, com limites diários.
**Todo dia às 03:00 (horário de Brasília) os dados voltam ao original.**
A gestão de usuários fica somente leitura no modo demonstração.

## 📸 Telas

| Dashboard | Detalhe do risco |
| --- | --- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Detalhe do risco](docs/screenshots/risk-detail.png) |
| **Lista de riscos** | **Tema escuro** |
| ![Lista de riscos](docs/screenshots/risk-list.png) | ![Tema escuro](docs/screenshots/dark-mode.png) |

## ✨ Funcionalidades

- **Cadastro de riscos**: código (`RSK-001`), categoria, responsável, fluxo de status (Identificado → Em análise → Em mitigação → Monitorando → Encerrado) e data de revisão.
- **Avaliação**:
  - matriz 5×5 interativa para escolher probabilidade e impacto;
  - score e nível (Baixo/Médio/Alto/Crítico) calculados na hora;
  - **risco residual** com o percentual de redução.
- **Planos de ação**: responsáveis, prazos, destaque das ações atrasadas e progresso.
- **Comentários** e **histórico de alterações**: quem mudou o quê, campo a campo, gravado na mesma transação da alteração.
- **Dashboard**:
  - KPIs;
  - **matrizes de calor** inerente e residual, em que clicar numa célula abre a lista filtrada;
  - riscos por nível e por categoria;
  - evolução de 12 meses de riscos registrados e encerrados;
  - pipeline de tratamento;
  - maiores riscos, ações atrasadas e próximas revisões.
- **Busca, filtros, ordenação e paginação** sincronizados com a URL, mais **exportação CSV** com proteção contra injeção de fórmulas.
- **Organizações e papéis**: Administrador, Gestor e Leitor. Os dados ficam isolados por organização.
- Interface em **PT-BR / EN**, **tema escuro** e layout responsivo.
- Documentação **Swagger** em `/api/docs`.

## 🧱 Tecnologias

| Camada | Tecnologia |
| --- | --- |
| API | NestJS 11, Prisma 6, PostgreSQL 16, class-validator, argon2, JWT, helmet, throttler, Swagger |
| Web | Vue 3.5 (`<script setup>` + TypeScript), Pinia, Vue Router, vue-i18n, Tailwind CSS 4, Chart.js. **Sem biblioteca de componentes**: todos os componentes foram feitos à mão. |
| Qualidade | Jest (unitários + e2e com Postgres real), Vitest + Vue Test Utils, ESLint, Prettier, GitHub Actions |
| Infra | VPS Ubuntu, Nginx, PM2, Let's Encrypt, cron |

As decisões de arquitetura (autenticação com refresh token rotativo, multi-tenant, auditoria, reset do demo...) estão em **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## 🚀 Rodando localmente

**Requisitos:** Node.js 22+ e PostgreSQL 16+.

```bash
# 1. Banco: um usuário e os bancos da aplicação e dos testes e2e (rodar no psql como superusuário postgres)
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

Abra http://localhost:5173 e clique em **"Entrar como demonstração"**.

### Scripts úteis

| Onde | Comando | O que faz |
| --- | --- | --- |
| `back` | `npm test` | Testes unitários |
| `back` | `npm run test:e2e` | Testes ponta a ponta no banco `nimbus_test` |
| `back` | `npm run demo:reset:dev` | Restaura os dados do demo agora |
| `back` | `npm run db:studio` | Navega pelo banco (Prisma Studio) |
| `front` | `npm test` | Testes de componentes e utilitários (Vitest) |
| `front` | `npm run build` | Checagem de tipos + build de produção |

### Variáveis de ambiente (API)

Veja [`back/.env.example`](back/.env.example). As principais:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_ACCESS_SECRET` | Segredo dos access tokens, com pelo menos 32 caracteres |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Credenciais do demo exibidas na tela de login |
| `DEMO_MAX_RISKS`, `DEMO_MAX_ACTIONS`, ... | Limites diários da organização demo |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrador real opcional, criado pelo seed |

## ☁️ Deploy

Guia passo a passo para VPS Ubuntu: Nginx, PM2, PostgreSQL, HTTPS e o cron do reset diário. Veja **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## 📁 Estrutura do projeto

```
nimbus/
├─ back/                 API NestJS
│  ├─ prisma/            schema + migrations
│  ├─ src/
│  │  ├─ auth/ users/ categories/ risks/ actions/ comments/ audit/ dashboard/
│  │  ├─ demo/           limites, reset e dados do seed
│  │  ├─ common/         guards, decorators, filtro de erros
│  │  └─ scripts/        seed.ts, reset-demo.ts (cron)
│  └─ test/              testes e2e
├─ front/                SPA Vue 3
│  └─ src/
│     ├─ api/            cliente fetch (refresh do token) + endpoints
│     ├─ components/     ui/ (componentes base), risk/ (matriz, seletor de score...), charts/
│     ├─ views/ layouts/ stores/ router/ i18n/
│     └─ __tests__/
├─ deploy/               nginx, PM2, crontab, script de deploy
└─ docs/                 arquitetura, deploy, prints
```

## 📄 Licença

[MIT](LICENSE)
