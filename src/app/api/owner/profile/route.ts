import { ownerRoute } from "@/lib/auth/guards";
import { apiRoute, parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { ownerProfileUpdateSchema } from "@/lib/validators/auth.schema";
import { updateOwnerProfile } from "@/lib/services/owner.service";
import { ensureOwnerProfile, requireAuth } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/utils/api-error";

/**
 * A suspended owner must still be able to read the status/reason, so this
 * endpoint intentionally does not use the suspended-blocking ownerRoute.
 */
export const GET = apiRoute(async (request) => {
  const user = await requireAuth(request);
  if (user.role !== "owner") {
    throw new ForbiddenError("Endpoint ini hanya untuk pemilik kost");
  }
  const profile = await ensureOwnerProfile(user);

  return jsonSuccess({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    profile,
  });
});

export const PATCH = ownerRoute(async (request, _context, session) => {
  const input = await parseJson(request, ownerProfileUpdateSchema);
  const profile = await updateOwnerProfile(session.user, input);
  return jsonSuccess(profile, { message: "Profil berhasil diperbarui" });
});
