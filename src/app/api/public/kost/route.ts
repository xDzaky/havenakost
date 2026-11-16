import {
  parseQuery,
  apiRoute,
  getClientIp,
} from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { publicKostQuerySchema } from "@/lib/validators/kost.schema";
import { searchPublicKost } from "@/lib/services/kost.service";

export const GET = apiRoute(async (request) => {
  await enforceRateLimit({
    scope: "public-kost-search",
    identifier: getClientIp(request),
    limit: 120,
    windowSeconds: 60,
  });
  const query = parseQuery(request, publicKostQuerySchema);
  const result = await searchPublicKost(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
