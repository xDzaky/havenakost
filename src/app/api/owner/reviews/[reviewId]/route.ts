import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { getOwnerReviewDetail } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const GET = ownerRoute<Params>(async (_request, context, session) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const review = await getOwnerReviewDetail(session.user.id, reviewId);
  return jsonSuccess(review);
});
