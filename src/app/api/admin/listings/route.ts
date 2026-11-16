import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminListingQuerySchema } from "@/lib/validators/kost.schema";
import { listAdminListings } from "@/lib/services/admin.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminListingQuerySchema);
  const result = await listAdminListings(query);
  return jsonSuccess(result.items, { meta: result.meta });
});
