import { ownerRoute } from "@/lib/auth/guards";
import { parseJson } from "@/lib/utils/route";
import { jsonSuccess } from "@/lib/utils/api-response";
import { subscriptionPaymentSchema } from "@/lib/validators/subscription.schema";
import { createSubscriptionPayment } from "@/lib/services/subscription.service";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const POST = ownerRoute(async (request, _context, session) => {
  await enforceRateLimit({
    scope: "owner-payment-submit",
    identifier: session.user.id,
    limit: 10,
    windowSeconds: 3600,
  });

  const input = await parseJson(request, subscriptionPaymentSchema);
  const payment = await createSubscriptionPayment(session.user.id, input);
  return jsonSuccess(payment, {
    status: 201,
    message:
      "Pengajuan pembayaran dikirim. Admin akan memverifikasi secara manual.",
  });
});
