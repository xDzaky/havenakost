import { adminRoute } from "@/lib/auth/guards";
import { parseQuery, parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import {
  adminSubscriptionPlanQuerySchema,
  planCreateSchema,
} from "@/lib/validators/subscription.schema";
import {
  createPlan,
  listAdminPlans,
} from "@/lib/services/subscription.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminSubscriptionPlanQuerySchema);
  const result = await listAdminPlans(query);
  return jsonSuccess(result.items, { meta: result.meta });
});

export const POST = adminRoute(async (request, _context, admin) => {
  const input = await parseJson(request, planCreateSchema);
  const plan = await createPlan(admin.id, input);
  return jsonSuccess(plan, {
    status: 201,
    message: "Paket langganan berhasil dibuat",
  });
});
