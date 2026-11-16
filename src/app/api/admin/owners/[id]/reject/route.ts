import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminOwnerRejectSchema } from "@/lib/validators/admin.schema";
import { rejectOwner } from "@/lib/services/admin.service";
import { z } from "zod";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = z.string().min(1).max(100).parse((await context.params).id);
  const input = await parseJson(request, adminOwnerRejectSchema);
  const profile = await rejectOwner(admin.id, id, input.reason);
  return jsonSuccess(profile, {
    message: "Pemilik ditolak dengan alasan yang tercatat",
  });
});
