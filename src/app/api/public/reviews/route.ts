import { apiRoute, parseJson, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { reviewSubmitSchema } from "@/lib/validators/review.schema";
import { submitPublicReview } from "@/lib/services/review.service";

export const POST = apiRoute(async (request) => {
  const input = await parseJson(request, reviewSubmitSchema);
  const result = await submitPublicReview(input, {
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  return jsonSuccess(result, {
    status: 201,
    message: result.message,
  });
});
