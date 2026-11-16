import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/api-response";
import { getClientIp } from "@/lib/utils/route";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    if (path.endsWith("/sign-in/email")) {
      await enforceRateLimit({
        scope: "auth-signin",
        identifier: getClientIp(request),
        limit: 10,
        windowSeconds: 300,
      });
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
