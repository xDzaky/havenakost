import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ownerProfiles } from "@/lib/db/schema";
import { auth } from "./auth";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/utils/api-error";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: "owner" | "admin";
  createdAt: Date;
  updatedAt: Date;
};

export type OwnerProfile = typeof ownerProfiles.$inferSelect;

export async function getCurrentUser(
  request: Request,
): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return session.user as unknown as AuthUser;
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (user.role !== "admin") throw new ForbiddenError("Akses khusus admin");
  return user;
}

export async function ensureOwnerProfile(user: AuthUser): Promise<OwnerProfile> {
  const existing = await db
    .select()
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, user.id))
    .limit(1);

  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(ownerProfiles)
    .values({
      userId: user.id,
      fullName: user.name || user.email,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) return inserted[0];

  const retry = await db
    .select()
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, user.id))
    .limit(1);

  if (!retry[0]) {
    throw new NotFoundError("Profil pemilik tidak ditemukan");
  }
  return retry[0];
}

export async function requireOwner(request: Request): Promise<{
  user: AuthUser;
  profile: OwnerProfile;
}> {
  const user = await requireAuth(request);
  if (user.role !== "owner") {
    throw new ForbiddenError("Endpoint ini hanya untuk pemilik kost");
  }
  const profile = await ensureOwnerProfile(user);
  if (profile.approvalStatus === "suspended") {
    throw new ForbiddenError(
      "Akun pemilik sedang ditangguhkan. Hubungi admin untuk informasi lebih lanjut.",
    );
  }
  return { user, profile };
}
