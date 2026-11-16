import { ownerRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { ownerReviewQuerySchema } from "@/lib/validators/review.schema";
import { listOwnerReviews } from "@/lib/services/review.service";

export const GET = ownerRoute(async (request, _context, session) => {
  const query = parseQuery(request, ownerReviewQuerySchema);
  const result = await listOwnerReviews(session.user.id, query);
  return jsonSuccess(result.items, { meta: result.meta });
});
