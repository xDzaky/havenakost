import {
  apiRoute,
  parseQuery,
  getClientIp,
} from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { nearbyQuerySchema } from "@/lib/validators/kost.schema";
import { searchPublicKost } from "@/lib/services/kost.service";
import { AppError } from "@/lib/utils/api-error";

export const GET = apiRoute(async (request) => {
  await enforceRateLimit({
    scope: "public-nearby-search",
    identifier: getClientIp(request),
    limit: 120,
    windowSeconds: 60,
  });
  const query = parseQuery(request, nearbyQuerySchema);
  if (query.latitude === undefined || query.longitude === undefined) {
    throw new AppError(
      "Parameter latitude dan longitude wajib dikirim",
      422,
    );
  }
  const result = await searchPublicKost({ ...query, sort: "distance" });
  return jsonSuccess(result.items, {
    meta: {
      ...result.meta,
      radius_meters: query.radius ?? 5_000,
      center: { latitude: query.latitude, longitude: query.longitude },
    },
  });
});
