import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ownerProfiles } from "@/lib/db/schema";
import type { OwnerProfileUpdateInput } from "@/lib/validators/auth.schema";
import { ForbiddenError, NotFoundError } from "@/lib/utils/api-error";
import type { AuthUser } from "@/lib/auth/session";

export async function getOwnerProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, userId))
    .limit(1);
  if (!profile) throw new NotFoundError("Profil pemilik tidak ditemukan");
  return profile;
}

export async function updateOwnerProfile(
  user: AuthUser,
  input: OwnerProfileUpdateInput,
) {
  const values: Partial<typeof ownerProfiles.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.full_name !== undefined) values.fullName = input.full_name;
  if (input.business_name !== undefined) {
    values.businessName = input.business_name;
  }
  if (input.phone !== undefined) values.phone = input.phone;
  if (input.address !== undefined) values.address = input.address;
  if (input.profile_photo !== undefined) {
    values.profilePhoto = input.profile_photo;
  }

  const [updated] = await db
    .update(ownerProfiles)
    .set(values)
    .where(eq(ownerProfiles.userId, user.id))
    .returning();

  if (!updated) throw new NotFoundError("Profil pemilik tidak ditemukan");
  return updated;
}

export async function assertOwnerCanPublish(ownerId: string): Promise<void> {
  const [profile] = await db
    .select({ approvalStatus: ownerProfiles.approvalStatus })
    .from(ownerProfiles)
    .where(eq(ownerProfiles.userId, ownerId))
    .limit(1);

  if (!profile) {
    throw new ForbiddenError("Profil pemilik belum lengkap");
  }
  if (profile.approvalStatus !== "approved") {
    throw new ForbiddenError(
      "Akun pemilik belum disetujui admin. Listing tidak dapat diajukan untuk publikasi.",
    );
  }
}
