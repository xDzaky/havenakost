import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewRejectSchema } from "@/lib/validators/review.schema";
import { rejectOwnerReview } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const input = await parseJson(request, reviewRejectSchema);
  const review = await rejectOwnerReview(
    session.user.id,
    reviewId,
    input.reason,
  );
  return jsonSuccess(review, {
    message: "Review ditolak dengan alasan yang tercatat",
  });
});
