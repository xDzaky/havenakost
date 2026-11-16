import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { planUpdateSchema } from "@/lib/validators/subscription.schema";
import {
  deletePlan,
  updatePlan,
} from "@/lib/services/subscription.service";

type Params = { id: string };

export const PATCH = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, planUpdateSchema);
  const plan = await updatePlan(admin.id, id, input);
  return jsonSuccess(plan, { message: "Paket berhasil diperbarui" });
});

export const DELETE = adminRoute<Params>(async (_request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const result = await deletePlan(admin.id, id);
  return jsonSuccess(result, {
    message: result.deactivated
      ? "Paket dinonaktifkan karena sudah pernah dipakai"
      : "Paket berhasil dihapus",
  });
});
