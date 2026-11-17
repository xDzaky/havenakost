import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env, isProduction } from "@/lib/env";
import { sendEmail } from "@/lib/services/email.service";

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
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: true,
    async sendResetPassword(data) {
      await sendEmail({
        to: data.user.email,
        subject: "Reset Kata Sandi - Havena Kost",
        html: `<p>Halo ${data.user.name},</p><p>Anda meminta pengaturan ulang kata sandi. Silakan klik tautan di bawah ini:</p><p><a href="${data.url}">${data.url}</a></p><p>Abaikan email ini jika Anda tidak meminta reset kata sandi.</p>`,
      });
    },
    async sendVerificationEmail(data) {
      await sendEmail({
        to: data.user.email,
        subject: "Verifikasi Alamat Email - Havena Kost",
        html: `<p>Halo ${data.user.name},</p><p>Terima kasih telah mendaftar di Havena Kost. Silakan klik tautan di bawah ini untuk memverifikasi email Anda:</p><p><a href="${data.url}">${data.url}</a></p>`,
      });
    },
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
    storage: "database",
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
