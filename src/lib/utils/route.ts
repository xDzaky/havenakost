import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { handleApiError } from "./api-response";
import { AppError } from "./api-error";
import { env, isProduction } from "@/lib/env";

export type RouteContext<TParams> = { params: Promise<TParams> };

export function verifyCsrfOrigin(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      const allowedOrigins = [
        request.nextUrl.origin,
        env.APP_BASE_URL?.replace(/\/+$/, ""),
        env.BETTER_AUTH_URL?.replace(/\/+$/, ""),
        ...(isProduction
          ? []
          : ["http://localhost:3000", "http://127.0.0.1:3000"]),
      ].filter(Boolean);
      if (!allowedOrigins.includes(origin)) {
        throw new AppError("Origin request tidak diizinkan (CSRF)", 403);
      }
    }
  }
}

/**
 * Wraps a route handler with centralized, sanitized error handling.
 * No stack trace, SQL, or credential ever reaches the client.
 */
export function apiRoute<TParams = Record<string, never>>(
  handler: (
    request: NextRequest,
    context: RouteContext<TParams>,
  ) => Promise<Response>,
) {
  return async (
    request: NextRequest,
    context: RouteContext<TParams> = {
      params: Promise.resolve({} as TParams),
    },
  ) => {
    try {
      verifyCsrfOrigin(request);
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export async function parseJson<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    throw new AppError("Content-Type harus application/json", 415);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("Body request harus berupa JSON yang valid", 400);
  }
  return schema.parse(body);
}

export async function parseOptionalJson<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T | undefined> {
  const text = await request.text();
  if (!text.trim()) return undefined;
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    throw new AppError("Content-Type harus application/json", 415);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppError("Body request harus berupa JSON yang valid", 400);
  }
  return schema.parse(body);
}

export function parseQuery<T>(
  request: NextRequest,
  schema: ZodType<T>,
): T {
  const params: Record<string, string | string[]> = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    const values = request.nextUrl.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }
  return schema.parse(params);
}

export function getClientIp(request: NextRequest): string {
  const isVercel = Boolean(process.env.VERCEL);
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    return vercelForwarded.split(",")[0]?.trim() || "unknown";
  }
  if (isVercel) {
    return "unknown";
  }

  const cfConnecting = request.headers.get("cf-connecting-ip");
  if (cfConnecting) {
    return cfConnecting.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}
