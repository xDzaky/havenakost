import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env, isProduction } from "@/lib/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "owner",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 40,
    storage: "memory",
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
    },
  },
  trustedOrigins: Array.from(
    new Set([
      env.APP_BASE_URL,
      env.BETTER_AUTH_URL,
      ...(isProduction
        ? []
        : ["http://localhost:3000", "http://127.0.0.1:3000"]),
    ]),
  ),
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          if (createdUser.role !== "owner") return;
          await db
            .insert(schema.ownerProfiles)
            .values({
              userId: createdUser.id,
              fullName: createdUser.name || createdUser.email,
            })
            .onConflictDoNothing();
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
