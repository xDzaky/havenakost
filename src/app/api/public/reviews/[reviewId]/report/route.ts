import { apiRoute, parseJson, getClientIp } from "@/lib/utils/route";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewReportSchema } from "@/lib/validators/review.schema";
import { reportPublicReview } from "@/lib/services/review.service";

type Params = { reviewId: string };

export const POST = apiRoute<Params>(async (request, context) => {
  const reviewId = uuidSchema.parse((await context.params).reviewId);
  const body = await parseJson(request, reviewReportSchema);
  const result = await reportPublicReview(reviewId, body.reason, {
    ip: getClientIp(request),
    turnstileToken: body.turnstile_token,
  });
  return new Response(
    JSON.stringify({ success: true, ...result }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    },
  );
});
