import { adminRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { approvePayment } from "@/lib/services/subscription.service";

type Params = { id: string };

export const POST = adminRoute<Params>(async (_request, context, admin) => {
  const id = uuidSchema.parse((await context.params).id);
  const result = await approvePayment(admin.id, id);
  return jsonSuccess(result, {
    message: "Pembayaran disetujui dan langganan diaktifkan",
  });
});
