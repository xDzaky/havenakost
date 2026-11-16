import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { financeUpdateSchema } from "@/lib/validators/finance.schema";
import {
  deleteFinancialRecord,
  getFinancialRecord,
  updateFinancialRecord,
} from "@/lib/services/finance.service";

type Params = { id: string };

export const GET = ownerRoute<Params>(async (_request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const record = await getFinancialRecord(session.user.id, id);
  return jsonSuccess(record);
});

export const PATCH = ownerRoute<Params>(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, financeUpdateSchema);
  const record = await updateFinancialRecord(session.user.id, id, input);
  return jsonSuccess(record, {
    message: "Catatan keuangan berhasil diperbarui",
  });
});

export const DELETE = ownerRoute<Params>(
  async (_request, context, session) => {
    const id = uuidSchema.parse((await context.params).id);
    await deleteFinancialRecord(session.user.id, id);
    return jsonSuccess(
      { id },
      { message: "Catatan keuangan berhasil dihapus" },
    );
  },
);
