import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminReviewQuerySchema } from "@/lib/validators/review.schema";
import { listAdminReviews } from "@/lib/services/review.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminReviewQuerySchema);
  const result = await listAdminReviews(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
