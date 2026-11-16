import { apiRoute, parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { getPublicReviews } from "@/lib/services/kost.service";
import { publicReviewQuerySchema } from "@/lib/validators/review.schema";

type Params = { slug: string };

export const GET = apiRoute<Params>(async (request, context) => {
  const { slug } = await context.params;
  const query = parseQuery(request, publicReviewQuerySchema);
  const result = await getPublicReviews(slug, {
    page: query.page,
    limit: query.limit,
    roomId: query.room_id,
  });
  return jsonSuccess(result.items, { meta: result.meta });
});
