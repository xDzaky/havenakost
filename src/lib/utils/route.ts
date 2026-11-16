import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import { handleApiError } from "./api-response";
import { AppError } from "./api-error";

export type RouteContext<TParams> = { params: Promise<TParams> };

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
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
