import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh expiry daily
  },
  user: {
    additionalFields: {
      roleId: { type: "string", required: false, input: false },
      clientId: { type: "string", required: false, input: false },
      isActive: { type: "boolean", required: false, input: false },
      timezone: { type: "string", required: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
