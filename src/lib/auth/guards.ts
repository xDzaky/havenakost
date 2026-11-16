import type { NextRequest } from "next/server";
import type { ZodType } from "zod";
import {
  requireAdmin,
  requireOwner,
  type AuthUser,
  type OwnerProfile,
} from "./session";
import { apiRoute, type RouteContext } from "@/lib/utils/route";

export type OwnerSession = { user: AuthUser; profile: OwnerProfile };

export function ownerRoute<TParams = Record<string, never>>(
  handler: (
    request: NextRequest,
    context: RouteContext<TParams>,
    session: OwnerSession,
  ) => Promise<Response>,
) {
  return apiRoute<TParams>(async (request, context) => {
    const session = await requireOwner(request);
    return handler(request, context, session);
  });
}

export function adminRoute<TParams = Record<string, never>>(
  handler: (
    request: NextRequest,
    context: RouteContext<TParams>,
    user: AuthUser,
  ) => Promise<Response>,
) {
  return apiRoute<TParams>(async (request, context) => {
    const user = await requireAdmin(request);
    return handler(request, context, user);
  });
}

export async function parseParams<T>(
  context: RouteContext<unknown>,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await context.params);
}
