import { ownerRoute } from "@/lib/auth/guards";
import { parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { financeSummaryQuerySchema } from "@/lib/validators/finance.schema";
import { getFinanceSummary } from "@/lib/services/finance.service";

export const GET = ownerRoute(async (request, _context, session) => {
  const query = parseQuery(request, financeSummaryQuerySchema);
  const summary = await getFinanceSummary(session.user.id, query);
  return jsonSuccess(summary);
});
