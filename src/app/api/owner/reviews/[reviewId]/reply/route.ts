import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewReplySchema } from "@/lib/validators/review.schema";
import { replyOwnerReview } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const POST = ownerRoute<Params>(async (request, context, session) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const body = await parseJson(request, reviewReplySchema);
  const result = await replyOwnerReview(session.user.id, reviewId, body.reply);
  return jsonSuccess(result, { message: "Balasan berhasil disimpan." });
});
