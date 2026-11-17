import { apiRoute, parseQuery, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getPublicReviews } from "@/lib/services/kost.service";
import { publicReviewQuerySchema } from "@/lib/validators/review.schema";

type Params = { slug: string };

export const GET = apiRoute<Params>(async (request, context) => {
  await enforceRateLimit({
    scope: "public-kost-reviews",
    identifier: getClientIp(request),
    limit: 300,
    windowSeconds: 60,
  });
  const { slug } = await context.params;
  const query = parseQuery(request, publicReviewQuerySchema);
  const result = await getPublicReviews(slug, {
    page: query.page,
    limit: query.limit,
    roomId: query.room_id,
  });
  return jsonSuccess(result.items, { meta: result.meta });
});
