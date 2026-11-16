import { adminRoute } from "@/lib/auth/guards";
import { parseOptionalJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewVerifySchema } from "@/lib/validators/review.schema";
import { verifyReviewAsAdmin } from "@/lib/services/review.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const body = await parseOptionalJson(request, reviewVerifySchema);
  const review = await verifyReviewAsAdmin(admin.id, id, {
    occupancyId: body?.occupancy_id,
  });
  return jsonSuccess(review, {
    message: "Review diverifikasi dan dipublikasikan oleh admin",
  });
});
