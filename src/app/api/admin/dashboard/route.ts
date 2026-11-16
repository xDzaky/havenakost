import { adminRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { adminDashboardQuerySchema } from "@/lib/validators/admin.schema";
import { getAdminDashboard } from "@/lib/services/admin.service";

export const GET = adminRoute(async (request) => {
  const query = parseQuery(request, adminDashboardQuerySchema);
  const dashboard = await getAdminDashboard(query.days);
  return jsonSuccess(dashboard);
});
