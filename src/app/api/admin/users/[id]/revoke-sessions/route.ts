import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { revokeUserSessions } from "@/lib/services/admin.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, user) => {
  const userId = uuidSchema.parse((await context.params).id);
  const result = await revokeUserSessions(user.id, userId);
  return jsonSuccess(result, {
    message: `${result.revokedCount} sesi pengguna berhasil dicabut.`,
  });
});
