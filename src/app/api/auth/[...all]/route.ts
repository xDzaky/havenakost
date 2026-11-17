import { createHmac } from "node:crypto";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/env";
import {
  checkRateLimit,
  enforceRateLimit,
  resetRateLimit,
} from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/api-response";
import { getClientIp } from "@/lib/utils/route";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

function computeHmac(data: string): string {
  const secret = env.BETTER_AUTH_SECRET || "fallback-rate-limit-secret";
  return createHmac("sha256", secret).update(data).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    if (path.endsWith("/sign-in/email")) {
      const clientIp = getClientIp(request);
      const body = await request.clone().json().catch(() => ({}));
      const email =
        typeof body.email === "string" ? body.email.toLowerCase().trim() : null;

      let ipEmailKey: string | null = null;
      let emailKey: string | null = null;

      if (email) {
        ipEmailKey = computeHmac(`${email}:${clientIp}`);
        emailKey = computeHmac(email);

        // 1. Per (IP + email) failed attempts limiter: max 8 failures per 15 minutes
        await checkRateLimit({
          scope: "auth-signin-failed-ip-email",
          identifier: ipEmailKey,
          limit: 8,
        });

        // 2. Global per-email limiter (botnet / distributed attack protection): max 30 failures per hour
        await checkRateLimit({
          scope: "auth-signin-failed-email",
          identifier: emailKey,
          limit: 30,
        });
      }

      const response = await handler.POST(request);

      if (ipEmailKey && emailKey) {
        if (!response.ok) {
          // Count ONLY failed attempts
          await enforceRateLimit({
            scope: "auth-signin-failed-ip-email",
            identifier: ipEmailKey,
            limit: 8,
            windowSeconds: 15 * 60,
          }).catch(() => undefined);

          await enforceRateLimit({
            scope: "auth-signin-failed-email",
            identifier: emailKey,
            limit: 30,
            windowSeconds: 3600,
          }).catch(() => undefined);
        } else {
          // Reset failed attempts on successful login
          await resetRateLimit(
            "auth-signin-failed-ip-email",
            ipEmailKey,
          );
        }
      }

      return response;
    } else if (path.endsWith("/sign-up/email")) {
      await enforceRateLimit({
        scope: "auth-signup",
        identifier: getClientIp(request),
        limit: 5,
        windowSeconds: 3600,
      });
    }
    return await handler.POST(request);
  } catch (error) {
    return handleApiError(error);
  }
}
