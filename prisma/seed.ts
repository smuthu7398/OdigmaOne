// Seed: permissions, default roles, and the first Super Admin.
// Idempotent — safe to run repeatedly. Run via: pnpm db:seed (from repo root)

try {
  process.loadEnvFile(".env");
} catch {
  /* env already provided by the caller */
}

import { PrismaClient } from "../web/src/generated/prisma";
import { auth } from "../web/src/lib/auth";

const prisma = new PrismaClient();

// group -> actions
const PERMISSIONS: Record<string, string[]> = {
  user: ["create", "read", "update", "delete"],
  role: ["create", "read", "update", "delete"],
  client: ["create", "read", "update", "delete"],
  project: ["create", "read", "update", "delete"],
  task: ["create", "read", "update", "delete", "assign"],
  worklog: ["create", "read", "update", "delete"],
  comment: ["create", "read", "update", "delete"],
  file: ["upload", "read", "delete"],
  report: ["read"],
  notification: ["read"],
  activity: ["read"],
  feedback: ["create", "read"],
  settings: ["manage"],
};

const key = (group: string, action: string) => `${group}:${action}`;
const all = Object.entries(PERMISSIONS).flatMap(([g, actions]) =>
  actions.map((a) => key(g, a))
);

// role -> permission keys ("*" = everything). Fully editable later in the UI.
const ROLES: Record<string, { description: string; perms: string[] }> = {
  "Super Admin": { description: "Full access to everything", perms: ["*"] },
  Admin: {
    description: "Full access except role management",
    perms: all.filter((p) => !p.startsWith("role:")),
  },
  Manager: {
    description: "Manages clients, projects, tasks and reports",
    perms: [
      "user:read",
      "client:create", "client:read", "client:update",
      "project:create", "project:read", "project:update",
      "task:create", "task:read", "task:update", "task:assign",
      "worklog:create", "worklog:read", "worklog:update",
      "comment:create", "comment:read", "comment:update",
      "file:upload", "file:read",
      "report:read", "notification:read", "activity:read", "feedback:read",
    ],
  },
  "Team Lead": {
    description: "Assigns and reviews the team's tasks",
    perms: [
      "user:read", "client:read", "project:read",
      "task:create", "task:read", "task:update", "task:assign",
      "worklog:create", "worklog:read",
      "comment:create", "comment:read", "comment:update",
      "file:upload", "file:read",
      "report:read", "notification:read", "activity:read",
    ],
  },
  Developer: {
    description: "Works on assigned tasks and logs daily work",
    perms: [
      "client:read", "project:read",
      "task:read", "task:update",
      "worklog:create", "worklog:read",
      "comment:create", "comment:read",
      "file:upload", "file:read",
      "notification:read",
    ],
  },
  QA: {
    description: "Tests work and raises bugs",
    perms: [
      "client:read", "project:read",
      "task:create", "task:read", "task:update",
      "worklog:create", "worklog:read",
      "comment:create", "comment:read",
      "file:upload", "file:read",
      "notification:read",
    ],
  },
  Client: {
    description: "Client portal — sees only their own data (row-scoped in the API)",
    perms: [
      "task:read", "project:read",
      "comment:create", "comment:read",
      "file:upload", "file:read",
      "report:read", "notification:read",
      "feedback:create", "feedback:read",
    ],
  },
};

async function main() {
  // 1. permissions
  for (const [group, actions] of Object.entries(PERMISSIONS)) {
    for (const action of actions) {
      const k = key(group, action);
      await prisma.permission.upsert({
        where: { key: k },
        update: { group },
        create: { key: k, group, description: `${action} ${group}` },
      });
    }
  }
  console.log(`✓ ${all.length} permissions`);

  // 2. roles + role-permission links
  const perms = await prisma.permission.findMany();
  const byKey = new Map(perms.map((p) => [p.key, p.id]));

  for (const [name, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: def.description, isSystem: true },
      create: { name, description: def.description, isSystem: true },
    });
    const wanted = def.perms.includes("*") ? all : def.perms;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: wanted.map((k) => ({ roleId: role.id, permissionId: byKey.get(k)! })),
    });
  }
  console.log(`✓ ${Object.keys(ROLES).length} roles`);

  // 3. first Super Admin (via Better Auth so the password hash is correct)
  const email = process.env.SEED_ADMIN_EMAIL!;
  const password = process.env.SEED_ADMIN_PASSWORD!;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    await auth.api.signUpEmail({
      body: { name: "Muthu S", email, password },
    });
    console.log(`✓ super admin created: ${email}`);
  } else {
    console.log(`✓ super admin already exists: ${email}`);
  }

  const superAdmin = await prisma.role.findUnique({ where: { name: "Super Admin" } });
  await prisma.user.update({
    where: { email },
    data: { roleId: superAdmin!.id, emailVerified: true, isActive: true },
  });
  console.log("✓ super admin role linked");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
