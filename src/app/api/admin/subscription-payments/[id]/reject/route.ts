import { adminRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { reviewModerationSchema } from "@/lib/validators/review.schema";
import { rejectPayment } from "@/lib/services/subscription.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const input = await parseJson(request, reviewModerationSchema);
  const payment = await rejectPayment(admin.id, id, input.reason);
  return jsonSuccess(payment, {
    message: "Pembayaran ditolak dengan alasan yang tercatat",
  });
});
