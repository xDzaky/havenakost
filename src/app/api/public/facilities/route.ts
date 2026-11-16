import { apiRoute } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { listFacilityCatalog } from "@/lib/services/kost.service";

export const GET = apiRoute(async () => {
  const facilities = await listFacilityCatalog();
  return jsonSuccess(facilities);
});
