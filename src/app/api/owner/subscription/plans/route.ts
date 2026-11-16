import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { listPlans } from "@/lib/services/subscription.service";

export const GET = ownerRoute(async () => {
  const plans = await listPlans({ activeOnly: true });
  return jsonSuccess(plans);
});
