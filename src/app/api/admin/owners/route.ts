import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminOwnerQuerySchema } from "@/lib/validators/admin.schema";
import { listAdminOwners } from "@/lib/services/admin.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminOwnerQuerySchema);
  const result = await listAdminOwners(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
