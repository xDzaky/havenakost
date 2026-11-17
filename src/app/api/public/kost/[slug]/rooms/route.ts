import { apiRoute, getClientIp } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getPublicRooms } from "@/lib/services/kost.service";

type Params = { slug: string };

export const GET = apiRoute<Params>(async (request, context) => {
  await enforceRateLimit({
    scope: "public-kost-rooms",
    identifier: getClientIp(request),
    limit: 300,
    windowSeconds: 60,
  });
  const { slug } = await context.params;
  const rooms = await getPublicRooms(slug);
  return jsonSuccess(rooms);
});
