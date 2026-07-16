# Odigma One

Client task manager — Next.js 15 (web) + Expo (mobile) + Prisma + MySQL 8 + Better Auth, pnpm monorepo.

- Project spec: `docs/Odigma_One_Project_Guide_MySQL.md`
- **UI: every screen/template/component MUST follow `docs/UI_Design_Guide.md`.**
  Light (white) theme default, dark toggle. Primary orange `#f26222`, warm-biased
  neutrals, pill buttons, 12px card radius, colored status/priority chips, Inter,
  skeleton loaders, designed empty states. Never introduce ad-hoc colors or styles —
  use the design tokens.
- Database: use the dedicated `odigma` MySQL user / `odigma_one` DB only. The local
  MySQL server hosts other production databases — never touch them.
- RBAC: check permissions (`task:update`), never role names.
