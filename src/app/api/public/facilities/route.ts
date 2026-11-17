import { apiRoute, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { listFacilityCatalog } from "@/lib/services/kost.service";

export const GET = apiRoute(async (request) => {
  await enforceRateLimit({
    scope: "public-facilities",
    identifier: getClientIp(request),
    limit: 60,
    windowSeconds: 60,
  });
  const facilities = await listFacilityCatalog();
  return jsonSuccess(facilities);
});
