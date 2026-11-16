import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewModerationSchema } from "@/lib/validators/review.schema";
import { rejectReviewAsAdmin } from "@/lib/services/review.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, reviewModerationSchema);
  const review = await rejectReviewAsAdmin(admin.id, id, input.reason);
  return jsonSuccess(review, { message: "Review ditolak oleh admin" });
});
