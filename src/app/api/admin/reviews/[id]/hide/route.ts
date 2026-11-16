import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewModerationSchema } from "@/lib/validators/review.schema";
import { hideReview } from "@/lib/services/review.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, reviewModerationSchema);
  const review = await hideReview(admin.id, id, input.reason);
  return jsonSuccess(review, {
    message: "Review disembunyikan dari halaman publik",
  });
});
