import { apiRoute, parseJson, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewReportSchema } from "@/lib/validators/review.schema";
import { reportPublicReview } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const POST = apiRoute<Params>(async (request, context) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const body = await parseJson(request, reviewReportSchema);
  const result = await reportPublicReview(reviewId, body.reason, {
    ip: getClientIp(request),
  });
  return jsonSuccess(result);
});
