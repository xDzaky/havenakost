import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminLogQuerySchema } from "@/lib/validators/admin.schema";
import { listAdminLogs } from "@/lib/services/admin.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminLogQuerySchema);
  const result = await listAdminLogs(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
