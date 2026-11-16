import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminSubscriptionQuerySchema } from "@/lib/validators/subscription.schema";
import { listAdminPayments } from "@/lib/services/subscription.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminSubscriptionQuerySchema);
  const result = await listAdminPayments(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
