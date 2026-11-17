import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { z } from "zod";
import { overrideOwnerRejectReview } from "@/lib/services/review.service";

type Params = { id: string };

const overrideRejectSchema = z.object({
  action: z.enum(["publish", "reject"]),
  reason: z.string().min(10).max(500).optional(),
});

export const POST = adminRoute<Params>(async (request, context, user) => {
  const reviewId = uuidSchema.parse((await context.params).id);
  const body = await parseJson(request, overrideRejectSchema);
  const result = await overrideOwnerRejectReview(
    user.id,
    reviewId,
    body.action,
    body.reason,
  );
  return jsonSuccess(result, {
    message: "Penolakan owner berhasil di-override oleh admin.",
  });
});
