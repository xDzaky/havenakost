import { ownerRoute } from "@/lib/auth/guards";
import { jsonSuccess } from "@/lib/utils/api-response";
import { uuidSchema } from "@/lib/validators/common.schema";
import { regenerateRoomQr } from "@/lib/services/room.service";

type Params = { roomId: string };

export const POST = ownerRoute<Params>(async (_request, context, session) => {
  const roomId = uuidSchema.parse((await context.params).roomId);
  const qr = await regenerateRoomQr(session.user.id, roomId);
  return jsonSuccess(qr, {
    status: 201,
    message: "QR Code baru dibuat. QR lama tidak berlaku lagi.",
  });
});
