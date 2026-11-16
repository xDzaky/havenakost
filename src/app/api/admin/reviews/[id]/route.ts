import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { getAdminReviewDetail } from "@/lib/services/review.service";

type Params = { id: string };

export const GET = adminRoute<Params>(async (_request, context) => {
  const id = uuidSchema.parse((await context.params).id);
  const review = await getAdminReviewDetail(id);
  return jsonSuccess(review);
});
