import { ownerRoute } from "@/lib/auth/guards";
import { parseJson, parseQuery } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import {
  financeCreateSchema,
  financeQuerySchema,
} from "@/lib/validators/finance.schema";
import {
  createFinancialRecord,
  listFinancialRecords,
} from "@/lib/services/finance.service";

export const GET = ownerRoute(async (request, _context, session) => {
  const query = parseQuery(request, financeQuerySchema);
  const result = await listFinancialRecords(session.user.id, query);
  return jsonSuccess(result.items, { meta: result.meta });
});

export const POST = ownerRoute(async (request, _context, session) => {
  const input = await parseJson(request, financeCreateSchema);
  const record = await createFinancialRecord(session.user.id, input);
  return jsonSuccess(record, {
    status: 201,
    message: "Catatan keuangan berhasil ditambahkan",
  });
});
