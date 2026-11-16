import { adminRoute } from "@/lib/auth/guards";
import { parseOptionalJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewPublishSchema } from "@/lib/validators/review.schema";
import { publishReview } from "@/lib/services/review.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const body = await parseOptionalJson(request, reviewPublishSchema);
  const review = await publishReview(admin.id, id, body?.reason);
  return jsonSuccess(review, {
    message: "Review dipublikasikan oleh admin",
  });
});
