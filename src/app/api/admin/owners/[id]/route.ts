import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { getAdminOwnerDetail } from "@/lib/services/admin.service";
import { z } from "zod";

type Params = { id: string };

export const GET = adminRoute<Params>(async (_request, context) => {
  const id = z.string().min(1).max(100).parse((await context.params).id);
  const owner = await getAdminOwnerDetail(id);
  return jsonSuccess(owner);
});
