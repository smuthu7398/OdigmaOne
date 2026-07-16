# Odigma One

Client task manager for agencies — clients, projects, tasks, daily work
logs, files and reports in one place, for both the team and clients.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 ·
MySQL 8 · Better Auth · Expo (mobile, Phase 1+) · pnpm workspaces

## Layout

```
web/      Next.js app (UI + /api/v1 REST handlers)
mobile/   Expo app (scaffolded after Phase 1)
shared/   @odigma/shared — Zod schemas & types used by web and mobile
prisma/   schema.prisma, migrations, seed.ts
docs/     project guide, UI design guide, API conventions
```

## Getting started

```bash
pnpm install
cp .env.example .env        # fill in DB credentials + secrets
pnpm db:migrate             # create/update tables
pnpm db:seed                # default roles, permissions, super admin
pnpm dev                    # http://localhost:3000
```

## Key docs

- `docs/Odigma_One_Project_Guide_MySQL.md` — scope, modules, phases
- `docs/UI_Design_Guide.md` — design tokens & UI rules (mandatory)
- `docs/API_Conventions.md` — response envelope, errors, pagination
