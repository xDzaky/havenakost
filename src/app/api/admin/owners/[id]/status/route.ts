import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminOwnerStatusSchema } from "@/lib/validators/admin.schema";
import { setOwnerStatus } from "@/lib/services/admin.service";
import { z } from "zod";

type Params = { id: string };

export const PATCH = adminRoute<Params>(async (request, context, admin) => {
  const id = z.string().min(1).max(100).parse((await context.params).id);
  const input = await parseJson(request, adminOwnerStatusSchema);
  const profile = await setOwnerStatus(
    admin.id,
    id,
    input.status,
    input.reason,
  );
  return jsonSuccess(profile, {
    message: `Status pemilik diubah menjadi ${input.status}`,
  });
});
