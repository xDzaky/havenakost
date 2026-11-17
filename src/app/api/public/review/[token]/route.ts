import { apiRoute, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getPublicReviewFormByToken } from "@/lib/services/kost.service";

type Params = { token: string };

export const GET = apiRoute<Params>(async (request, context) => {
  await enforceRateLimit({
    scope: "public-review-token",
    identifier: getClientIp(request),
    limit: 60,
    windowSeconds: 60,
  });
  const { token } = await context.params;
  const data = await getPublicReviewFormByToken(token);
  return jsonSuccess(data);
});
