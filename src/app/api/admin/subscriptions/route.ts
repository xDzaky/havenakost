import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { paginationSchema } from "@/lib/utils/pagination";
import { listAdminSubscriptions } from "@/lib/services/subscription.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, paginationSchema);
  const result = await listAdminSubscriptions(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
