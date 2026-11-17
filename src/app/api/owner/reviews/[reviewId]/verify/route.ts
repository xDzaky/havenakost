import { ownerRoute } from "@/lib/auth/guards";
import { parseOptionalJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewVerifySchema } from "@/lib/validators/review.schema";
import { verifyOwnerReview } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const body = await parseOptionalJson(request, reviewVerifySchema);
  const review = await verifyOwnerReview(
    session.user.id,
    reviewId,
    body?.occupancy_id,
    body?.override_reason,
  );
  return jsonSuccess(review, {
    message:
      "Review diverifikasi dan dipublikasikan. Isi review tidak diubah.",
  });
});
