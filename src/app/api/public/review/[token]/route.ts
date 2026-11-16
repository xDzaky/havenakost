import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { getPublicReviewFormByToken } from "@/lib/services/kost.service";

type Params = { token: string };

export const GET = apiRoute<Params>(async (_request, context) => {
  const { token } = await context.params;
  const data = await getPublicReviewFormByToken(token);
  return jsonSuccess(data);
});
