import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { getOwnerSubscription } from "@/lib/services/subscription.service";

export const GET = ownerRoute(async (_request, _context, session) => {
  const result = await getOwnerSubscription(session.user.id);
  return jsonSuccess(result);
});
